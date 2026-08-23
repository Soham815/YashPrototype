const express = require("express");
const supabase = require("../config/supabase");
const router   = express.Router();

// ── POST /api/workers — admin creates worker ────────────────
router.post("/", async (req, res) => {
	try {
		const { worker_name, contact_number, role, password } = req.body;
		if (!worker_name || !contact_number || !password)
			return res.status(400).json({ error: "Name, contact number and password are required" });

		const { data: existing } = await supabase
			.from("workers").select("id").eq("contact_number", contact_number).single();
		if (existing)
			return res.status(400).json({ error: "Contact number already registered" });

		let password_hash = password;
		try {
			const { data } = await supabase.rpc("hash_password", { plain: password });
			if (data) password_hash = data;
		} catch (e) {}

		const { data, error } = await supabase
			.from("workers")
			.insert([{ worker_name, contact_number, role: role || "delivery", password_hash, is_active: true }])
			.select("id, worker_name, contact_number, role, is_active, created_at")
			.single();

		if (error) return res.status(400).json({ error: error.message });
		res.status(201).json({ success: true, data });
	} catch (e) {
		res.status(500).json({ error: "Internal server error" });
	}
});

// ── POST /api/workers/login ─────────────────────────────────
router.post("/login", async (req, res) => {
	try {
		const { contact_number, password } = req.body;
		if (!contact_number || !password)
			return res.status(400).json({ error: "Contact number and password are required" });

		const { data: worker, error } = await supabase
			.from("workers")
			.select("*")
			.eq("contact_number", contact_number)
			.single();

		if (error || !worker)
			return res.status(401).json({ error: "Invalid contact number or password" });
		if (!worker.is_active)
			return res.status(403).json({ error: "Account is inactive. Contact admin." });

		let valid = false;
		try {
			const { data } = await supabase.rpc("verify_password", { plain: password, hashed: worker.password_hash });
			valid = data;
		} catch (e) { valid = password === worker.password_hash; }

		if (!valid)
			return res.status(401).json({ error: "Invalid contact number or password" });

		const { password_hash, ...safe } = worker;
		res.json({ success: true, data: safe });
	} catch (e) {
		res.status(500).json({ error: "Internal server error" });
	}
});

// ── GET /api/workers — all workers (admin) ──────────────────
router.get("/", async (req, res) => {
	try {
		const { data, error } = await supabase
			.from("workers")
			.select("id, worker_name, contact_number, role, is_active, created_at")
			.order("created_at", { ascending: false });
		if (error) return res.status(400).json({ error: error.message });
		res.json({ success: true, data });
	} catch (e) {
		res.status(500).json({ error: "Internal server error" });
	}
});

// ── GET /api/workers/:id ────────────────────────────────────
router.get("/:id", async (req, res) => {
	try {
		const { data, error } = await supabase
			.from("workers")
			.select("id, worker_name, contact_number, role, is_active, created_at")
			.eq("id", req.params.id)
			.single();
		if (error || !data) return res.status(404).json({ error: "Worker not found" });
		res.json({ success: true, data });
	} catch (e) {
		res.status(500).json({ error: "Internal server error" });
	}
});

// ── PUT /api/workers/:id ── update/toggle active ────────────
router.put("/:id", async (req, res) => {
	try {
		const { worker_name, contact_number, role, is_active, password } = req.body;
		const updates = {};
		if (worker_name    !== undefined) updates.worker_name    = worker_name;
		if (contact_number !== undefined) updates.contact_number = contact_number;
		if (role           !== undefined) updates.role           = role;
		if (is_active      !== undefined) updates.is_active      = is_active;
		if (password) {
			try {
				const { data } = await supabase.rpc("hash_password", { plain: password });
				updates.password_hash = data || password;
			} catch (e) { updates.password_hash = password; }
		}
		updates.updated_at = new Date().toISOString();

		const { data, error } = await supabase
			.from("workers").update(updates).eq("id", req.params.id)
			.select("id, worker_name, contact_number, role, is_active").single();
		if (error) return res.status(400).json({ error: error.message });
		res.json({ success: true, data });
	} catch (e) {
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
