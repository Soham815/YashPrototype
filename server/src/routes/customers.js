const express = require("express");
const supabase = require("../config/supabase");

const router = express.Router();

// POST /api/customers - Register new customer
router.post("/", async (req, res) => {
	try {
		const {
			customer_name,
			business_name,
			contact_number,
			street_address,
			latitude,
			longitude,
			gst_number,
			food_licence_number,
			email,
		} = req.body;

		// Validation
		if (
			!customer_name ||
			!business_name ||
			!contact_number ||
			!street_address ||
			!latitude ||
			!longitude ||
			!gst_number ||
			!food_licence_number
		) {
			return res.status(400).json({ error: "All fields are required" });
		}

		// Validate GST format (basic validation)
		const gstRegex =
			/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
		if (!gstRegex.test(gst_number)) {
			return res.status(400).json({ error: "Invalid GST number format" });
		}

		// Validate phone number (Indian format)
		const phoneRegex = /^[6-9]\d{9}$/;
		if (!phoneRegex.test(contact_number.replace(/[^0-9]/g, ""))) {
			return res
				.status(400)
				.json({ error: "Invalid contact number (10 digits required)" });
		}

		// Insert customer
		const { data, error } = await supabase
			.from("customers")
			.insert([
				{
					customer_name: customer_name.trim(),
					business_name: business_name.trim(),
					contact_number: contact_number.trim(),
					street_address: street_address.trim(),
					latitude: parseFloat(latitude),
					longitude: parseFloat(longitude),
					gst_number: gst_number.trim().toUpperCase(),
					food_licence_number: food_licence_number.trim().toUpperCase(),
					email: email ? email.trim().toLowerCase() : null,
				},
			])
			.select();

		if (error) {
			console.error("Database error:", error);

			// Handle unique constraint violations
			if (error.code === "23505") {
				if (error.message.includes("gst_number")) {
					return res
						.status(400)
						.json({ error: "GST number already registered" });
				}
				if (error.message.includes("food_licence_number")) {
					return res
						.status(400)
						.json({ error: "Food licence number already registered" });
				}
				if (error.message.includes("email")) {
					return res.status(400).json({ error: "Email already registered" });
				}
			}

			return res.status(400).json({ error: error.message });
		}

		res.status(201).json({
			success: true,
			data: data[0],
			message: "Customer registered successfully!",
		});
	} catch (error) {
		console.error("Server error:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// GET /api/customers - Get all customers
router.get("/", async (req, res) => {
	try {
		const { data, error } = await supabase
			.from("customers")
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

// GET /api/customers/nearby - Get customers within radius
router.get("/nearby", async (req, res) => {
	try {
		const { latitude, longitude, radius = 5000 } = req.query; // radius in meters

		if (!latitude || !longitude) {
			return res.status(400).json({ error: "Latitude and longitude required" });
		}

		// Using PostGIS for geospatial query
		const { data, error } = await supabase.rpc("get_nearby_customers", {
			user_lat: parseFloat(latitude),
			user_lng: parseFloat(longitude),
			radius_meters: parseInt(radius),
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

module.exports = router;
