import { useState, useEffect, useCallback } from "react";

/**
 * Custom hook for paginated data with lazy loading strategy
 * Implements 3 (full) + 10 (partial) + 10 (skeleton) pattern
 * Mobile: 3 + 5 + 5
 */
export function usePaginatedData(apiUrl, options = {}) {
	const {
		initialLimit = 23, // Desktop: 3 + 10 + 10
		mobileLimit = 13, // Mobile: 3 + 5 + 5
		searchQuery = "",
		filterParams = {},
	} = options;

	// Detect mobile
	const isMobile = window.innerWidth <= 768;
	const batchSize = isMobile ? mobileLimit : initialLimit;

	const [data, setData] = useState([]);
	const [allData, setAllData] = useState([]); // Store unfiltered data
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [hasMore, setHasMore] = useState(false);
	const [offset, setOffset] = useState(0);
	const [total, setTotal] = useState(0);

	// Client-side filter by search query
	const filterDataBySearch = (dataToFilter, query) => {
		if (!query || query.trim() === "") return dataToFilter;

		return dataToFilter.filter((item) => {
			// Check product name
			if (
				item.product_name &&
				item.product_name.toLowerCase().includes(query.toLowerCase())
			) {
				return true;
			}

			// Check company name
			if (
				item.company_name &&
				item.company_name.toLowerCase().includes(query.toLowerCase())
			) {
				return true;
			}

			// Check nested company name (for products with companies object)
			if (
				item.companies?.company_name &&
				item.companies.company_name.toLowerCase().includes(query.toLowerCase())
			) {
				return true;
			}

			return false;
		});
	};

	// Fetch data
	const fetchData = useCallback(
		async (currentOffset = 0, append = false) => {
			try {
				setLoading(true);
				setError(null);

				// Build URL with pagination
				const url = new URL(apiUrl, window.location.origin);
				url.searchParams.set("limit", batchSize);
				url.searchParams.set("offset", currentOffset);

				// Add filter params
				Object.keys(filterParams).forEach((key) => {
					if (filterParams[key]) {
						url.searchParams.set(key, filterParams[key]);
					}
				});

				const response = await fetch(url.toString());
				const result = await response.json();

				if (result.success) {
					const fetchedData = result.data;

					// Store all data
					if (append) {
						const newAllData = [...allData, ...fetchedData];
						setAllData(newAllData);
						// Apply search filter
						const filtered = filterDataBySearch(newAllData, searchQuery);
						setData(filtered);
					} else {
						setAllData(fetchedData);
						// Apply search filter
						const filtered = filterDataBySearch(fetchedData, searchQuery);
						setData(filtered);
					}

					if (result.pagination) {
						setTotal(result.pagination.total);
						setHasMore(result.pagination.hasMore);
					} else {
						// No pagination response - assume all data loaded
						setTotal(result.data.length);
						setHasMore(false);
					}
				} else {
					setError(result.error || "Failed to fetch data");
				}
			} catch (err) {
				console.error("Error fetching data:", err);
				setError("Network error. Please try again.");
			} finally {
				setLoading(false);
			}
		},
		[apiUrl, batchSize, filterParams],
	);

	// Initial load
	useEffect(() => {
		setOffset(0);
		fetchData(0, false);
	}, [fetchData]);

	// Reapply filter when search query changes (client-side only)
	useEffect(() => {
		if (allData.length > 0) {
			const filtered = filterDataBySearch(allData, searchQuery);
			setData(filtered);
		}
	}, [searchQuery]);

	// Load more
	const loadMore = useCallback(() => {
		if (!loading && hasMore) {
			const newOffset = offset + batchSize;
			setOffset(newOffset);
			fetchData(newOffset, true);
		}
	}, [loading, hasMore, offset, batchSize, fetchData]);

	// Reset
	const reset = useCallback(() => {
		setOffset(0);
		setData([]);
		fetchData(0, false);
	}, [fetchData]);

	return {
		data,
		loading,
		error,
		hasMore,
		total,
		loadMore,
		reset,
		isMobile,
	};
}
