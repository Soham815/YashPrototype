const express = require("express");
const supabase = require("../config/supabase");

const router = express.Router();

// GET /api/stock - Get all stock with product details
router.get("/", async (req, res) => {
	try {
		const { data, error } = await supabase
			.from("stock")
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

// GET /api/stock/product/:productId - Get stock for single product
router.get("/product/:productId", async (req, res) => {
	try {
		const { productId } = req.params;

		const { data, error } = await supabase
			.from("stock")
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

// POST /api/stock/:productId/add - Add to existing stock (NO PIN)
router.post("/:productId/add", async (req, res) => {
	try {
		const { productId } = req.params;
		const { quantity, reason_type, reason_note } = req.body;

		// Validation
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

		// Get current stock
		const { data: currentStock, error: fetchError } = await supabase
			.from("stock")
			.select("quantity")
			.eq("product_id", productId)
			.single();

		if (fetchError) {
			return res.status(400).json({ error: "Product stock not found" });
		}

		const previousQuantity = currentStock.quantity;
		const newQuantity = previousQuantity + parseInt(quantity);

		// Update stock
		const { data: updatedStock, error: updateError } = await supabase
			.from("stock")
			.update({
				quantity: newQuantity,
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
		const { error: historyError } = await supabase
			.from("stock_history")
			.insert([
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

		if (historyError) {
			console.error("History logging error:", historyError);
		}

		res.json({
			success: true,
			data: updatedStock[0],
			message: `Added ${quantity} units successfully`,
		});
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// PUT /api/stock/:productId/update - Update stock (REQUIRES PIN)
router.put("/:productId/update", async (req, res) => {
	try {
		const { productId } = req.params;
		const { quantity, reason_type, reason_note, admin_pin } = req.body;

		// Validation
		if (quantity === undefined || quantity === null) {
			return res.status(400).json({ error: "Quantity is required" });
		}

		if (quantity < 0) {
			return res.status(400).json({ error: "Quantity cannot be negative" });
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

		// Check PIN
		if (!admin_pin || admin_pin !== process.env.ADMIN_DELETE_PIN) {
			return res.status(403).json({ error: "Invalid PIN" });
		}

		// Get current stock
		const { data: currentStock, error: fetchError } = await supabase
			.from("stock")
			.select("quantity")
			.eq("product_id", productId)
			.single();

		if (fetchError) {
			return res.status(400).json({ error: "Product stock not found" });
		}

		const previousQuantity = currentStock.quantity;
		const newQuantity = parseInt(quantity);
		const changeAmount = newQuantity - previousQuantity;

		// Update stock
		const { data: updatedStock, error: updateError } = await supabase
			.from("stock")
			.update({
				quantity: newQuantity,
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
		const { error: historyError } = await supabase
			.from("stock_history")
			.insert([
				{
					product_id: parseInt(productId),
					action_type: "update",
					previous_quantity: previousQuantity,
					new_quantity: newQuantity,
					change_amount: changeAmount,
					reason_type,
					reason_note: reason_note || null,
					admin_pin_used: true,
				},
			]);

		if (historyError) {
			console.error("History logging error:", historyError);
		}

		res.json({
			success: true,
			data: updatedStock[0],
			message: "Stock updated successfully",
		});
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// GET /api/stock/history/:productId - Get history for specific product
router.get("/history/:productId", async (req, res) => {
	try {
		const { productId } = req.params;

		const { data, error } = await supabase
			.from("stock_history")
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

// GET /api/stock/history - Get all stock history
router.get("/history", async (req, res) => {
	try {
		const { data, error } = await supabase
			.from("stock_history")
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

// Old endpoint kept for backward compatibility
router.put("/:productId", async (req, res) => {
	try {
		const { productId } = req.params;
		const { quantity, low_stock_threshold } = req.body;

		if (quantity === undefined || quantity === null) {
			return res.status(400).json({ error: "Quantity is required" });
		}

		const updateData = {
			quantity: parseInt(quantity),
			last_updated: new Date().toISOString(),
		};

		if (low_stock_threshold !== undefined) {
			updateData.low_stock_threshold = parseInt(low_stock_threshold);
		}

		const { data, error } = await supabase
			.from("stock")
			.update(updateData)
			.eq("product_id", productId)
			.select();

		if (error) {
			return res.status(400).json({ error: error.message });
		}

		res.json({
			success: true,
			data: data[0],
			message: "Stock updated successfully",
		});
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
