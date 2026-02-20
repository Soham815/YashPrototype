const express = require("express");
const multer = require("multer");
const supabase = require("../config/supabase");

const router = express.Router();

// Configure multer for multiple files
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
	fileFilter: (req, file, cb) => {
		if (file.mimetype.startsWith("image/")) {
			cb(null, true);
		} else {
			cb(new Error("Only image files are allowed!"), false);
		}
	},
});

// POST /api/products - Add new product
router.post("/", upload.array("product_images", 10), async (req, res) => {
	try {
		const {
			product_name,
			company_id,
			weight,
			mrp,
			buying_price,
			selling_price,
			gst_percentage,
			has_offer,
			product_desc,
			items_per_box,
		} = req.body;

		const imageFiles = req.files;

		// Validation
		if (
			!product_name ||
			!company_id ||
			!mrp ||
			!buying_price ||
			!selling_price
		) {
			return res.status(400).json({
				error:
					"Product name, company, MRP, buying price, and selling price are required",
			});
		}

		if (!imageFiles || imageFiles.length === 0) {
			return res
				.status(400)
				.json({ error: "At least one product image is required" });
		}

		// Upload images to Supabase Storage
		const imageUrls = [];

		for (const file of imageFiles) {
			const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${file.originalname}`;

			const { data: uploadData, error: uploadError } = await supabase.storage
				.from("product-images")
				.upload(fileName, file.buffer, {
					contentType: file.mimetype,
					upsert: false,
				});

			if (uploadError) {
				console.error("Upload error:", uploadError);
				return res.status(500).json({ error: "Failed to upload images" });
			}

			const { data: urlData } = supabase.storage
				.from("product-images")
				.getPublicUrl(fileName);

			imageUrls.push(urlData.publicUrl);
		}

		// Insert product into database
		const { data, error } = await supabase
			.from("products")
			.insert([
				{
					product_name: product_name.trim(),
					company_id: parseInt(company_id),
					weight: weight ? parseFloat(weight) : null,
					product_images: imageUrls,
					mrp: parseFloat(mrp),
					buying_price: parseFloat(buying_price),
					selling_price: parseFloat(selling_price),
					gst_percentage: gst_percentage ? parseFloat(gst_percentage) : null,
					has_offer: has_offer === "true",
					product_desc: product_desc || null,
					items_per_box: items_per_box ? parseInt(items_per_box) : null,
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
			message: "Product added successfully",
		});
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// GET /api/products - Get all products with company info
router.get("/", async (req, res) => {
	try {
		const { data, error } = await supabase
			.from("products")
			.select(
				`
        *,
        companies (
          id,
          company_name,
          company_logo
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

// GET /api/products/:id - Get single product
router.get("/:id", async (req, res) => {
	try {
		const { id } = req.params;

		const { data, error } = await supabase
			.from("products")
			.select(
				`
        *,
        companies (
          id,
          company_name,
          company_logo
        )
      `,
			)
			.eq("id", id)
			.single();

		if (error) {
			return res.status(400).json({ error: error.message });
		}

		if (!data) {
			return res.status(404).json({ error: "Product not found" });
		}

		res.json({ success: true, data });
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// PUT /api/products/:id/toggle-offer - Toggle has_offer
router.put("/:id/toggle-offer", async (req, res) => {
	try {
		const { id } = req.params;
		const { has_offer } = req.body;

		const { data, error } = await supabase
			.from("products")
			.update({ has_offer })
			.eq("id", id)
			.select();

		if (error) {
			console.error("Database error:", error);
			return res.status(400).json({ error: error.message });
		}

		if (!data || data.length === 0) {
			return res.status(404).json({ error: "Product not found" });
		}

		// The trigger will automatically sync offers

		res.json({
			success: true,
			data: data[0],
			message: "Product updated successfully",
		});
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// PUT /api/products/:id - Update product
router.put("/:id", upload.array("product_images", 10), async (req, res) => {
	try {
		const { id } = req.params;
		const {
			product_name,
			company_id,
			weight,
			mrp,
			buying_price,
			selling_price,
			gst_percentage,
			has_offer,
			product_desc,
			items_per_box,
			keep_existing_images, // Flag to keep existing images
		} = req.body;

		const imageFiles = req.files;

		// Validation
		if (
			!product_name ||
			!company_id ||
			!mrp ||
			!buying_price ||
			!selling_price
		) {
			return res.status(400).json({
				error:
					"Product name, company, MRP, buying price, and selling price are required",
			});
		}

		// Handle images
		let imageUrls = [];

		if (imageFiles && imageFiles.length > 0) {
			// Upload new images
			for (const file of imageFiles) {
				const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${file.originalname}`;

				const { data: uploadData, error: uploadError } = await supabase.storage
					.from("product-images")
					.upload(fileName, file.buffer, {
						contentType: file.mimetype,
						upsert: false,
					});

				if (uploadError) {
					console.error("Upload error:", uploadError);
					return res.status(500).json({ error: "Failed to upload images" });
				}

				const { data: urlData } = supabase.storage
					.from("product-images")
					.getPublicUrl(fileName);

				imageUrls.push(urlData.publicUrl);
			}
		} else if (keep_existing_images === "true") {
			// Keep existing images - fetch them
			const { data: existingProduct } = await supabase
				.from("products")
				.select("product_images")
				.eq("id", id)
				.single();

			if (existingProduct && existingProduct.product_images) {
				imageUrls = existingProduct.product_images;
			}
		}

		// Build update object
		const updateData = {
			product_name: product_name.trim(),
			company_id: parseInt(company_id),
			weight: weight ? parseFloat(weight) : null,
			mrp: parseFloat(mrp),
			buying_price: parseFloat(buying_price),
			selling_price: parseFloat(selling_price),
			gst_percentage: gst_percentage ? parseFloat(gst_percentage) : null,
			has_offer: has_offer === "true",
			product_desc: product_desc || null,
			items_per_box: items_per_box ? parseInt(items_per_box) : null,
		};

		// Only update images if new ones were uploaded or we're keeping existing
		if (imageUrls.length > 0) {
			updateData.product_images = imageUrls;
		}

		// Update product in database
		const { data, error } = await supabase
			.from("products")
			.update(updateData)
			.eq("id", id)
			.select();

		if (error) {
			console.error("Database error:", error);
			return res.status(400).json({ error: error.message });
		}

		if (!data || data.length === 0) {
			return res.status(404).json({ error: "Product not found" });
		}

		res.json({
			success: true,
			data: data[0],
			message: "Product updated successfully",
		});
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// DELETE /api/products/:id - Delete product (CASCADE deletes offers)
router.delete("/:id", async (req, res) => {
	try {
		const { id } = req.params;

		// Get product data before deletion (for confirmation message)
		const { data: productData, error: fetchError } = await supabase
			.from("products")
			.select("product_name, product_images")
			.eq("id", id)
			.single();

		if (fetchError) {
			console.error("Error fetching product:", fetchError);
			return res.status(400).json({ error: fetchError.message });
		}

		if (!productData) {
			return res.status(404).json({ error: "Product not found" });
		}

		// Delete product from database (CASCADE will handle offers)
		const { data, error } = await supabase
			.from("products")
			.delete()
			.eq("id", id)
			.select();

		if (error) {
			console.error("Database error:", error);
			return res.status(400).json({ error: error.message });
		}

		if (!data || data.length === 0) {
			return res.status(404).json({ error: "Product not found" });
		}

		// Optionally delete product images from storage
		// You'd need to extract filenames from productData.product_images URLs
		// and call supabase.storage.from('product-images').remove([...filenames])

		res.json({
			success: true,
			message: `Product "${productData.product_name}" and all associated offers deleted successfully`,
		});
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
