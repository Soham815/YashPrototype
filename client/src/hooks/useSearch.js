import { useState, useEffect, useCallback, useRef } from "react";
import { API_BASE_URL } from "../config/api";

const STOP_WORDS = new Set([
	"and","with","the","a","an","of","in","for","to","by","on","at","is","it",
	"its","or","ml","gm","g","kg","ltr","l","pcs","pc","pack","packet","box",
	"bag","bottle","pouch","set","nos","no","piece","pieces","litre","gram","grams",
]);

const tokenise = (str) => {
	if (!str) return [];
	return str
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.split(/\s+/)
		.filter((w) => w.length > 1 && !STOP_WORDS.has(w));
};

const levenshtein = (a, b) => {
	const matrix = Array.from({ length: b.length + 1 }, (_, i) =>
		Array.from({ length: a.length + 1 }, (_, j) =>
			i === 0 ? j : j === 0 ? i : 0,
		),
	);
	for (let i = 1; i <= b.length; i++) {
		for (let j = 1; j <= a.length; j++) {
			matrix[i][j] =
				b[i - 1] === a[j - 1]
					? matrix[i - 1][j - 1]
					: Math.min(
							matrix[i - 1][j - 1] + 1,
							matrix[i][j - 1] + 1,
							matrix[i - 1][j] + 1,
					  );
		}
	}
	return matrix[b.length][a.length];
};

// Pure token scoring — no async, always works
const scoreProduct = (product, queryTokens, queryRaw, stockData) => {
	const name          = (product.product_name || "").toLowerCase();
	const company       = (product.companies?.company_name || "").toLowerCase();
	const desc          = (product.product_desc || "").toLowerCase();
	const nameTokens    = tokenise(product.product_name);
	const companyTokens = tokenise(product.companies?.company_name);
	const query         = queryRaw.toLowerCase();
	let score = 0;

	if (name === query)          score += 100;
	if (name.startsWith(query))  score += 80;
	if (name.includes(query))    score += 60;
	if (company === query)       score += 50;
	if (company.includes(query)) score += 30;

	for (const qt of queryTokens) {
		if (nameTokens.includes(qt))                                          score += 25;
		if (companyTokens.includes(qt))                                       score += 15;
		if (nameTokens.some((nt) => nt.startsWith(qt) && qt.length >= 3))    score += 10;
		if (desc.includes(qt))                                                score += 5;
	}

	const stock = stockData[product.id];
	if (stock) {
		if (stock.quantity === 0)                            score -= 50;
		else if (stock.quantity < stock.low_stock_threshold) score -= 10;
	}

	return score;
};

const findSuggestion = (queryTokens, allProducts) => {
	if (queryTokens.length === 0) return null;
	const wordPool = new Set();
	allProducts.forEach((p) => {
		tokenise(p.product_name).forEach((w) => wordPool.add(w));
		tokenise(p.companies?.company_name).forEach((w) => wordPool.add(w));
	});
	const suggestions = queryTokens.map((qt) => {
		let best = null, bestDist = Infinity;
		for (const word of wordPool) {
			if (Math.abs(word.length - qt.length) > 3) continue;
			const dist = levenshtein(qt, word);
			if (dist > 0 && dist <= 2 && dist < bestDist) { bestDist = dist; best = word; }
		}
		return best;
	});
	if (!suggestions.some(Boolean)) return null;
	const suggested = queryTokens.map((qt, i) => suggestions[i] || qt).join(" ");
	return suggested !== queryTokens.join(" ") ? suggested : null;
};

const findSimilar = (topProducts, allProducts, stockData, limit = 8) => {
	if (topProducts.length === 0) return [];
	const seedTokens    = new Set();
	const seedCompanies = new Set();
	const seedIds       = new Set(topProducts.map((p) => p.id));

	topProducts.slice(0, 3).forEach((p) => {
		tokenise(p.product_name).forEach((t) => seedTokens.add(t));
		if (p.companies?.company_name)
			seedCompanies.add(p.companies.company_name.toLowerCase());
	});

	return allProducts
		.filter((p) => !seedIds.has(p.id))
		.map((p) => {
			const nameTokens = tokenise(p.product_name);
			const company    = (p.companies?.company_name || "").toLowerCase();
			let sim = 0;
			for (const st of seedTokens) {
				if (nameTokens.includes(st))                                       sim += 20;
				if (nameTokens.some((nt) => nt.startsWith(st) && st.length >= 3)) sim += 8;
			}
			if (seedCompanies.has(company)) sim += 15;
			const stock = stockData[p.id];
			if (stock?.quantity === 0) sim -= 30;
			return { ...p, similarityScore: sim };
		})
		.filter((p) => p.similarityScore > 0)
		.sort((a, b) => b.similarityScore - a.similarityScore)
		.slice(0, limit);
};

export const highlightMatch = (text, query) => {
	if (!query || !text) return { __html: text };
	const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const regex   = new RegExp(`(${escaped})`, "gi");
	return { __html: text.replace(regex, "<mark>$1</mark>") };
};

// ─────────────────────────────────────────────
// Fetch vector scores with timeout + abort
// Returns empty map on any failure — token scoring
// always runs regardless
// ─────────────────────────────────────────────
async function fetchVectorScores(query, signal) {
	try {
		const res = await fetch(`${API_BASE_URL}/vectors/search`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ query, limit: 50 }),
			signal,
		});
		if (!res.ok) return {};
		const data = await res.json();
		if (!data.success || !data.data) return {};
		const map = {};
		data.data.forEach((row) => { map[row.id] = row.similarity; });
		return map;
	} catch (e) {
		// AbortError = timeout, TypeError = network, both fine to swallow
		if (e.name !== "AbortError") {
			console.warn("Vector search unavailable — using token scoring only:", e.message);
		}
		return {};
	}
}

// ─────────────────────────────────────────────
// Main hook
// ─────────────────────────────────────────────
export function useSearch(allProducts, stockData) {
	const [query,            setQuery]            = useState("");
	const [debouncedQuery,   setDebouncedQuery]   = useState("");
	const [results,          setResults]          = useState([]);
	const [similarProducts,  setSimilarProducts]  = useState([]);
	const [fallbackProducts, setFallbackProducts] = useState([]);
	const [suggestion,       setSuggestion]       = useState(null);
	const [searchHistory,    setSearchHistory]    = useState([]);
	const [isSearching,      setIsSearching]      = useState(false);

	const debounceRef = useRef(null);
	const abortRef    = useRef(null);

	// 400ms debounce
	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => setDebouncedQuery(query), 400);
		return () => clearTimeout(debounceRef.current);
	}, [query]);

	useEffect(() => {
		if (!debouncedQuery.trim()) {
			setResults([]);
			setSimilarProducts([]);
			setSuggestion(null);
			setIsSearching(false);
			return;
		}

		// Wait until products are loaded before searching
		if (!allProducts || allProducts.length === 0) return;

		runSearch(debouncedQuery);

		// Cleanup: abort any in-flight vector request when query changes
		return () => {
			if (abortRef.current) abortRef.current.abort();
		};
	}, [debouncedQuery, allProducts, stockData]);

	const runSearch = async (rawQuery) => {
		setIsSearching(true);

		// Abort previous vector request
		if (abortRef.current) abortRef.current.abort();
		const controller  = new AbortController();
		abortRef.current  = controller;

		// 5 second timeout for vector call
		const timeoutId = setTimeout(() => controller.abort(), 5000);

		const queryTokens = tokenise(rawQuery);

		// ── Step 1: token scoring immediately (sync, always works) ──
		const tokenScored = allProducts.map((p) => ({
			...p,
			_tokenScore: scoreProduct(p, queryTokens, rawQuery, stockData),
		}));

		// Show token results right away so user sees something
		const tokenOnly = tokenScored
			.filter((p) => p._tokenScore > 0)
			.sort((a, b) => b._tokenScore - a._tokenScore);

		setResults(tokenOnly);
		setSimilarProducts(findSimilar(tokenOnly, allProducts, stockData));
		if (tokenOnly.length < 3) setSuggestion(findSuggestion(queryTokens, allProducts));
		else setSuggestion(null);
		if (tokenOnly.length === 0) {
			setFallbackProducts(
				[...allProducts]
					.filter((p) => (stockData[p.id]?.quantity || 0) > 0)
					.sort((a, b) => (stockData[b.id]?.quantity || 0) - (stockData[a.id]?.quantity || 0))
					.slice(0, 8),
			);
		} else {
			setFallbackProducts([]);
		}

		setIsSearching(false);

		// ── Step 2: vector scoring (async, upgrades results when ready) ──
		const vectorMap = await fetchVectorScores(rawQuery, controller.signal);
		clearTimeout(timeoutId);

		// Only upgrade if we got actual vector results back
		if (Object.keys(vectorMap).length > 0) {
			const blended = tokenScored
				.map((p) => ({
					...p,
					_score: p._tokenScore * 0.6 + (vectorMap[p.id] ?? 0) * 100 * 0.4,
				}))
				.filter((p) => p._score > 0)
				.sort((a, b) => b._score - a._score);

			setResults(blended);
			setSimilarProducts(findSimilar(blended, allProducts, stockData));
			if (blended.length < 3) setSuggestion(findSuggestion(queryTokens, allProducts));
			if (blended.length === 0) {
				setFallbackProducts(
					[...allProducts]
						.filter((p) => (stockData[p.id]?.quantity || 0) > 0)
						.sort((a, b) => (stockData[b.id]?.quantity || 0) - (stockData[a.id]?.quantity || 0))
						.slice(0, 8),
				);
			} else {
				setFallbackProducts([]);
			}
		}
		// If vector failed/timed out — token results already showing, do nothing
	};

	const commitSearch = useCallback((q) => {
		if (!q.trim()) return;
		setSearchHistory((prev) => {
			const filtered = prev.filter((h) => h.toLowerCase() !== q.toLowerCase());
			return [q, ...filtered].slice(0, 5);
		});
	}, []);

	const applySuggestion = useCallback((sugg) => {
		setQuery(sugg);
		setSuggestion(null);
	}, []);

	return {
		query, setQuery, debouncedQuery,
		results, similarProducts, fallbackProducts,
		suggestion, applySuggestion,
		searchHistory, commitSearch,
		isSearching,
	};
}
