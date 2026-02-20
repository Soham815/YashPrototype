const express = require("express");
const multer = require("multer");
const supabase = require("../config/supabase");

const router = express.Router();

// Configure multer for memory storage (file stored in RAM temporarily)
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
	fileFilter: (req, file, cb) => {
		// Only allow image files
		if (file.mimetype.startsWith("image/")) {
			cb(null, true);
		} else {
			cb(new Error("Only image files are allowed!"), false);
		}
	},
});

// POST /api/companies - Add new company
router.post("/", upload.single("company_logo"), async (req, res) => {
	try {
		const { company_name } = req.body;
		const logoFile = req.file;

		// Validate company name
		if (!company_name || company_name.trim() === "") {
			return res.status(400).json({ error: "Company name is required" });
		}

		let logoUrl = null;

		// If logo file was uploaded
		if (logoFile) {
			// Generate unique filename: timestamp_originalname
			const fileName = `${Date.now()}_${logoFile.originalname}`;

			// Upload to Supabase Storage
			const { data: uploadData, error: uploadError } = await supabase.storage
				.from("company-logos")
				.upload(fileName, logoFile.buffer, {
					contentType: logoFile.mimetype,
					upsert: false,
				});

			if (uploadError) {
				console.error("Upload error:", uploadError);
				return res.status(500).json({ error: "Failed to upload logo" });
			}

			// Get public URL for the uploaded file
			const { data: urlData } = supabase.storage
				.from("company-logos")
				.getPublicUrl(fileName);

			logoUrl = urlData.publicUrl;
		}

		// Insert company into database
		const { data, error } = await supabase
			.from("companies")
			.insert([
				{
					company_name: company_name.trim(),
					company_logo: logoUrl,
				},
			])
			.select(); // Return the inserted row

		if (error) {
			console.error("Database error:", error);
			return res.status(400).json({ error: error.message });
		}

		res.status(201).json({
			success: true,
			data: data[0],
			message: "Company added successfully",
		});
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// GET /api/companies - Get all companies
router.get("/", async (req, res) => {
	try {
		const { data, error } = await supabase
			.from("companies")
			.select("*")
			.order("company_name", { ascending: true });

		if (error) {
			return res.status(400).json({ error: error.message });
		}

		res.json({ success: true, data });
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// GET /api/companies/:id - Get single company by ID
router.get("/:id", async (req, res) => {
	try {
		const { id } = req.params;

		const { data, error } = await supabase
			.from("companies")
			.select("*")
			.eq("id", id)
			.single();

		if (error) {
			return res.status(400).json({ error: error.message });
		}

		if (!data) {
			return res.status(404).json({ error: "Company not found" });
		}

		res.json({ success: true, data });
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// PUT /api/companies/:id - Update company
router.put("/:id", upload.single("company_logo"), async (req, res) => {
	try {
		const { id } = req.params;
		const { company_name } = req.body;
		const logoFile = req.file;

		// Validate company name
		if (!company_name || company_name.trim() === "") {
			return res.status(400).json({ error: "Company name is required" });
		}

		let logoUrl = null;

		// If new logo file was uploaded
		if (logoFile) {
			// Generate unique filename
			const fileName = `${Date.now()}_${logoFile.originalname}`;

			// Upload to Supabase Storage
			const { data: uploadData, error: uploadError } = await supabase.storage
				.from("company-logos")
				.upload(fileName, logoFile.buffer, {
					contentType: logoFile.mimetype,
					upsert: false,
				});

			if (uploadError) {
				console.error("Upload error:", uploadError);
				return res.status(500).json({ error: "Failed to upload logo" });
			}

			// Get public URL
			const { data: urlData } = supabase.storage
				.from("company-logos")
				.getPublicUrl(fileName);

			logoUrl = urlData.publicUrl;
		}

		// Build update object
		const updateData = {
			company_name: company_name.trim(),
		};

		// Only update logo if new one was uploaded
		if (logoUrl) {
			updateData.company_logo = logoUrl;
		}

		// Update company in database
		const { data, error } = await supabase
			.from("companies")
			.update(updateData)
			.eq("id", id)
			.select();

		if (error) {
			console.error("Database error:", error);
			return res.status(400).json({ error: error.message });
		}

		if (!data || data.length === 0) {
			return res.status(404).json({ error: "Company not found" });
		}

		res.json({
			success: true,
			data: data[0],
			message: "Company updated successfully",
		});
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// DELETE /api/companies/:id - Delete company (requires PIN)
router.delete("/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const { pin } = req.body; // Expect PIN in request body

		// Verify PIN (you can store this in .env file)
		const ADMIN_PIN = process.env.ADMIN_DELETE_PIN; // Default PIN

		if (!pin) {
			return res
				.status(400)
				.json({ error: "PIN is required to delete company" });
		}

		if (pin !== ADMIN_PIN) {
			return res.status(403).json({ error: "Incorrect PIN. Access denied." });
		}

		// Get company data before deletion (for confirmation message)
		const { data: companyData, error: fetchError } = await supabase
			.from("companies")
			.select("company_name")
			.eq("id", id)
			.single();

		if (fetchError) {
			console.error("Error fetching company:", fetchError);
			return res.status(400).json({ error: fetchError.message });
		}

		if (!companyData) {
			return res.status(404).json({ error: "Company not found" });
		}

		// Delete company from database (CASCADE will handle products & offers)
		const { data, error } = await supabase
			.from("companies")
			.delete()
			.eq("id", id)
			.select();

		if (error) {
			console.error("Database error:", error);
			return res.status(400).json({ error: error.message });
		}

		if (!data || data.length === 0) {
			return res.status(404).json({ error: "Company not found" });
		}

		// Optionally delete company logo from storage
		// You'd need to extract filename from data[0].company_logo URL
		// and call supabase.storage.from('company-logos').remove([filename])

		res.json({
			success: true,
			message: `Company "${companyData.company_name}" and all associated products/offers deleted successfully`,
		});
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
