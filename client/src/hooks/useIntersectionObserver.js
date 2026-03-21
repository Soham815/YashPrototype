import { useEffect, useRef, useState } from "react";

/**
 * Custom hook for Intersection Observer
 * Triggers callback when element enters viewport
 */
export function useIntersectionObserver(options = {}) {
	const { threshold = 0.7, rootMargin = "0px" } = options;

	const [isIntersecting, setIsIntersecting] = useState(false);
	const targetRef = useRef(null);

	useEffect(() => {
		const target = targetRef.current;
		if (!target) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				setIsIntersecting(entry.isIntersecting);
			},
			{
				threshold,
				rootMargin,
			},
		);

		observer.observe(target);

		return () => {
			observer.unobserve(target);
		};
	}, [threshold, rootMargin]);

	return { targetRef, isIntersecting };
}
