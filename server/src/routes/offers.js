const express = require("express");
const supabase = require("../config/supabase");

const router = express.Router();

// POST /api/offers - Add new offer
router.post("/", async (req, res) => {
	try {
		const {
			offer_type, // 'product' or 'company'
			product_id,
			company_id,
			min_product_weight,
			min_product_mrp,
			offer_item,
			offer_discount,
			is_active,
		} = req.body;

		// Validation
		if (offer_type === "product" && !product_id) {
			return res
				.status(400)
				.json({ error: "Product is required for product-specific offers" });
		}

		if (offer_type === "company" && !company_id) {
			return res
				.status(400)
				.json({ error: "Company is required for company-wide offers" });
		}

		// Insert offer into database
		const { data, error } = await supabase
			.from("offers")
			.insert([
				{
					product_id: offer_type === "product" ? product_id : null,
					company_id: company_id || null,
					min_product_weight: min_product_weight
						? parseFloat(min_product_weight)
						: null,
					min_product_mrp: min_product_mrp ? parseFloat(min_product_mrp) : null,
					offer_item: offer_item || null,
					offer_discount: offer_discount ? parseFloat(offer_discount) : null,
					is_active: is_active !== undefined ? is_active : true,
				},
			])
			.select();

		if (error) {
			console.error("Database error:", error);
			return res.status(400).json({ error: error.message });
		}

		res.status(201).json({
			success: true,
			data: data[0],
			message: "Offer added successfully",
		});
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// GET /api/offers - Get all offers with product/company details
router.get("/", async (req, res) => {
	try {
		const { data, error } = await supabase
			.from("offers")
			.select(
				`
        *,
        products (
          id,
          product_name,
          company_id
        ),
        companies (
          id,
          company_name
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

// PUT /api/offers/:id - Update offer (mainly for toggling is_active)
router.put("/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const { is_active } = req.body;

		const { data, error } = await supabase
			.from("offers")
			.update({ is_active })
			.eq("id", id)
			.select();

		if (error) {
			console.error("Database error:", error);
			return res.status(400).json({ error: error.message });
		}

		if (!data || data.length === 0) {
			return res.status(404).json({ error: "Offer not found" });
		}

		res.json({
			success: true,
			data: data[0],
			message: "Offer updated successfully",
		});
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// DELETE /api/offers/:id - Delete offer (no cascade needed)
router.delete("/:id", async (req, res) => {
	try {
		const { id } = req.params;

		// Delete offer from database
		const { data, error } = await supabase
			.from("offers")
			.delete()
			.eq("id", id)
			.select();

		if (error) {
			console.error("Database error:", error);
			return res.status(400).json({ error: error.message });
		}

		if (!data || data.length === 0) {
			return res.status(404).json({ error: "Offer not found" });
		}

		// Note: The trigger will automatically update product.has_offer

		res.json({
			success: true,
			message: "Offer deleted successfully",
		});
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
