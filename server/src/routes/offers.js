const express = require("express");
const supabase = require("../config/supabase");

const router = express.Router();

// POST /api/offers - Add new offer (ENHANCED)
router.post("/", async (req, res) => {
	try {
		const {
			offer_type, // 'free_item' or 'discount'
			product_id,
			company_id,
			min_product_weight,
			min_product_mrp,
			// Free item fields
			free_item_type, // 'same_product', 'different_product', 'external'
			free_item_product_id,
			free_item_external_name,
			free_item_external_description,
			free_item_quantity,
			// Discount fields
			discount_type, // 'fixed', 'percentage'
			discount_value,
			is_active,
		} = req.body;

		// Validation
		if (!offer_type || !["free_item", "discount"].includes(offer_type)) {
			return res.status(400).json({ error: "Invalid offer type" });
		}

		if (!product_id) {
			return res.status(400).json({ error: "Product is required for offers" });
		}

		// Validate based on offer type
		if (offer_type === "free_item") {
			if (
				!free_item_type ||
				!["same_product", "different_product", "external"].includes(
					free_item_type,
				)
			) {
				return res.status(400).json({ error: "Invalid free item type" });
			}

			if (free_item_type === "different_product" && !free_item_product_id) {
				return res.status(400).json({ error: "Free item product is required" });
			}

			if (
				free_item_type === "external" &&
				(!free_item_external_name || free_item_external_name.trim() === "")
			) {
				return res
					.status(400)
					.json({ error: "Free item name is required for external items" });
			}
		}

		if (offer_type === "discount") {
			if (!discount_type || !["fixed", "percentage"].includes(discount_type)) {
				return res.status(400).json({ error: "Invalid discount type" });
			}

			if (!discount_value || discount_value <= 0) {
				return res
					.status(400)
					.json({ error: "Discount value must be greater than 0" });
			}

			if (discount_type === "percentage" && discount_value > 100) {
				return res
					.status(400)
					.json({ error: "Percentage discount cannot exceed 100%" });
			}
		}

		// Check for overlapping offers
		const { data: overlappingOffers } = await supabase.rpc(
			"check_overlapping_offers",
			{
				p_product_id: product_id,
			},
		);

		// Check stock availability for free_item offers
		let canActivate = is_active !== undefined ? is_active : true;
		let allocated_stock = 0;

		if (offer_type === "free_item" && canActivate) {
			// Check if free stock is available
			let stockProductId = product_id; // Default: same product

			if (free_item_type === "different_product") {
				stockProductId = free_item_product_id;
			}

			if (free_item_type !== "external") {
				const { data: freeStock } = await supabase
					.from("free_stock")
					.select("available")
					.eq("product_id", stockProductId)
					.single();

				if (!freeStock || freeStock.available <= 0) {
					canActivate = false;
				}
			}
		}

		// Build offer data
		const offerData = {
			offer_type,
			product_id: parseInt(product_id),
			company_id: company_id ? parseInt(company_id) : null,
			min_product_weight: min_product_weight
				? parseFloat(min_product_weight)
				: null,
			min_product_mrp: min_product_mrp ? parseFloat(min_product_mrp) : null,
			is_active: canActivate,
		};

		// Add type-specific fields
		if (offer_type === "free_item") {
			offerData.free_item_type = free_item_type;
			offerData.free_item_quantity = free_item_quantity
				? parseFloat(free_item_quantity)
				: 1;

			if (free_item_type === "different_product") {
				offerData.free_item_product_id = parseInt(free_item_product_id);
			} else if (free_item_type === "external") {
				offerData.free_item_external_name = free_item_external_name.trim();
				offerData.free_item_external_description =
					free_item_external_description || null;
			}
		} else if (offer_type === "discount") {
			offerData.discount_type = discount_type;
			offerData.discount_value = parseFloat(discount_value);
		}

		// Insert offer
		const { data, error } = await supabase
			.from("offers")
			.insert([offerData])
			.select();

		if (error) {
			console.error("Database error:", error);
			return res.status(400).json({ error: error.message });
		}

		// Create offer pool entry if free_item type
		if (offer_type === "free_item") {
			await supabase.from("offer_pool").insert([
				{
					offer_id: data[0].id,
					product_id: parseInt(product_id),
					accumulated_quantity: 0,
				},
			]);
		}

		res.status(201).json({
			success: true,
			data: data[0],
			message: canActivate
				? "Offer created and activated successfully"
				: "Offer created but inactive (insufficient stock)",
			overlapping_offers: overlappingOffers || [],
		});
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// GET /api/offers - Get all offers with product/company details (ENHANCED)
router.get("/", async (req, res) => {
	try {
		const { data, error } = await supabase
			.from("offers")
			.select(
				`
        *,
        products!offers_product_id_fkey (
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
        ),
        free_item_product:products!offers_free_item_product_id_fkey (
          id,
          product_name,
          product_images,
          weight,
          mrp
        ),
        companies (
          id,
          company_name
        ),
        offer_pool (
          accumulated_quantity,
          total_transferred_to_regular,
          total_deducted
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

// GET /api/offers/check-overlaps/:productId - Check for overlapping offers
router.get("/check-overlaps/:productId", async (req, res) => {
	try {
		const { productId } = req.params;

		const { data, error } = await supabase.rpc("check_overlapping_offers", {
			p_product_id: parseInt(productId),
		});

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

// DELETE /api/offers/:id - Delete offer
router.delete("/:id", async (req, res) => {
	try {
		const { id } = req.params;

		const { error } = await supabase.from("offers").delete().eq("id", id);

		if (error) {
			console.error("Database error:", error);
			return res.status(400).json({ error: error.message });
		}

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
