const express = require("express");
const supabase = require("../config/supabase");

const router = express.Router();

// GET /api/offer-pool - Get all offer pools
router.get("/", async (req, res) => {
	try {
		const { data, error } = await supabase
			.from("offer_pool")
			.select(
				`
        *,
        offers (
          id,
          product_id,
          min_product_weight,
          min_product_mrp,
          free_item_type,
          free_item_quantity,
          is_active
        ),
        products (
          id,
          product_name,
          product_images,
          companies (
            company_name
          )
        )
      `,
			)
			.order("last_updated", { ascending: false });

		if (error) {
			return res.status(400).json({ error: error.message });
		}

		res.json({ success: true, data });
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// POST /api/offer-pool/:poolId/transfer - Transfer pool items to stock
router.post("/:poolId/transfer", async (req, res) => {
	try {
		const { poolId } = req.params;
		const { quantity, transfer_to, admin_pin } = req.body;

		// Validate
		if (!quantity || quantity <= 0) {
			return res.status(400).json({ error: "Quantity must be greater than 0" });
		}

		if (!transfer_to || !["regular", "free"].includes(transfer_to)) {
			return res.status(400).json({ error: "Invalid transfer destination" });
		}

		// Check PIN
		if (!admin_pin || admin_pin !== process.env.ADMIN_DELETE_PIN) {
			return res.status(403).json({ error: "Invalid PIN" });
		}

		// Get current pool
		const { data: pool, error: poolError } = await supabase
			.from("offer_pool")
			.select("*")
			.eq("id", poolId)
			.single();

		if (poolError || !pool) {
			return res.status(404).json({ error: "Pool not found" });
		}

		if (pool.accumulated_quantity < quantity) {
			return res.status(400).json({
				error: `Only ${pool.accumulated_quantity} items available in pool`,
			});
		}

		// Update pool
		const newAccumulated = pool.accumulated_quantity - parseInt(quantity);
		const updateField =
			transfer_to === "regular"
				? "total_transferred_to_regular"
				: "total_transferred_to_free";
		const newTransferTotal = pool[updateField] + parseInt(quantity);

		const { error: poolUpdateError } = await supabase
			.from("offer_pool")
			.update({
				accumulated_quantity: newAccumulated,
				[updateField]: newTransferTotal,
				last_updated: new Date().toISOString(),
			})
			.eq("id", poolId);

		if (poolUpdateError) {
			return res.status(400).json({ error: poolUpdateError.message });
		}

		// Update target stock
		if (transfer_to === "regular") {
			// Update regular stock
			const { data: currentStock } = await supabase
				.from("stock")
				.select("quantity")
				.eq("product_id", pool.product_id)
				.single();

			await supabase
				.from("stock")
				.update({
					quantity: currentStock.quantity + parseInt(quantity),
					last_updated: new Date().toISOString(),
				})
				.eq("product_id", pool.product_id);

			// Log to regular stock history
			await supabase.from("stock_history").insert([
				{
					product_id: pool.product_id,
					action_type: "addition",
					previous_quantity: currentStock.quantity,
					new_quantity: currentStock.quantity + parseInt(quantity),
					change_amount: parseInt(quantity),
					reason_type: "other",
					reason_note: `Transferred from offer pool (Pool ID: ${poolId})`,
					admin_pin_used: true,
				},
			]);
		} else {
			// Update free stock
			const { data: currentFreeStock } = await supabase
				.from("free_stock")
				.select("free_stock_quantity")
				.eq("product_id", pool.product_id)
				.single();

			await supabase
				.from("free_stock")
				.update({
					free_stock_quantity:
						currentFreeStock.free_stock_quantity + parseInt(quantity),
					last_updated: new Date().toISOString(),
				})
				.eq("product_id", pool.product_id);

			// Log to free stock history
			await supabase.from("free_stock_history").insert([
				{
					product_id: pool.product_id,
					action_type: "transfer_to_free",
					previous_quantity: currentFreeStock.free_stock_quantity,
					new_quantity:
						currentFreeStock.free_stock_quantity + parseInt(quantity),
					change_amount: parseInt(quantity),
					reason_type: "other",
					reason_note: `Transferred from offer pool (Pool ID: ${poolId})`,
					admin_pin_used: true,
				},
			]);
		}

		// Log to pool history
		await supabase.from("offer_pool_history").insert([
			{
				offer_pool_id: poolId,
				action_type:
					transfer_to === "regular"
						? "transferred_to_regular"
						: "transferred_to_free",
				quantity: parseInt(quantity),
				reason: `Admin transfer to ${transfer_to} stock`,
				admin_pin_used: true,
			},
		]);

		res.json({
			success: true,
			message: `Transferred ${quantity} items to ${transfer_to} stock`,
		});
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// POST /api/offer-pool/:poolId/deduct - Deduct pool items
router.post("/:poolId/deduct", async (req, res) => {
	try {
		const { poolId } = req.params;
		const { quantity, reason, admin_pin } = req.body;

		// Validate
		if (!quantity || quantity <= 0) {
			return res.status(400).json({ error: "Quantity must be greater than 0" });
		}

		if (!reason || reason.trim() === "") {
			return res.status(400).json({ error: "Reason is required" });
		}

		// Check PIN
		if (!admin_pin || admin_pin !== process.env.ADMIN_DELETE_PIN) {
			return res.status(403).json({ error: "Invalid PIN" });
		}

		// Get current pool
		const { data: pool, error: poolError } = await supabase
			.from("offer_pool")
			.select("*")
			.eq("id", poolId)
			.single();

		if (poolError || !pool) {
			return res.status(404).json({ error: "Pool not found" });
		}

		if (pool.accumulated_quantity < quantity) {
			return res.status(400).json({
				error: `Only ${pool.accumulated_quantity} items available in pool`,
			});
		}

		// Update pool
		const newAccumulated = pool.accumulated_quantity - parseInt(quantity);
		const newDeducted = pool.total_deducted + parseInt(quantity);

		const { error: poolUpdateError } = await supabase
			.from("offer_pool")
			.update({
				accumulated_quantity: newAccumulated,
				total_deducted: newDeducted,
				last_updated: new Date().toISOString(),
			})
			.eq("id", poolId);

		if (poolUpdateError) {
			return res.status(400).json({ error: poolUpdateError.message });
		}

		// Log to pool history
		await supabase.from("offer_pool_history").insert([
			{
				offer_pool_id: poolId,
				action_type: "deducted",
				quantity: parseInt(quantity),
				reason,
				admin_pin_used: true,
			},
		]);

		res.json({
			success: true,
			message: `Deducted ${quantity} items from pool`,
		});
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// GET /api/offer-pool/history/:poolId - Get pool history
router.get("/history/:poolId", async (req, res) => {
	try {
		const { poolId } = req.params;

		const { data, error } = await supabase
			.from("offer_pool_history")
			.select("*")
			.eq("offer_pool_id", poolId)
			.order("created_at", { ascending: false });

		if (error) {
			return res.status(400).json({ error: error.message });
		}

		res.json({ success: true, data });
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
