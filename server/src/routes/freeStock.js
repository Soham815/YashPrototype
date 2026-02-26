const express = require("express");
const supabase = require("../config/supabase");

const router = express.Router();

// GET /api/free-stock - Get all free stock with product details
router.get("/", async (req, res) => {
	try {
		const { data, error } = await supabase
			.from("free_stock")
			.select(
				`
        *,
        products (
          id,
          product_name,
          product_images,
          weight,
          mrp,
          selling_price,
          companies (
            id,
            company_name,
            company_logo
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

// GET /api/free-stock/product/:productId - Get free stock for single product
router.get("/product/:productId", async (req, res) => {
	try {
		const { productId } = req.params;

		const { data, error } = await supabase
			.from("free_stock")
			.select(
				`
        *,
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
			.eq("product_id", productId)
			.single();

		if (error) {
			return res.status(400).json({ error: error.message });
		}

		res.json({ success: true, data });
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// POST /api/free-stock/:productId/add - Add free stock
router.post("/:productId/add", async (req, res) => {
	try {
		const { productId } = req.params;
		const { quantity, reason_type, reason_note } = req.body;

		if (!quantity || quantity <= 0) {
			return res.status(400).json({ error: "Quantity must be greater than 0" });
		}

		if (
			!reason_type ||
			!["new_shipment", "returns", "other"].includes(reason_type)
		) {
			return res.status(400).json({ error: "Invalid reason type" });
		}

		if (
			reason_type === "other" &&
			(!reason_note || reason_note.trim() === "")
		) {
			return res
				.status(400)
				.json({ error: "Reason note is required for 'other' type" });
		}

		// Get current free stock
		const { data: currentStock, error: fetchError } = await supabase
			.from("free_stock")
			.select("free_stock_quantity")
			.eq("product_id", productId)
			.single();

		if (fetchError) {
			return res.status(400).json({ error: "Product free stock not found" });
		}

		const previousQuantity = currentStock.free_stock_quantity;
		const newQuantity = previousQuantity + parseInt(quantity);

		// Update free stock
		const { data: updatedStock, error: updateError } = await supabase
			.from("free_stock")
			.update({
				free_stock_quantity: newQuantity,
				last_updated: new Date().toISOString(),
			})
			.eq("product_id", productId)
			.select(
				`
        *,
        products (
          id,
          product_name,
          companies (
            company_name
          )
        )
      `,
			);

		if (updateError) {
			return res.status(400).json({ error: updateError.message });
		}

		// Log to history
		await supabase.from("free_stock_history").insert([
			{
				product_id: parseInt(productId),
				action_type: "addition",
				previous_quantity: previousQuantity,
				new_quantity: newQuantity,
				change_amount: parseInt(quantity),
				reason_type,
				reason_note: reason_note || null,
				admin_pin_used: false,
			},
		]);

		// Check for inactive offers that can be activated
		const { data: inactiveOffers } = await supabase
			.from("offers")
			.select("id, product_id, free_item_product_id")
			.or(`product_id.eq.${productId},free_item_product_id.eq.${productId}`)
			.eq("is_active", false)
			.eq("offer_type", "free_item");

		res.json({
			success: true,
			data: updatedStock[0],
			message: `Added ${quantity} units to free stock`,
			inactive_offers: inactiveOffers || [],
		});
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// GET /api/free-stock/history/:productId - Get history for specific product
router.get("/history/:productId", async (req, res) => {
	try {
		const { productId } = req.params;

		const { data, error } = await supabase
			.from("free_stock_history")
			.select("*")
			.eq("product_id", productId)
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

// GET /api/free-stock/history - Get all free stock history
router.get("/history", async (req, res) => {
	try {
		const { data, error } = await supabase
			.from("free_stock_history")
			.select(
				`
        *,
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
