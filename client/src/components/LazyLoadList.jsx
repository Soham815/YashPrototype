import { useEffect } from "react";
import { usePaginatedData } from "../hooks/usePaginatedData";
import { useIntersectionObserver } from "../hooks/useIntersectionObserver";
import SkeletonCard from "./SkeletonCard";
import "../styles/LazyLoadList.css";

/**
 * LazyLoadList Component
 * Implements optimized loading strategy:
 * Desktop: 3 full + 10 partial + 10 skeleton
 * Mobile: 3 full + 5 partial + 5 skeleton
 * 
 * Props:
 * - apiUrl: Backend endpoint
 * - renderItem: Function to render each item (item, strategy) => JSX
 * - skeletonType: 'product' | 'company' | 'offer' | 'custom'
 * - emptyMessage: Message when no items
 * - searchQuery: Search filter
 * - filterParams: Additional filters
 */
function LazyLoadList({
	apiUrl,
	renderItem,
	skeletonType = "product",
	emptyMessage = "No items found",
	searchQuery = "",
	filterParams = {},
	className = "",
}) {
	const {
		data,
		loading,
		error,
		hasMore,
		loadMore,
		isMobile,
	} = usePaginatedData(apiUrl, {
		searchQuery,
		filterParams,
	});

	// Intersection observer for infinite scroll
	const { targetRef, isIntersecting } = useIntersectionObserver({
		threshold: 0.7, // Trigger at 70% visibility
	});

	// Load more when scroll trigger is reached
	useEffect(() => {
		if (isIntersecting && hasMore && !loading) {
			loadMore();
		}
	}, [isIntersecting, hasMore, loading, loadMore]);

	// Calculate batch sizes based on device
	const fullLoadCount = 3;
	const partialLoadCount = isMobile ? 5 : 10;
	const skeletonCount = isMobile ? 5 : 10;
	const totalBatchSize = fullLoadCount + partialLoadCount + skeletonCount;

	// Categorize items in current batch
	const getCurrentBatch = () => {
		// Items that should be fully loaded (preloaded images)
		const fullItems = data.slice(0, fullLoadCount);

		// Items with lazy-loaded images
		const partialItems = data.slice(fullLoadCount, fullLoadCount + partialLoadCount);

		// Items with deferred loading
		const deferredItems = data.slice(
			fullLoadCount + partialLoadCount,
			fullLoadCount + partialLoadCount + skeletonCount,
		);

		// Already loaded items from previous batches
		const loadedItems = data.slice(fullLoadCount + partialLoadCount + skeletonCount);

		return { fullItems, partialItems, deferredItems, loadedItems };
	};

	const { fullItems, partialItems, deferredItems, loadedItems } = getCurrentBatch();

	// Initial loading state
	if (loading && data.length === 0) {
		return (
			<div className={`lazy-load-list ${className}`}>
				<div className="lazy-load-list__loading">
					<div className="spinner"></div>
					<p>Loading...</p>
				</div>
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<div className={`lazy-load-list ${className}`}>
				<div className="lazy-load-list__error">
					<p>{error}</p>
					<button onClick={() => window.location.reload()}>Retry</button>
				</div>
			</div>
		);
	}

	// Empty state
	if (!loading && data.length === 0) {
		return (
			<div className={`lazy-load-list ${className}`}>
				<div className="lazy-load-list__empty">
					<p>{emptyMessage}</p>
				</div>
			</div>
		);
	}

	return (
		<div className={`lazy-load-list ${className}`}>
			<div className="lazy-load-list__grid">
				{/* Phase 1: Fully loaded items (preloaded images) */}
				{fullItems.map((item) => (
					<div key={item.id} className="lazy-load-list__item">
						{renderItem(item, "immediate")}
					</div>
				))}

				{/* Phase 2: Partially loaded items (lazy images) */}
				{partialItems.map((item) => (
					<div key={item.id} className="lazy-load-list__item">
						{renderItem(item, "lazy")}
					</div>
				))}

				{/* Phase 3: Deferred items (intersection observer) */}
				{deferredItems.map((item) => (
					<div key={item.id} className="lazy-load-list__item">
						{renderItem(item, "deferred")}
					</div>
				))}

				{/* Already loaded items from previous batches */}
				{loadedItems.map((item) => (
					<div key={item.id} className="lazy-load-list__item">
						{renderItem(item, "lazy")}
					</div>
				))}

				{/* Skeleton placeholders while loading more */}
				{loading &&
					Array.from({ length: skeletonCount }).map((_, index) => (
						<div key={`skeleton-${index}`} className="lazy-load-list__item">
							<SkeletonCard type={skeletonType} />
						</div>
					))}
			</div>

			{/* Scroll trigger for infinite loading */}
			{hasMore && !loading && (
				<div ref={targetRef} className="lazy-load-list__trigger">
					{/* Invisible trigger element */}
				</div>
			)}

			{/* Loading indicator */}
			{loading && data.length > 0 && (
				<div className="lazy-load-list__loading-more">
					<div className="spinner"></div>
					<p>Loading more...</p>
				</div>
			)}

			{/* End message */}
			{!hasMore && data.length > 0 && (
				<div className="lazy-load-list__end">
					<p>You've reached the end</p>
				</div>
			)}
		</div>
	);
}

export default LazyLoadList;