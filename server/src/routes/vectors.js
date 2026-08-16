const express = require("express");
const supabase = require("../config/supabase");
const { embedProduct, embedText } = require("../services/vectoriser");

const router = express.Router();

/**
 * POST /api/vectors/product/:id
 * Vectorise a single product. Called automatically when a product is
 * created or edited via AddProduct.jsx.
 */
router.post("/product/:id", async (req, res) => {
	try {
		const { id } = req.params;

		// Fetch product with company and categories for rich embedding
		const { data: product, error: fetchErr } = await supabase
			.from("products")
			.select(
				`*, 
				companies(company_name),
				product_categories(
					categories(category_name)
				)`,
			)
			.eq("id", id)
			.single();

		if (fetchErr || !product) {
			return res.status(404).json({ error: "Product not found" });
		}

		// Flatten categories onto product for buildProductText
		product.categories = (product.product_categories || [])
			.map((pc) => pc.categories)
			.filter(Boolean);

		const embedding = await embedProduct(product);

		// Store embedding — Supabase pgvector accepts array directly
		const { error: updateErr } = await supabase
			.from("products")
			.update({ embedding })
			.eq("id", id);

		if (updateErr) {
			return res.status(400).json({ error: updateErr.message });
		}

		res.json({
			success: true,
			message: `Product ${id} vectorised successfully`,
			dimensions: embedding.length,
		});
	} catch (err) {
		console.error("Vectorisation error:", err);
		res.status(500).json({ error: err.message });
	}
});

/**
 * POST /api/vectors/batch
 * Vectorise all products that have no embedding yet.
 * Called from admin VectoriseProducts page.
 * Streams progress back as newline-delimited JSON so the UI
 * can show a live progress bar.
 */
router.post("/batch", async (req, res) => {
	try {
		// Set up streaming response
		res.setHeader("Content-Type", "application/x-ndjson");
		res.setHeader("Transfer-Encoding", "chunked");
		res.flushHeaders();

		const send = (obj) => res.write(JSON.stringify(obj) + "\n");

		// Fetch all unvectorised products
		const { data: products, error: fetchErr } = await supabase
			.from("products")
			.select(
				`*, 
				companies(company_name),
				product_categories(
					categories(category_name)
				)`,
			)
			.is("embedding", null);

		if (fetchErr) {
			send({ type: "error", message: fetchErr.message });
			return res.end();
		}

		if (!products || products.length === 0) {
			send({ type: "done", total: 0, message: "All products already vectorised" });
			return res.end();
		}

		send({ type: "start", total: products.length });

		let success = 0;
		let failed = 0;

		for (let i = 0; i < products.length; i++) {
			const product = products[i];

			try {
				// Flatten categories
				product.categories = (product.product_categories || [])
					.map((pc) => pc.categories)
					.filter(Boolean);

				const embedding = await embedProduct(product);

				const { error: updateErr } = await supabase
					.from("products")
					.update({ embedding })
					.eq("id", product.id);

				if (updateErr) throw new Error(updateErr.message);

				success++;
				send({
					type: "progress",
					index: i + 1,
					total: products.length,
					productId: product.id,
					productName: product.product_name,
					status: "ok",
				});
			} catch (err) {
				failed++;
				send({
					type: "progress",
					index: i + 1,
					total: products.length,
					productId: product.id,
					productName: product.product_name,
					status: "error",
					message: err.message,
				});
			}

			// Small delay to avoid overwhelming the model on rapid batch
			await new Promise((r) => setTimeout(r, 50));
		}

		send({
			type: "done",
			total: products.length,
			success,
			failed,
			message: `Vectorised ${success} products. ${failed} failed.`,
		});

		res.end();
	} catch (err) {
		console.error("Batch vectorisation error:", err);
		res.status(500).json({ error: err.message });
	}
});

/**
 * GET /api/vectors/status
 * Returns count of vectorised vs total products.
 * Used by admin page to show current state.
 */
router.get("/status", async (req, res) => {
	try {
		const { count: total } = await supabase
			.from("products")
			.select("*", { count: "exact", head: true });

		const { count: vectorised } = await supabase
			.from("products")
			.select("*", { count: "exact", head: true })
			.not("embedding", "is", null);

		res.json({
			success: true,
			data: {
				total: total || 0,
				vectorised: vectorised || 0,
				unvectorised: (total || 0) - (vectorised || 0),
			},
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

/**
 * POST /api/vectors/search
 * Given a text query, return top N similar product IDs with scores.
 * Called from the search hook.
 */
router.post("/search", async (req, res) => {
	try {
		const { query, limit = 20 } = req.body;

		if (!query || query.trim() === "") {
			return res.status(400).json({ error: "Query is required" });
		}

		const embedding = await embedText(query);

		// pgvector cosine similarity search via Supabase RPC
		const { data, error } = await supabase.rpc("search_products_by_embedding", {
			query_embedding: embedding,
			match_threshold: 0.3,
			match_count: limit,
		});

		if (error) {
			return res.status(400).json({ error: error.message });
		}

		res.json({ success: true, data });
	} catch (err) {
		console.error("Vector search error:", err);
		res.status(500).json({ error: err.message });
	}
});

module.exports = router;
