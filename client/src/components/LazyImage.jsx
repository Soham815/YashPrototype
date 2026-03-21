import { useState, useEffect, useRef } from "react";
import "../styles/LazyImage.css";

/**
 * LazyImage Component
 * Supports three loading strategies:
 * 1. immediate - Load immediately (for first 3 items)
 * 2. lazy - Native browser lazy loading (for next 10 items)
 * 3. deferred - Intersection Observer (for queued items)
 */
function LazyImage({ src, alt, className = "", strategy = "lazy", ...props }) {
	const [loaded, setLoaded] = useState(false);
	const [imageSrc, setImageSrc] = useState(null);
	const [error, setError] = useState(false);
	const imgRef = useRef(null);
	const observerRef = useRef(null);

	useEffect(() => {
		if (strategy === "immediate") {
			// Preload image immediately
			const img = new Image();
			img.src = src;
			img.onload = () => {
				setImageSrc(src);
				setLoaded(true);
			};
			img.onerror = () => {
				setError(true);
			};
		} else if (strategy === "lazy") {
			// Use native lazy loading
			setImageSrc(src);
		} else if (strategy === "deferred") {
			// Use Intersection Observer
			observerRef.current = new IntersectionObserver(
				([entry]) => {
					if (entry.isIntersecting) {
						setImageSrc(src);
						observerRef.current.unobserve(imgRef.current);
					}
				},
				{
					rootMargin: "100px", // Start loading 100px before entering viewport
				},
			);

			if (imgRef.current) {
				observerRef.current.observe(imgRef.current);
			}

			return () => {
				if (observerRef.current && imgRef.current) {
					observerRef.current.unobserve(imgRef.current);
				}
			};
		}
	}, [src, strategy]);

	const handleLoad = () => {
		setLoaded(true);
	};

	const handleError = () => {
		setError(true);
	};

	if (error) {
		return (
			<div className={`lazy-image-error ${className}`} {...props}>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					className="lazy-image-error-icon"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
			</div>
		);
	}

	return (
		<div
			ref={imgRef}
			className={`lazy-image-wrapper ${loaded ? "loaded" : "loading"}`}
		>
			{/* Skeleton placeholder */}
			{!loaded && <div className="lazy-image-skeleton" />}

			{/* Actual image */}
			{imageSrc && (
				<img
					src={imageSrc}
					alt={alt}
					className={`lazy-image ${className} ${loaded ? "fade-in" : ""}`}
					onLoad={handleLoad}
					onError={handleError}
					loading={strategy === "lazy" ? "lazy" : "eager"}
					{...props}
				/>
			)}
		</div>
	);
}

export default LazyImage;
