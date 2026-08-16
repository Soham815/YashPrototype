/**
 * Vectoriser Service
 * Uses @xenova/transformers with all-MiniLM-L6-v2 (384 dimensions)
 * Model is downloaded once and cached. On Render free tier this cache
 * resets on deploy — acceptable since you'll do bulk vectorisation locally.
 *
 * Install: npm install @xenova/transformers
 */

let pipeline = null;
let isLoading = false;
let loadPromise = null;

/**
 * Lazy-load the pipeline once and reuse it.
 * Subsequent calls return the cached instance immediately.
 */
async function getPipeline() {
	if (pipeline) return pipeline;

	if (isLoading) {
		// Another request is already loading — wait for it
		return loadPromise;
	}

	isLoading = true;
	loadPromise = (async () => {
		try {
			console.log("🤖 Loading all-MiniLM-L6-v2 model...");
			// Dynamic import so the rest of the server loads fine
			// even if the package is not yet installed
			const { pipeline: createPipeline } = await import(
				"@xenova/transformers"
			);
			pipeline = await createPipeline(
				"feature-extraction",
				"Xenova/all-MiniLM-L6-v2",
			);
			console.log("✅ Model loaded and ready");
			return pipeline;
		} catch (err) {
			isLoading = false;
			loadPromise = null;
			throw new Error(
				`Failed to load embedding model: ${err.message}. ` +
					`Make sure @xenova/transformers is installed: npm install @xenova/transformers`,
			);
		}
	})();

	return loadPromise;
}

/**
 * Build a rich text representation of a product for embedding.
 * More context = better semantic matches.
 *
 * @param {object} product - product row from DB
 * @returns {string}
 */
function buildProductText(product) {
	const parts = [];

	if (product.product_name) parts.push(product.product_name);
	if (product.companies?.company_name) parts.push(product.companies.company_name);
	if (product.product_desc) parts.push(product.product_desc);
	if (product.weight) parts.push(`${product.weight} grams`);

	// If categories are joined, include them
	if (product.categories && product.categories.length > 0) {
		const catNames = product.categories
			.map((c) => c.category_name)
			.join(", ");
		parts.push(catNames);
	}

	return parts.join(". ").trim();
}

/**
 * Generate a 384-dimensional embedding for a single product.
 *
 * @param {object} product - product row (needs product_name at minimum)
 * @returns {number[]} - array of 384 floats
 */
async function embedProduct(product) {
	const pipe = await getPipeline();
	const text = buildProductText(product);

	const output = await pipe(text, {
		pooling: "mean",
		normalize: true,
	});

	// Convert tensor to plain JS array
	return Array.from(output.data);
}

/**
 * Generate embeddings for a plain text query (for search).
 *
 * @param {string} text
 * @returns {number[]}
 */
async function embedText(text) {
	const pipe = await getPipeline();

	const output = await pipe(text.trim(), {
		pooling: "mean",
		normalize: true,
	});

	return Array.from(output.data);
}

/**
 * Cosine similarity between two vectors (both already normalised).
 * Since all-MiniLM-L6-v2 outputs normalised vectors,
 * cosine similarity = dot product.
 *
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number} - between -1 and 1 (higher = more similar)
 */
function cosineSimilarity(a, b) {
	if (a.length !== b.length) return 0;
	let dot = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
	}
	return dot;
}

module.exports = { embedProduct, embedText, cosineSimilarity, buildProductText };
