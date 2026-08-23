const express = require("express");
const supabase = require("../config/supabase");
const router   = express.Router();

// POST /api/orders — place order, deduct stock, debit finance
router.post("/", async (req, res) => {
	try {
		const { customer_id, items, notes } = req.body;
		if (!customer_id || !items?.length)
			return res.status(400).json({ error: "customer_id and items are required" });

		const { data: customer, error: custErr } = await supabase
			.from("customers")
			.select("id, customer_name")
			.eq("id", customer_id)
			.single();

		if (custErr || !customer)
			return res.status(404).json({ error: "Customer not found" });

		const total_amount = items.reduce((s, i) => s + Number(i.subtotal), 0);
		const total_pieces = items.reduce((s, i) => s + Number(i.pieces), 0);

		const { data: order, error: orderErr } = await supabase
			.from("orders")
			.insert([{ customer_id, total_amount, total_pieces, notes: notes || null, source: "manual" }])
			.select()
			.single();

		if (orderErr) return res.status(400).json({ error: orderErr.message });

		const orderItems = items.map((i) => ({
			order_id:         order.id,
			product_id:       i.product_id,
			quantity_display: i.quantity_display,
			unit_display:     i.unit_display,
			pieces:           i.pieces,
			price_per_piece:  i.price_per_piece,
			mrp_per_piece:    i.mrp_per_piece,
			subtotal:         i.subtotal,
		}));

		const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
		if (itemsErr) return res.status(400).json({ error: itemsErr.message });

		// Deduct stock + log history
		for (const item of items) {
			const { data: stockRow } = await supabase
				.from("stock")
				.select("quantity")
				.eq("product_id", item.product_id)
				.single();

			if (stockRow) {
				const newQty = Math.max(0, stockRow.quantity - item.pieces);
				await supabase
					.from("stock")
					.update({ quantity: newQty, last_updated: new Date().toISOString() })
					.eq("product_id", item.product_id);

				await supabase.from("stock_history").insert([{
					product_id:        item.product_id,
					action_type:       "deduction",
					previous_quantity: stockRow.quantity,
					new_quantity:      newQty,
					change_amount:     -item.pieces,
					reason_type:       "other",
					reason_note:       `Order #${order.id} — ${customer.customer_name}`,
					admin_pin_used:    false,
				}]);
			}
		}

		// Finance debit — FIFO remaining_amount on debit entry
		const { data: finAcct } = await supabase
			.from("finance_accounts")
			.select("id, pending_credit, total_billed")
			.eq("customer_id", customer_id)
			.single();

		if (finAcct) {
			await supabase
				.from("finance_accounts")
				.update({
					total_billed:   Number(finAcct.total_billed) + total_amount,
					pending_credit: Number(finAcct.pending_credit) + total_amount,
					updated_at:     new Date().toISOString(),
				})
				.eq("customer_id", customer_id);
		} else {
			await supabase.from("finance_accounts").insert([{
				customer_id,
				total_billed:   total_amount,
				pending_credit: total_amount,
			}]);
		}

		await supabase.from("credit_transactions").insert([{
			customer_id,
			order_id:         order.id,
			type:             "debit",
			amount:           total_amount,
			remaining_amount: total_amount,
			note:             `Order #${order.id} placed`,
		}]);

		res.status(201).json({ success: true, data: order, message: "Order placed successfully" });
	} catch (e) {
		console.error(e);
		res.status(500).json({ error: "Internal server error" });
	}
});

// GET /api/orders/customer/:customerId
router.get("/customer/:customerId", async (req, res) => {
	try {
		const { data, error } = await supabase
			.from("orders")
			.select(`*, order_items(*, products(id, product_name, product_images, weight, companies(company_name)))`)
			.eq("customer_id", req.params.customerId)
			.order("created_at", { ascending: false });

		if (error) return res.status(400).json({ error: error.message });
		res.json({ success: true, data });
	} catch (e) {
		res.status(500).json({ error: "Internal server error" });
	}
});

// GET /api/orders — all (admin)
router.get("/", async (req, res) => {
	try {
		const { status } = req.query;
		let query = supabase
			.from("orders")
			.select(`*, customers(id, customer_name, contact_number, city), order_items(*, products(id, product_name, product_images, companies(company_name)))`)
			.order("created_at", { ascending: false });

		if (status) query = query.eq("status", status);
		const { data, error } = await query;
		if (error) return res.status(400).json({ error: error.message });
		res.json({ success: true, data });
	} catch (e) {
		res.status(500).json({ error: "Internal server error" });
	}
});

// GET /api/orders/:id
router.get("/:id", async (req, res) => {
	try {
		const { data, error } = await supabase
			.from("orders")
			.select(`*, customers(id, customer_name, contact_number, street_address, city), order_items(*, products(id, product_name, product_images, weight, companies(company_name)))`)
			.eq("id", req.params.id)
			.single();

		if (error || !data) return res.status(404).json({ error: "Order not found" });
		res.json({ success: true, data });
	} catch (e) {
		res.status(500).json({ error: "Internal server error" });
	}
});

// PUT /api/orders/:id/status
router.put("/:id/status", async (req, res) => {
	try {
		const { status } = req.body;
		const valid = ["placed", "delivered", "return_requested", "returned"];
		if (!valid.includes(status))
			return res.status(400).json({ error: "Invalid status" });

		const { data, error } = await supabase
			.from("orders")
			.update({ status, updated_at: new Date().toISOString() })
			.eq("id", req.params.id)
			.select()
			.single();

		if (error) return res.status(400).json({ error: error.message });
		res.json({ success: true, data, message: `Order marked as ${status}` });
	} catch (e) {
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
