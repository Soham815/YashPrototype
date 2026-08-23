const express = require("express");
const supabase = require("../config/supabase");
const router  = express.Router();

// ── Shared: place an order for a customer (used by queue fulfillment)
async function placeQueueOrder(customerId, productId, pieces, pricePerPiece, mrpPerPiece, queueId) {
	const subtotal     = pieces * pricePerPiece;
	const total_amount = subtotal;
	const total_pieces = pieces;

	// Get customer name for stock history note
	const { data: customer } = await supabase
		.from("customers")
		.select("name")
		.eq("id", customerId)
		.single();

	// Insert order
	const { data: order, error: orderErr } = await supabase
		.from("orders")
		.insert([{
			customer_id:  customerId,
			total_amount,
			total_pieces,
			source:       "queue",
			notes:        `Auto-fulfilled from preorder queue entry #${queueId}`,
		}])
		.select()
		.single();

	if (orderErr) throw new Error(orderErr.message);

	// Insert order item
	const { error: itemErr } = await supabase
		.from("order_items")
		.insert([{
			order_id:         order.id,
			product_id:       productId,
			quantity_display: pieces,
			unit_display:     "pieces",
			pieces,
			price_per_piece:  pricePerPiece,
			mrp_per_piece:    mrpPerPiece,
			subtotal,
		}]);

	if (itemErr) throw new Error(itemErr.message);

	// Deduct stock
	const { data: stockRow } = await supabase
		.from("stock")
		.select("quantity")
		.eq("product_id", productId)
		.single();

	if (stockRow) {
		const newQty = Math.max(0, stockRow.quantity - pieces);
		await supabase
			.from("stock")
			.update({ quantity: newQty, last_updated: new Date().toISOString() })
			.eq("product_id", productId);

		await supabase.from("stock_history").insert([{
			product_id:        productId,
			action_type:       "deduction",
			previous_quantity: stockRow.quantity,
			new_quantity:      newQty,
			change_amount:     -pieces,
			reason_type:       "other",
			reason_note:       `Queue auto-fulfillment — Order #${order.id} — ${customer?.name || customerId}`,
			admin_pin_used:    false,
		}]);
	}

	// Finance debit
	const { data: finAcct } = await supabase
		.from("finance_accounts")
		.select("*")
		.eq("customer_id", customerId)
		.single();

	if (finAcct) {
		await supabase
			.from("finance_accounts")
			.update({
				total_billed:   Number(finAcct.total_billed)   + total_amount,
				pending_credit: Number(finAcct.pending_credit) + total_amount,
				updated_at:     new Date().toISOString(),
			})
			.eq("customer_id", customerId);
	} else {
		await supabase.from("finance_accounts").insert([{
			customer_id:    customerId,
			total_billed:   total_amount,
			pending_credit: total_amount,
		}]);
	}

	// Credit transaction
	await supabase.from("credit_transactions").insert([{
		customer_id:      customerId,
		order_id:         order.id,
		type:             "debit",
		amount:           total_amount,
		remaining_amount: total_amount,
		note:             `Order #${order.id} — auto-fulfilled from preorder queue`,
	}]);

	return order;
}

// ── Exported: process queue for a product after stock is added
// Called from stock routes whenever stock is added/updated
async function processQueueForProduct(productId) {
	try {
		// Get current stock
		const { data: stockRow } = await supabase
			.from("stock")
			.select("quantity")
			.eq("product_id", productId)
			.single();

		if (!stockRow || stockRow.quantity <= 0) return { fulfilled: 0, partial: 0 };

		// Get waiting queue entries for this product, oldest position first
		const { data: queueEntries } = await supabase
			.from("preorder_queue")
			.select(`
				*,
				products (
					id, product_name, selling_price, mrp
				)
			`)
			.eq("product_id", productId)
			.in("status", ["waiting", "partially_fulfilled"])
			.order("queue_position", { ascending: true });

		if (!queueEntries || queueEntries.length === 0) return { fulfilled: 0, partial: 0 };

		let available = stockRow.quantity;
		let fulfilled = 0;
		let partial   = 0;

		for (const entry of queueEntries) {
			if (available <= 0) break;

			const needed    = entry.pieces_requested - entry.pieces_fulfilled;
			const pricePerPiece = entry.products?.selling_price || 0;
			const mrpPerPiece   = entry.products?.mrp || 0;

			if (available >= needed) {
				// Full fulfillment
				await placeQueueOrder(
					entry.customer_id, productId, needed,
					pricePerPiece, mrpPerPiece, entry.id
				);

				await supabase
					.from("preorder_queue")
					.update({
						status:           "fulfilled",
						pieces_fulfilled: entry.pieces_requested,
					})
					.eq("id", entry.id);

				available -= needed;
				fulfilled++;
			} else {
				// Partial fulfillment
				await placeQueueOrder(
					entry.customer_id, productId, available,
					pricePerPiece, mrpPerPiece, entry.id
				);

				await supabase
					.from("preorder_queue")
					.update({
						status:           "partially_fulfilled",
						pieces_fulfilled: entry.pieces_fulfilled + available,
					})
					.eq("id", entry.id);

				available = 0;
				partial++;
			}
		}

		return { fulfilled, partial };
	} catch (e) {
		console.error("Queue processing error:", e);
		return { fulfilled: 0, partial: 0, error: e.message };
	}
}

// ── POST /api/preorders — Add to preorder queue
router.post("/", async (req, res) => {
	try {
		const {
			customer_id,
			product_id,
			quantity_display,
			unit_display,
			pieces_requested,
		} = req.body;

		if (!customer_id || !product_id || !pieces_requested)
			return res.status(400).json({ error: "customer_id, product_id and pieces_requested are required" });

		// Get current queue position for this product
		const { data: lastEntry } = await supabase
			.from("preorder_queue")
			.select("queue_position")
			.eq("product_id", product_id)
			.in("status", ["waiting", "partially_fulfilled"])
			.order("queue_position", { ascending: false })
			.limit(1)
			.single();

		const queue_position = lastEntry ? lastEntry.queue_position + 1 : 1;

		// Check current stock — if partial stock available, place immediate order for that
		const { data: stockRow } = await supabase
			.from("stock")
			.select("quantity")
			.eq("product_id", product_id)
			.single();

		const { data: product } = await supabase
			.from("products")
			.select("product_name, selling_price, mrp")
			.eq("id", product_id)
			.single();

		let immediateOrderId  = null;
		let piecesForQueue    = pieces_requested;
		let stockUsed         = 0;

		if (stockRow && stockRow.quantity > 0) {
			// Place immediate order for available stock
			stockUsed = Math.min(stockRow.quantity, pieces_requested);

			const { data: immOrder } = await supabase
				.from("orders")
				.insert([{
					customer_id,
					total_amount: stockUsed * product.selling_price,
					total_pieces: stockUsed,
					source:       "manual",
					notes:        `Partial order — ${pieces_requested - stockUsed} pieces preordered`,
				}])
				.select()
				.single();

			if (immOrder) {
				immediateOrderId = immOrder.id;

				await supabase.from("order_items").insert([{
					order_id:         immOrder.id,
					product_id,
					quantity_display: stockUsed,
					unit_display:     "pieces",
					pieces:           stockUsed,
					price_per_piece:  product.selling_price,
					mrp_per_piece:    product.mrp,
					subtotal:         stockUsed * product.selling_price,
				}]);

				// Deduct stock
				const newQty = stockRow.quantity - stockUsed;
				await supabase
					.from("stock")
					.update({ quantity: newQty, last_updated: new Date().toISOString() })
					.eq("product_id", product_id);

				// Finance debit for immediate portion
				const { data: finAcct } = await supabase
					.from("finance_accounts")
					.select("*")
					.eq("customer_id", customer_id)
					.single();

				const immTotal = stockUsed * product.selling_price;

				if (finAcct) {
					await supabase.from("finance_accounts").update({
						total_billed:   Number(finAcct.total_billed) + immTotal,
						pending_credit: Number(finAcct.pending_credit) + immTotal,
						updated_at:     new Date().toISOString(),
					}).eq("customer_id", customer_id);
				}

				await supabase.from("credit_transactions").insert([{
					customer_id,
					order_id:         immOrder.id,
					type:             "debit",
					amount:           immTotal,
					remaining_amount: immTotal,
					note:             `Order #${immOrder.id} — partial stock available`,
				}]);
			}

			piecesForQueue = pieces_requested - stockUsed;
		}

		// Only create queue entry if there's still remaining quantity
		let queueEntry = null;
		if (piecesForQueue > 0) {
			const { data, error } = await supabase
				.from("preorder_queue")
				.insert([{
					customer_id,
					product_id,
					quantity_display,
					unit_display,
					pieces_requested: piecesForQueue,
					pieces_fulfilled: 0,
					queue_position,
					status:           "waiting",
				}])
				.select()
				.single();

			if (error) return res.status(400).json({ error: error.message });
			queueEntry = data;
		}

		res.status(201).json({
			success: true,
			data: {
				queue_entry:        queueEntry,
				immediate_order_id: immediateOrderId,
				pieces_ordered_now: stockUsed,
				pieces_in_queue:    piecesForQueue,
				queue_position:     queueEntry?.queue_position || null,
			},
			message: stockUsed > 0 && piecesForQueue > 0
				? `${stockUsed} pieces ordered now. ${piecesForQueue} pieces added to queue at position #${queue_position}`
				: piecesForQueue > 0
				? `Added to preorder queue at position #${queue_position}`
				: `Full quantity available — order placed`,
		});
	} catch (e) {
		console.error(e);
		res.status(500).json({ error: "Internal server error" });
	}
});

// ── GET /api/preorders/customer/:customerId — Customer's queue entries
router.get("/customer/:customerId", async (req, res) => {
	try {
		const { customerId } = req.params;

		const { data, error } = await supabase
			.from("preorder_queue")
			.select(`
				*,
				products (
					id, product_name, product_images, weight,
					companies ( company_name )
				)
			`)
			.eq("customer_id", customerId)
			.order("created_at", { ascending: false });

		if (error) return res.status(400).json({ error: error.message });
		res.json({ success: true, data });
	} catch (e) {
		res.status(500).json({ error: "Internal server error" });
	}
});

// ── GET /api/preorders — All queue entries (admin)
router.get("/", async (req, res) => {
	try {
		const { product_id, status } = req.query;

		let query = supabase
			.from("preorder_queue")
			.select(`
				*,
				customers ( id, name, phone ),
				products (
					id, product_name, product_images,
					companies ( company_name )
				)
			`)
			.order("product_id", { ascending: true })
			.order("queue_position", { ascending: true });

		if (product_id) query = query.eq("product_id", product_id);
		if (status)     query = query.eq("status", status);

		const { data, error } = await query;
		if (error) return res.status(400).json({ error: error.message });
		res.json({ success: true, data });
	} catch (e) {
		res.status(500).json({ error: "Internal server error" });
	}
});

// ── DELETE /api/preorders/:id — Cancel a preorder
router.delete("/:id", async (req, res) => {
	try {
		const { id } = req.params;

		const { data: entry } = await supabase
			.from("preorder_queue")
			.select("status, customer_id")
			.eq("id", id)
			.single();

		if (!entry) return res.status(404).json({ error: "Queue entry not found" });
		if (entry.status === "fulfilled")
			return res.status(400).json({ error: "Cannot cancel a fulfilled preorder" });

		await supabase
			.from("preorder_queue")
			.update({ status: "cancelled" })
			.eq("id", id);

		res.json({ success: true, message: "Preorder cancelled" });
	} catch (e) {
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = { router, processQueueForProduct };
