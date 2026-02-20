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

// PUT /api/stock/:productId - Update stock
router.put("/:productId", async (req, res) => {
	try {
		const { productId } = req.params;
		const { quantity, low_stock_threshold, updated_by } = req.body;

		// Validate quantity
		if (quantity === undefined || quantity === null) {
			return res.status(400).json({ error: "Quantity is required" });
		}

		if (quantity < 0) {
			return res.status(400).json({ error: "Quantity cannot be negative" });
		}

		const updateData = {
			quantity: parseInt(quantity),
			last_updated: new Date().toISOString(),
		};

		if (low_stock_threshold !== undefined) {
			updateData.low_stock_threshold = parseInt(low_stock_threshold);
		}

		if (updated_by) {
			updateData.updated_by = updated_by;
		}

		const { data, error } = await supabase
			.from("stock")
			.update(updateData)
			.eq("product_id", productId)
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
			);

		if (error) {
			console.error("Database error:", error);
			return res.status(400).json({ error: error.message });
		}

		if (!data || data.length === 0) {
			return res.status(404).json({ error: "Stock record not found" });
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

// PUT /api/stock/bulk-update - Update multiple products at once
router.put("/bulk/update", async (req, res) => {
	try {
		const { updates } = req.body;

		if (!updates || !Array.isArray(updates) || updates.length === 0) {
			return res.status(400).json({ error: "Updates array is required" });
		}

		const results = [];
		const errors = [];

		for (const update of updates) {
			const { product_id, quantity } = update;

			if (!product_id || quantity === undefined) {
				errors.push({ product_id, error: "Missing product_id or quantity" });
				continue;
			}

			const { data, error } = await supabase
				.from("stock")
				.update({
					quantity: parseInt(quantity),
					last_updated: new Date().toISOString(),
				})
				.eq("product_id", product_id)
				.select();

			if (error) {
				errors.push({ product_id, error: error.message });
			} else {
				results.push(data[0]);
			}
		}

		res.json({
			success: true,
			updated: results,
			errors,
			message: `${results.length} products updated`,
		});
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
