import "../styles/SkeletonCard.css";

/**
 * SkeletonCard Component
 * Generic blurred skeleton for any card type
 *
 * Types:
 * - product: Product card skeleton
 * - company: Company card skeleton
 * - offer: Offer card skeleton
 * - custom: Use children for custom layout
 */
function SkeletonCard({ type = "product", children, className = "" }) {
	if (type === "custom" && children) {
		return <div className={`skeleton-card ${className}`}>{children}</div>;
	}

	// Product skeleton
	if (type === "product") {
		return (
			<div className={`skeleton-card skeleton-card--product ${className}`}>
				<div className="skeleton-card__image" />
				<div className="skeleton-card__content">
					<div className="skeleton-card__title" />
					<div className="skeleton-card__text skeleton-card__text--short" />
					<div className="skeleton-card__text skeleton-card__text--medium" />
				</div>
			</div>
		);
	}

	// Company skeleton
	if (type === "company") {
		return (
			<div className={`skeleton-card skeleton-card--company ${className}`}>
				<div className="skeleton-card__logo" />
				<div className="skeleton-card__content">
					<div className="skeleton-card__title skeleton-card__title--short" />
					<div className="skeleton-card__text skeleton-card__text--medium" />
				</div>
			</div>
		);
	}

	// Offer skeleton
	if (type === "offer") {
		return (
			<div className={`skeleton-card skeleton-card--offer ${className}`}>
				<div className="skeleton-card__content">
					<div className="skeleton-card__title" />
					<div className="skeleton-card__text skeleton-card__text--long" />
					<div className="skeleton-card__text skeleton-card__text--short" />
				</div>
			</div>
		);
	}

	return null;
}

export default SkeletonCard;
