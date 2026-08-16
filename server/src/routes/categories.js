const express = require("express");
const supabase = require("../config/supabase");

const router = express.Router();

// GET /api/categories - Get all categories with product count
router.get("/", async (req, res) => {
	try {
		const { data, error } = await supabase
			.from("categories")
			.select(
				`
				*,
				product_categories (
					id,
					product_id
				)
			`,
			)
			.order("category_name", { ascending: true });

		if (error) {
			return res.status(400).json({ error: error.message });
		}

		// Add product_count for convenience
		const dataWithCount = data.map((cat) => ({
			...cat,
			product_count: cat.product_categories?.length || 0,
		}));

		res.json({ success: true, data: dataWithCount });
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// GET /api/categories/:id - Get single category with its products
router.get("/:id", async (req, res) => {
	try {
		const { id } = req.params;

		const { data, error } = await supabase
			.from("categories")
			.select(
				`
				*,
				product_categories (
					id,
					product_id,
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
				)
			`,
			)
			.eq("id", id)
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

// POST /api/categories - Create new category
router.post("/", async (req, res) => {
	try {
		const { category_name, category_description, category_color } = req.body;

		if (!category_name || category_name.trim() === "") {
			return res.status(400).json({ error: "Category name is required" });
		}

		const validColors = [
			"orange",
			"blue",
			"green",
			"purple",
			"red",
			"teal",
			"yellow",
			"pink",
		];
		const color = validColors.includes(category_color)
			? category_color
			: "orange";

		const { data, error } = await supabase
			.from("categories")
			.insert([
				{
					category_name: category_name.trim(),
					category_description: category_description?.trim() || null,
					category_color: color,
				},
			])
			.select();

		if (error) {
			// Handle unique constraint violation
			if (error.code === "23505") {
				return res
					.status(400)
					.json({ error: "A category with this name already exists" });
			}
			return res.status(400).json({ error: error.message });
		}

		res.status(201).json({
			success: true,
			data: data[0],
			message: "Category created successfully",
		});
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// PUT /api/categories/:id - Update category name/description/color
router.put("/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const { category_name, category_description, category_color } = req.body;

		if (!category_name || category_name.trim() === "") {
			return res.status(400).json({ error: "Category name is required" });
		}

		const validColors = [
			"orange",
			"blue",
			"green",
			"purple",
			"red",
			"teal",
			"yellow",
			"pink",
		];
		const color = validColors.includes(category_color)
			? category_color
			: "orange";

		const { data, error } = await supabase
			.from("categories")
			.update({
				category_name: category_name.trim(),
				category_description: category_description?.trim() || null,
				category_color: color,
			})
			.eq("id", id)
			.select();

		if (error) {
			if (error.code === "23505") {
				return res
					.status(400)
					.json({ error: "A category with this name already exists" });
			}
			return res.status(400).json({ error: error.message });
		}

		if (!data || data.length === 0) {
			return res.status(404).json({ error: "Category not found" });
		}

		res.json({
			success: true,
			data: data[0],
			message: "Category updated successfully",
		});
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// DELETE /api/categories/:id - Delete category
router.delete("/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const { admin_pin } = req.body;

		if (!admin_pin || admin_pin !== process.env.ADMIN_DELETE_PIN) {
			return res.status(403).json({ error: "Invalid PIN" });
		}

		// Junction rows are deleted automatically via ON DELETE CASCADE
		const { error } = await supabase
			.from("categories")
			.delete()
			.eq("id", id);

		if (error) {
			return res.status(400).json({ error: error.message });
		}

		res.json({ success: true, message: "Category deleted successfully" });
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// POST /api/categories/:id/products - Add a product to a category
router.post("/:id/products", async (req, res) => {
	try {
		const { id } = req.params;
		const { product_id } = req.body;

		if (!product_id) {
			return res.status(400).json({ error: "product_id is required" });
		}

		const { data, error } = await supabase
			.from("product_categories")
			.insert([
				{
					category_id: parseInt(id),
					product_id: parseInt(product_id),
				},
			])
			.select();

		if (error) {
			if (error.code === "23505") {
				return res
					.status(400)
					.json({ error: "Product is already in this category" });
			}
			return res.status(400).json({ error: error.message });
		}

		res.status(201).json({
			success: true,
			data: data[0],
			message: "Product added to category",
		});
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// DELETE /api/categories/:id/products/:productId - Remove a product from a category
router.delete("/:id/products/:productId", async (req, res) => {
	try {
		const { id, productId } = req.params;

		const { error } = await supabase
			.from("product_categories")
			.delete()
			.eq("category_id", id)
			.eq("product_id", productId);

		if (error) {
			return res.status(400).json({ error: error.message });
		}

		res.json({ success: true, message: "Product removed from category" });
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// GET /api/categories/product/:productId - Get all categories a product belongs to
router.get("/product/:productId", async (req, res) => {
	try {
		const { productId } = req.params;

		const { data, error } = await supabase
			.from("product_categories")
			.select(
				`
				category_id,
				categories (
					id,
					category_name,
					category_color
				)
			`,
			)
			.eq("product_id", productId);

		if (error) {
			return res.status(400).json({ error: error.message });
		}

		res.json({ success: true, data: data.map((d) => d.categories) });
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
