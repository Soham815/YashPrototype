const express = require("express");
const supabase = require("../config/supabase");
const router  = express.Router();

// ── POST /api/customers/signup ──────────────────────────────
router.post("/signup", async (req, res) => {
	try {
		const {
			customer_name,
			business_name,
			contact_number,
			email,
			street_address,
			city,
			latitude,
			longitude,
			gst_number,
			food_licence_number,
			password,
		} = req.body;

		if (!customer_name || !contact_number || !password)
			return res.status(400).json({ error: "Name, contact number and password are required" });

		// Check contact_number not already registered
		const { data: existing } = await supabase
			.from("customers")
			.select("id")
			.eq("contact_number", contact_number)
			.single();

		if (existing)
			return res.status(400).json({ error: "Contact number already registered" });

		// Check GST uniqueness if provided
		if (gst_number) {
			const { data: gstExists } = await supabase
				.from("customers")
				.select("id")
				.eq("gst_number", gst_number)
				.single();
			if (gstExists)
				return res.status(400).json({ error: "GST number already registered" });
		}

		// Check food licence uniqueness if provided
		if (food_licence_number) {
			const { data: licExists } = await supabase
				.from("customers")
				.select("id")
				.eq("food_licence_number", food_licence_number)
				.single();
			if (licExists)
				return res.status(400).json({ error: "Food licence number already registered" });
		}

		// Hash password via pgcrypto RPC
		let password_hash = password;
		try {
			const { data: hashResult } = await supabase
				.rpc("hash_password", { plain: password });
			if (hashResult) password_hash = hashResult;
		} catch (e) {
			console.warn("hash_password RPC not available, storing plain (dev only)");
		}

		const insertData = {
			customer_name,
			contact_number,
			password_hash,
			business_name:       business_name       || null,
			email:               email               || null,
			street_address:      street_address      || null,
			city:                city                || null,
			gst_number:          gst_number          || null,
			food_licence_number: food_licence_number || null,
			is_active:           true,
		};

		// Add coordinates if provided
		if (latitude && longitude) {
			insertData.latitude  = parseFloat(latitude);
			insertData.longitude = parseFloat(longitude);
		}

		const { data, error } = await supabase
			.from("customers")
			.insert([insertData])
			.select("id, customer_name, business_name, contact_number, email, street_address, city, gst_number, food_licence_number, latitude, longitude, is_active, created_at")
			.single();

		if (error) return res.status(400).json({ error: error.message });

		// Auto-create finance account
		await supabase
			.from("finance_accounts")
			.insert([{ customer_id: data.id }]);

		res.status(201).json({
			success: true,
			data:    data,
			message: "Account created successfully",
		});
	} catch (e) {
		console.error(e);
		res.status(500).json({ error: "Internal server error" });
	}
});

// ── POST /api/customers/login ──────────────────────────────
router.post("/login", async (req, res) => {
	try {
		const { contact_number, password } = req.body;

		if (!contact_number || !password)
			return res.status(400).json({ error: "Contact number and password are required" });

		const { data: customer, error } = await supabase
			.from("customers")
			.select("id, customer_name, business_name, contact_number, email, street_address, city, gst_number, food_licence_number, latitude, longitude, is_active, password_hash, created_at")
			.eq("contact_number", contact_number)
			.single();

		if (error || !customer)
			return res.status(401).json({ error: "Invalid contact number or password" });

		if (!customer.is_active)
			return res.status(403).json({ error: "Account is inactive. Contact support." });

		// Verify password
		let passwordValid = false;
		try {
			const { data: valid } = await supabase
				.rpc("verify_password", { plain: password, hashed: customer.password_hash });
			passwordValid = valid;
		} catch (e) {
			// Dev fallback
			passwordValid = password === customer.password_hash;
		}

		if (!passwordValid)
			return res.status(401).json({ error: "Invalid contact number or password" });

		const { password_hash, ...safeCustomer } = customer;

		res.json({ success: true, data: safeCustomer });
	} catch (e) {
		console.error(e);
		res.status(500).json({ error: "Internal server error" });
	}
});

// ── GET /api/customers (admin — all) ───────────────────────
router.get("/", async (req, res) => {
	try {
		const { data, error } = await supabase
			.from("customers")
			.select("id, customer_name, business_name, contact_number, email, street_address, city, gst_number, food_licence_number, latitude, longitude, is_active, created_at")
			.order("created_at", { ascending: false });

		if (error) return res.status(400).json({ error: error.message });
		res.json({ success: true, data });
	} catch (e) {
		res.status(500).json({ error: "Internal server error" });
	}
});

// ── GET /api/customers/:id ──────────────────────────────────
router.get("/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const { data, error } = await supabase
			.from("customers")
			.select("id, customer_name, business_name, contact_number, email, street_address, city, gst_number, food_licence_number, latitude, longitude, is_active, created_at")
			.eq("id", id)
			.single();

		if (error || !data) return res.status(404).json({ error: "Customer not found" });
		res.json({ success: true, data });
	} catch (e) {
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
