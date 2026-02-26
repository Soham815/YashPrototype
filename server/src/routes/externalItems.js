const express = require("express");
const multer = require("multer");
const supabase = require("../config/supabase");

const router = express.Router();

// Configure multer for image upload
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		if (file.mimetype.startsWith("image/")) {
			cb(null, true);
		} else {
			cb(new Error("Only image files are allowed!"), false);
		}
	},
});

// POST /api/external-items - Add new external item
router.post("/", upload.single("item_image"), async (req, res) => {
	try {
		const { item_name, item_description, stock_quantity, low_stock_threshold } =
			req.body;
		const imageFile = req.file;

		if (!item_name || item_name.trim() === "") {
			return res.status(400).json({ error: "Item name is required" });
		}

		let imageUrl = null;

		// Upload image ONLY if provided (completely optional)
		if (imageFile) {
			const fileName = `${Date.now()}_${imageFile.originalname}`;

			const { data: uploadData, error: uploadError } = await supabase.storage
				.from("external-item-images")
				.upload(fileName, imageFile.buffer, {
					contentType: imageFile.mimetype,
					upsert: false,
				});

			if (uploadError) {
				console.error("Upload error:", uploadError);
				// Don't fail the entire request if image upload fails
				console.warn(
					"Image upload failed, continuing without image:",
					uploadError,
				);
			} else {
				const { data: urlData } = supabase.storage
					.from("external-item-images")
					.getPublicUrl(fileName);

				imageUrl = urlData.publicUrl;
			}
		}

		// Insert external item
		const { data, error } = await supabase
			.from("external_items")
			.insert([
				{
					item_name: item_name.trim(),
					item_description: item_description?.trim() || null,
					item_image: imageUrl,
					stock_quantity: stock_quantity ? parseInt(stock_quantity) : 0,
					low_stock_threshold: low_stock_threshold
						? parseInt(low_stock_threshold)
						: 50,
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
			message: "External item added successfully",
		});
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// GET /api/external-items - Get all external items
router.get("/", async (req, res) => {
	try {
		const { data, error } = await supabase
			.from("external_items")
			.select("*")
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

// GET /api/external-items/:id - Get single external item
router.get("/:id", async (req, res) => {
	try {
		const { id } = req.params;

		const { data, error } = await supabase
			.from("external_items")
			.select("*")
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

// POST /api/external-items/:id/add - Add stock (no PIN)
router.post("/:id/add", async (req, res) => {
	try {
		const { id } = req.params;
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

		// Get current stock
		const { data: currentItem, error: fetchError } = await supabase
			.from("external_items")
			.select("stock_quantity")
			.eq("id", id)
			.single();

		if (fetchError || !currentItem) {
			return res.status(400).json({ error: "External item not found" });
		}

		const previousQuantity = currentItem.stock_quantity;
		const newQuantity = previousQuantity + parseInt(quantity);

		// Update stock
		const { data: updatedItem, error: updateError } = await supabase
			.from("external_items")
			.update({
				stock_quantity: newQuantity,
				last_updated: new Date().toISOString(),
			})
			.eq("id", id)
			.select();

		if (updateError) {
			return res.status(400).json({ error: updateError.message });
		}

		// Log to history
		await supabase.from("external_item_stock_history").insert([
			{
				external_item_id: parseInt(id),
				action_type: "addition",
				previous_quantity: previousQuantity,
				new_quantity: newQuantity,
				change_amount: parseInt(quantity),
				reason_type,
				reason_note: reason_note?.trim() || null,
				admin_pin_used: false,
			},
		]);

		res.json({
			success: true,
			data: updatedItem[0],
			message: `Added ${quantity} units successfully`,
		});
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// PUT /api/external-items/:id/update - Update stock directly (with PIN)
router.put("/:id/update", async (req, res) => {
	try {
		const { id } = req.params;
		const { quantity, reason_type, reason_note, admin_pin } = req.body;

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
		const { data: currentItem, error: fetchError } = await supabase
			.from("external_items")
			.select("stock_quantity")
			.eq("id", id)
			.single();

		if (fetchError || !currentItem) {
			return res.status(400).json({ error: "External item not found" });
		}

		const previousQuantity = currentItem.stock_quantity;
		const newQuantity = parseInt(quantity);
		const changeAmount = newQuantity - previousQuantity;

		// Update stock
		const { data: updatedItem, error: updateError } = await supabase
			.from("external_items")
			.update({
				stock_quantity: newQuantity,
				last_updated: new Date().toISOString(),
			})
			.eq("id", id)
			.select();

		if (updateError) {
			return res.status(400).json({ error: updateError.message });
		}

		// Log to history
		await supabase.from("external_item_stock_history").insert([
			{
				external_item_id: parseInt(id),
				action_type: "update",
				previous_quantity: previousQuantity,
				new_quantity: newQuantity,
				change_amount: changeAmount,
				reason_type,
				reason_note: reason_note?.trim() || null,
				admin_pin_used: true,
			},
		]);

		res.json({
			success: true,
			data: updatedItem[0],
			message: "Stock updated successfully",
		});
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// GET /api/external-items/history/:id - Get history for specific item
router.get("/history/:id", async (req, res) => {
	try {
		const { id } = req.params;

		const { data, error } = await supabase
			.from("external_item_stock_history")
			.select("*")
			.eq("external_item_id", id)
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

// DELETE /api/external-items/:id - Delete external item
router.delete("/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const { admin_pin } = req.body;

		// Check PIN
		if (!admin_pin || admin_pin !== process.env.ADMIN_DELETE_PIN) {
			return res.status(403).json({ error: "Invalid PIN" });
		}

		// Check if item is used in any offers
		const { data: offers } = await supabase
			.from("offers")
			.select("id")
			.eq("external_item_id", id);

		if (offers && offers.length > 0) {
			return res.status(400).json({
				error:
					"Cannot delete item. It is currently used in active offers. Please remove from offers first.",
			});
		}

		// Delete item (cascade will delete history)
		const { error } = await supabase
			.from("external_items")
			.delete()
			.eq("id", id);

		if (error) {
			return res.status(400).json({ error: error.message });
		}

		res.json({
			success: true,
			message: "External item deleted successfully",
		});
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
