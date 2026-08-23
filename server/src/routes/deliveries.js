const express = require("express");
const supabase = require("../config/supabase");
const router   = express.Router();

const BUSINESS_UPI_ID   = process.env.BUSINESS_UPI_ID   || "9359118747@ptsbi";
const BUSINESS_UPI_NAME = process.env.BUSINESS_UPI_NAME || "Yash Enterprises";

const ASSIGN_SELECT = `
  id, status, stage, cash_collected, delivery_notes, assigned_at, delivered_at, assigned_by,
  orders(
    id, total_amount, total_pieces, notes, status, created_at,
    customers(id, customer_name, contact_number, street_address, city, latitude, longitude),
    order_items(
      id, quantity_display, unit_display, pieces, price_per_piece, subtotal, status,
      products(id, product_name, product_images, weight, companies(company_name))
    )
  ),
  workers(id, worker_name, contact_number, role),
  delivery_routes(id, route_name)
`;

/* ── helpers ──────────────────────────────────────────────── */
async function updateOrderStatus(orderId, status) {
  await supabase.from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId);
}

async function fifoPayment(customerId, amount, workerId, paymentMode) {
  const { data: debits } = await supabase
    .from("credit_transactions")
    .select("id, remaining_amount")
    .eq("customer_id", customerId)
    .eq("type", "debit")
    .gt("remaining_amount", 0)
    .order("created_at", { ascending: true });

  let remaining = Number(amount);
  for (const d of debits || []) {
    if (remaining <= 0) break;
    const applied = Math.min(remaining, Number(d.remaining_amount));
    await supabase.from("credit_transactions")
      .update({ remaining_amount: Number(d.remaining_amount) - applied })
      .eq("id", d.id);
    remaining -= applied;
  }

  // If overpaid — remaining becomes a credit (negative pending)
  const { data: acct } = await supabase
    .from("finance_accounts").select("*").eq("customer_id", customerId).single();
  if (acct) {
    const newPending = Number(acct.pending_credit) - Number(amount); // can go negative = credit
    await supabase.from("finance_accounts").update({
      total_paid:     Number(acct.total_paid) + Number(amount),
      pending_credit: newPending,
      updated_at:     new Date().toISOString(),
    }).eq("customer_id", customerId);
  }

  await supabase.from("credit_transactions").insert([{
    customer_id:              customerId,
    type:                     "payment",
    amount:                   Number(amount),
    remaining_amount:         0,
    payment_mode:             paymentMode,
    collected_by:             workerId ? "worker" : "admin",
    collected_by_worker_id:   workerId || null,
    note: `Payment collected via ${paymentMode}`,
  }]);
}

/* ── GET /api/deliveries/upi-config ── returns biz UPI details */
router.get("/upi-config", (req, res) => {
  res.json({ success: true, data: { upi_id: BUSINESS_UPI_ID, upi_name: BUSINESS_UPI_NAME } });
});

/* ── GET /api/deliveries/unassigned ── orders with no active assignment */
router.get("/unassigned", async (req, res) => {
  try {
    const { data: assigned } = await supabase
      .from("delivery_assignments").select("order_id").neq("status", "failed");
    const ids = (assigned || []).map(a => a.order_id);

    let q = supabase.from("orders")
      .select(`id, total_amount, total_pieces, created_at, notes, status,
        customers(id, customer_name, contact_number, street_address, city)`)
      .eq("status", "placed")
      .order("created_at", { ascending: true });
    if (ids.length) q = q.not("id", "in", `(${ids.join(",")})`);

    const { data, error } = await q;
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ error: "Internal server error" }); }
});

/* ── GET /api/deliveries/packaged ── orders packed and ready for delivery assignment */
router.get("/packaged", async (req, res) => {
  try {
    // Orders that have a completed packaging assignment but no delivery assignment yet
    const { data: packaged } = await supabase
      .from("delivery_assignments")
      .select("order_id")
      .eq("stage", "packaging")
      .eq("status", "delivered"); // "delivered" = packed in packaging stage

    const packedOrderIds = (packaged || []).map(p => p.order_id);
    if (!packedOrderIds.length) return res.json({ success: true, data: [] });

    const { data: deliveryAssigned } = await supabase
      .from("delivery_assignments")
      .select("order_id")
      .eq("stage", "delivery")
      .neq("status", "failed");
    const deliveryIds = (deliveryAssigned || []).map(d => d.order_id);

    const readyIds = packedOrderIds.filter(id => !deliveryIds.includes(id));
    if (!readyIds.length) return res.json({ success: true, data: [] });

    const { data, error } = await supabase
      .from("orders")
      .select(`id, total_amount, total_pieces, created_at,
        customers(id, customer_name, contact_number, street_address, city)`)
      .in("id", readyIds);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ error: "Internal server error" }); }
});

/* ── GET /api/deliveries/worker/:workerId ── worker's assignments */
router.get("/worker/:workerId", async (req, res) => {
  try {
    const { stage, status } = req.query;
    let q = supabase.from("delivery_assignments")
      .select(ASSIGN_SELECT)
      .eq("worker_id", req.params.workerId)
      .order("assigned_at", { ascending: false });
    if (stage)  q = q.eq("stage",  stage);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ error: "Internal server error" }); }
});

/* ── GET /api/deliveries ── all assignments (admin) */
router.get("/", async (req, res) => {
  try {
    const { worker_id, status, stage } = req.query;
    let q = supabase.from("delivery_assignments")
      .select(ASSIGN_SELECT)
      .order("assigned_at", { ascending: false });
    if (worker_id) q = q.eq("worker_id", worker_id);
    if (status)    q = q.eq("status", status);
    if (stage)     q = q.eq("stage",  stage);
    const { data, error } = await q;
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ error: "Internal server error" }); }
});

/* ── POST /api/deliveries/assign ── admin assigns order(s) to worker */
router.post("/assign", async (req, res) => {
  try {
    const { order_ids, worker_id, stage, route_name } = req.body;
    if (!order_ids?.length || !worker_id)
      return res.status(400).json({ error: "order_ids and worker_id required" });

    // Create route record if multiple orders
    let route_id = null;
    if (order_ids.length > 1) {
      const { data: route } = await supabase.from("delivery_routes")
        .insert([{ route_name: route_name || `Route ${new Date().toLocaleDateString()}`, worker_id, created_by: "admin" }])
        .select().single();
      route_id = route?.id;
    }

    const assignments = order_ids.map(oid => ({
      order_id:    oid,
      worker_id,
      stage:       stage || "packaging",
      assigned_by: "admin",
      route_id,
    }));

    const { data, error } = await supabase
      .from("delivery_assignments").insert(assignments).select(ASSIGN_SELECT);
    if (error) return res.status(400).json({ error: error.message });

    // Update order statuses
    const newStatus = stage === "delivery" ? "out_for_delivery" : "packaging_assigned";
    for (const oid of order_ids) await updateOrderStatus(oid, newStatus);

    res.status(201).json({ success: true, data, message: `${order_ids.length} order(s) assigned for ${stage || "packaging"}` });
  } catch (e) { res.status(500).json({ error: "Internal server error" }); }
});

/* ── POST /api/deliveries/self-assign ── worker picks up unassigned order */
router.post("/self-assign", async (req, res) => {
  try {
    const { order_id, worker_id } = req.body;
    const { data: existing } = await supabase
      .from("delivery_assignments").select("id").eq("order_id", order_id).neq("status", "failed").single();
    if (existing) return res.status(400).json({ error: "Order already assigned" });

    const { data, error } = await supabase
      .from("delivery_assignments")
      .insert([{ order_id, worker_id, stage: "delivery", assigned_by: "self" }])
      .select(ASSIGN_SELECT).single();
    if (error) return res.status(400).json({ error: error.message });
    await updateOrderStatus(order_id, "out_for_delivery");
    res.status(201).json({ success: true, data });
  } catch (e) { res.status(500).json({ error: "Internal server error" }); }
});

/* ── PUT /api/deliveries/:id/status ── worker updates assignment status */
router.put("/:id/status", async (req, res) => {
  try {
    const { status, delivery_notes } = req.body;
    const valid = ["assigned", "in_progress", "delivered", "failed"];
    if (!valid.includes(status)) return res.status(400).json({ error: "Invalid status" });

    const updates = { status, delivery_notes: delivery_notes || null };
    if (status === "delivered") updates.delivered_at = new Date().toISOString();

    const { data: assignment, error } = await supabase
      .from("delivery_assignments").update(updates).eq("id", req.params.id)
      .select("*, orders(id, customer_id, total_amount, status)").single();
    if (error) return res.status(400).json({ error: error.message });

    const { stage, orders } = assignment;

    // Update order status based on stage + status
    if (status === "delivered" && stage === "packaging") {
      await updateOrderStatus(orders.id, "packed");
    } else if (status === "in_progress" && stage === "delivery") {
      await updateOrderStatus(orders.id, "out_for_delivery");
    }

    res.json({ success: true, data: assignment });
  } catch (e) { res.status(500).json({ error: "Internal server error" }); }
});

/* ── POST /api/deliveries/:id/collect-payment ── worker collects payment at door */
router.post("/:id/collect-payment", async (req, res) => {
  try {
    const { payment_mode, amount, pay_later } = req.body;
    const { data: assignment, error: aErr } = await supabase
      .from("delivery_assignments")
      .select("*, orders(id, customer_id, total_amount)")
      .eq("id", req.params.id).single();
    if (aErr || !assignment) return res.status(404).json({ error: "Assignment not found" });

    const { orders, worker_id } = assignment;
    const customerId = orders.customer_id;

    if (pay_later) {
      // Mark as pay_later — customer stays in worker's collection list
      await supabase.from("payment_collection_assignments")
        .upsert([{
          customer_id:        customerId,
          assigned_worker_id: worker_id,
          status:             "pay_later",
          amount_due:         orders.total_amount,
          updated_at:         new Date().toISOString(),
        }], { onConflict: "customer_id" });

      await supabase.from("delivery_assignments")
        .update({ status: "delivered", delivered_at: new Date().toISOString(), cash_collected: 0 })
        .eq("id", req.params.id);

      await updateOrderStatus(orders.id, "delivered");
      return res.json({ success: true, message: "Marked as pay later. Customer added to collection list." });
    }

    if (!amount || Number(amount) <= 0)
      return res.status(400).json({ error: "Amount required" });

    // Run FIFO payment
    await fifoPayment(customerId, amount, worker_id, payment_mode || "cash");

    // Update assignment
    await supabase.from("delivery_assignments")
      .update({ status: "delivered", delivered_at: new Date().toISOString(), cash_collected: Number(amount) })
      .eq("id", req.params.id);

    await updateOrderStatus(orders.id, "delivered");

    // Remove from pay_later list if existed
    await supabase.from("payment_collection_assignments")
      .update({ status: "collected", updated_at: new Date().toISOString() })
      .eq("customer_id", customerId).eq("status", "pay_later");

    res.json({ success: true, message: `₹${amount} collected via ${payment_mode}` });
  } catch (e) { res.status(500).json({ error: "Internal server error" }); }
});

/* ── GET /api/deliveries/collection-list/:workerId ── worker's pending collections */
router.get("/collection-list/:workerId", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("payment_collection_assignments")
      .select("*, customers(id, customer_name, contact_number, street_address, city, latitude, longitude)")
      .eq("assigned_worker_id", req.params.workerId)
      .eq("status", "pay_later");
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ error: "Internal server error" }); }
});

/* ── POST /api/deliveries/collection-list/:id/collect ── collect from pay_later list */
router.post("/collection-list/:id/collect", async (req, res) => {
  try {
    const { payment_mode, amount, worker_id } = req.body;
    const { data: pca, error } = await supabase
      .from("payment_collection_assignments")
      .select("*, customers(id)").eq("id", req.params.id).single();
    if (error || !pca) return res.status(404).json({ error: "Not found" });

    await fifoPayment(pca.customer_id, amount, worker_id, payment_mode || "cash");
    await supabase.from("payment_collection_assignments")
      .update({ status: "collected", updated_at: new Date().toISOString() })
      .eq("id", req.params.id);

    res.json({ success: true, message: `₹${amount} collected` });
  } catch (e) { res.status(500).json({ error: "Internal server error" }); }
});

/* ── DELETE /api/deliveries/:id ── unassign */
router.delete("/:id", async (req, res) => {
  try {
    const { data: a } = await supabase
      .from("delivery_assignments").select("orders(id, status)").eq("id", req.params.id).single();
    await supabase.from("delivery_assignments").delete().eq("id", req.params.id);
    // Revert order to placed if it was packaging_assigned
    if (a?.orders?.status === "packaging_assigned")
      await updateOrderStatus(a.orders.id, "placed");
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Internal server error" }); }
});

module.exports = router;
