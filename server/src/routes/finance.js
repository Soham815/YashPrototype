const express = require("express");
const supabase = require("../config/supabase");
const router   = express.Router();

// GET /api/finance — all accounts (admin), enriched with 7-day overdue flag
router.get("/", async (req, res) => {
	try {
		const { data: accounts, error } = await supabase
			.from("finance_accounts")
			.select(`*, customers(id, customer_name, contact_number, email, city, street_address)`)
			.order("pending_credit", { ascending: false });

		if (error) return res.status(400).json({ error: error.message });

		// Enrich each account with overdue flag (debit with remaining_amount > 0 older than 7 days)
		const now = Date.now();
		const sevenDays = 7 * 24 * 60 * 60 * 1000;

		const enriched = await Promise.all(
			accounts.map(async (acc) => {
				const { data: oldDebits } = await supabase
					.from("credit_transactions")
					.select("id, remaining_amount, created_at")
					.eq("customer_id", acc.customer_id)
					.eq("type", "debit")
					.gt("remaining_amount", 0);

				const isOverdue = (oldDebits || []).some(
					(d) => now - new Date(d.created_at).getTime() > sevenDays,
				);

				return { ...acc, is_overdue: isOverdue };
			}),
		);

		// Sort: overdue first, then pending, then clear
		enriched.sort((a, b) => {
			if (a.is_overdue !== b.is_overdue) return a.is_overdue ? -1 : 1;
			return Number(b.pending_credit) - Number(a.pending_credit);
		});

		res.json({ success: true, data: enriched });
	} catch (e) {
		res.status(500).json({ error: "Internal server error" });
	}
});

// GET /api/finance/:customerId — single customer finance + transactions
router.get("/:customerId", async (req, res) => {
	try {
		const { customerId } = req.params;

		const { data: account, error } = await supabase
			.from("finance_accounts")
			.select("*, customers(id, customer_name, contact_number, email, city, street_address)")
			.eq("customer_id", customerId)
			.single();

		if (error || !account)
			return res.status(404).json({ error: "Finance account not found" });

		const { data: transactions } = await supabase
			.from("credit_transactions")
			.select("*, orders(id, status, created_at)")
			.eq("customer_id", customerId)
			.order("created_at", { ascending: false });

		// Mark overdue on each debit
		const now = Date.now();
		const sevenDays = 7 * 24 * 60 * 60 * 1000;
		const txnsEnriched = (transactions || []).map((t) => ({
			...t,
			is_overdue:
				t.type === "debit" &&
				Number(t.remaining_amount) > 0 &&
				now - new Date(t.created_at).getTime() > sevenDays,
		}));

		res.json({ success: true, data: { ...account, transactions: txnsEnriched } });
	} catch (e) {
		res.status(500).json({ error: "Internal server error" });
	}
});

// POST /api/finance/:customerId/payment — FIFO payment allocation
router.post("/:customerId/payment", async (req, res) => {
	try {
		const { customerId }   = req.params;
		const { amount, note } = req.body;

		if (!amount || Number(amount) <= 0)
			return res.status(400).json({ error: "Valid amount required" });

		const { data: account, error: accErr } = await supabase
			.from("finance_accounts")
			.select("*")
			.eq("customer_id", customerId)
			.single();

		if (accErr || !account)
			return res.status(404).json({ error: "Finance account not found" });

		// FIFO: clear oldest debits first
		const { data: pendingDebits } = await supabase
			.from("credit_transactions")
			.select("id, remaining_amount")
			.eq("customer_id", customerId)
			.eq("type", "debit")
			.gt("remaining_amount", 0)
			.order("created_at", { ascending: true });

		let remaining = Number(amount);
		for (const debit of pendingDebits || []) {
			if (remaining <= 0) break;
			const debitRemaining = Number(debit.remaining_amount);
			const applied        = Math.min(remaining, debitRemaining);
			await supabase
				.from("credit_transactions")
				.update({ remaining_amount: debitRemaining - applied })
				.eq("id", debit.id);
			remaining -= applied;
		}

		const newPending = Math.max(0, Number(account.pending_credit) - Number(amount));
		const newPaid    = Number(account.total_paid) + Number(amount);

		await supabase
			.from("finance_accounts")
			.update({ total_paid: newPaid, pending_credit: newPending, updated_at: new Date().toISOString() })
			.eq("customer_id", customerId);

		await supabase.from("credit_transactions").insert([{
			customer_id:      customerId,
			type:             "payment",
			amount:           Number(amount),
			remaining_amount: 0,
			note:             note || "Payment received",
		}]);

		res.json({
			success: true,
			message: `Payment of ₹${amount} recorded`,
			data:    { pending_credit: newPending, total_paid: newPaid },
		});
	} catch (e) {
		res.status(500).json({ error: "Internal server error" });
	}
});

module.exports = router;
