import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ViewOffers.css";
import { API_BASE_URL } from "../config/api";

function ViewOffers() {
	const navigate = useNavigate();
	const [offers, setOffers] = useState([]);
	const [filteredOffers, setFilteredOffers] = useState([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [filterType, setFilterType] = useState("all"); // 'all', 'free_item', 'discount'
	const [sortBy, setSortBy] = useState("all"); // 'all', 'active', 'inactive'
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState({ type: "", text: "" });

	useEffect(() => {
		fetchOffers();
	}, []);

	// Filter offers
	useEffect(() => {
		let filtered = [...offers];

		// Search filter
		if (searchQuery.trim() !== "") {
			filtered = filtered.filter((offer) => {
				const productName = offer.products?.product_name || "";
				const companyName = offer.companies?.company_name || "";

				return (
					productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
					companyName.toLowerCase().includes(searchQuery.toLowerCase())
				);
			});
		}

		// Type filter
		if (filterType !== "all") {
			filtered = filtered.filter((offer) => offer.offer_type === filterType);
		}

		// Active/Inactive filter
		if (sortBy === "active") {
			filtered = filtered.filter((offer) => offer.is_active === true);
		} else if (sortBy === "inactive") {
			filtered = filtered.filter((offer) => offer.is_active === false);
		}

		// Sort active offers first
		filtered.sort((a, b) => {
			if (a.is_active && !b.is_active) return -1;
			if (!a.is_active && b.is_active) return 1;
			return 0;
		});

		setFilteredOffers(filtered);
	}, [searchQuery, filterType, sortBy, offers]);

	const fetchOffers = async () => {
		try {
			setLoading(true);
			const response = await fetch(`${API_BASE_URL}/offers`);
			const data = await response.json();

			if (data.success) {
				setOffers(data.data);
				setFilteredOffers(data.data);
			} else {
				setMessage({ type: "error", text: "Failed to load offers" });
			}
		} catch (error) {
			console.error("Error fetching offers:", error);
			setMessage({ type: "error", text: "Network error. Please try again." });
		} finally {
			setLoading(false);
		}
	};

	const handleToggleActive = async (offerId, currentStatus) => {
		try {
			const response = await fetch(`${API_BASE_URL}/offers/${offerId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ is_active: !currentStatus }),
			});

			const data = await response.json();

			if (response.ok) {
				// Update local state
				setOffers((prevOffers) =>
					prevOffers.map((offer) =>
						offer.id === offerId
							? { ...offer, is_active: !currentStatus }
							: offer,
					),
				);

				setMessage({
					type: "success",
					text: `Offer ${!currentStatus ? "activated" : "deactivated"} successfully!`,
				});

				setTimeout(() => setMessage({ type: "", text: "" }), 3000);
			} else {
				setMessage({
					type: "error",
					text: data.error || "Failed to update offer",
				});
			}
		} catch (error) {
			console.error("Error toggling offer:", error);
			setMessage({ type: "error", text: "Network error. Please try again." });
		}
	};

	const handleDeleteOffer = async (offerId) => {
		if (
			!window.confirm(
				"Are you sure you want to delete this offer? This action cannot be undone.",
			)
		) {
			return;
		}

		try {
			const response = await fetch(`${API_BASE_URL}/offers/${offerId}`, {
				method: "DELETE",
			});

			const data = await response.json();

			if (response.ok) {
				setOffers((prevOffers) =>
					prevOffers.filter((offer) => offer.id !== offerId),
				);

				setMessage({
					type: "success",
					text: "Offer deleted successfully!",
				});

				setTimeout(() => setMessage({ type: "", text: "" }), 3000);
			} else {
				setMessage({
					type: "error",
					text: data.error || "Failed to delete offer",
				});
			}
		} catch (error) {
			console.error("Error deleting offer:", error);
			setMessage({ type: "error", text: "Network error. Please try again." });
		}
	};

	const getOfferDisplayName = (offer) => {
		return offer.products?.product_name || "Unknown Product";
	};

	const getOfferDetails = (offer) => {
		const conditions = [];

		if (offer.min_product_weight) {
			conditions.push(`Min: ${offer.min_product_weight}gm`);
		}
		if (offer.min_product_mrp) {
			conditions.push(`Min MRP: ₹${offer.min_product_mrp}`);
		}

		const conditionText =
			conditions.length > 0 ? conditions.join(" | ") : "No conditions";

		if (offer.offer_type === "free_item") {
			let freeItemText = "";
			if (offer.free_item_type === "same_product") {
				freeItemText = `Get ${offer.free_item_quantity} ${offer.products?.weight ? "gm" : "unit(s)"} of same product free`;
			} else if (offer.free_item_type === "different_product") {
				freeItemText = `Get ${offer.free_item_quantity} ${offer.free_item_product?.product_name || "product"} free`;
			} else if (offer.free_item_type === "external") {
				freeItemText = `Get ${offer.free_item_quantity} ${offer.free_item_external_name} free`;
			}
			return `${conditionText} → ${freeItemText}`;
		} else if (offer.offer_type === "discount") {
			const discountText =
				offer.discount_type === "percentage"
					? `${offer.discount_value}% off`
					: `₹${offer.discount_value} off`;
			return `${conditionText} → ${discountText}`;
		}

		return conditionText;
	};

	const getOfferTypeBadge = (offerType) => {
		if (offerType === "free_item") {
			return (
				<span className="offer-type-badge offer-type-badge--free">
					🎁 Free Item
				</span>
			);
		} else if (offerType === "discount") {
			return (
				<span className="offer-type-badge offer-type-badge--discount">
					💰 Discount
				</span>
			);
		}
		return null;
	};

	return (
		<div className="view-offers-page">
			{/* Header Row */}
			<div className="page-header">
				<h2 className="page-heading">Manage Offers</h2>
				<button
					className="add-offer-header-btn"
					onClick={() => navigate("/admin/offers/add")}
				>
					<span className="btn-icon">+</span>
					Add Offer
				</button>
			</div>

			{/* Search and Filter Row */}
			<div className="search-filter-row">
				<div className="search-bar-wrapper">
					<input
						type="text"
						className="search-bar"
						placeholder="Search by product or company name..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
					<span className="search-icon">🔍</span>
				</div>

				<div className="filter-wrapper">
					<select
						className="filter-select"
						value={filterType}
						onChange={(e) => setFilterType(e.target.value)}
					>
						<option value="all">All Types</option>
						<option value="free_item">Free Items Only</option>
						<option value="discount">Discounts Only</option>
					</select>
				</div>

				<div className="filter-wrapper">
					<select
						className="filter-select"
						value={sortBy}
						onChange={(e) => setSortBy(e.target.value)}
					>
						<option value="all">All Status</option>
						<option value="active">Active Only</option>
						<option value="inactive">Inactive Only</option>
					</select>
				</div>
			</div>

			{/* Message Display */}
			{message.text && (
				<div className={`message message--${message.type}`}>{message.text}</div>
			)}

			{/* Loading State */}
			{loading ? (
				<div className="loading-state">
					<div className="spinner"></div>
					<p>Loading offers...</p>
				</div>
			) : (
				<>
					{/* Offers List */}
					<div className="offers-list">
						{filteredOffers.length > 0 ? (
							filteredOffers.map((offer) => (
								<div
									key={offer.id}
									className={`offer-row ${!offer.is_active ? "inactive" : ""}`}
								>
									{/* Offer Info */}
									<div className="offer-info-cell">
										<div className="offer-info-header">
											<h3 className="offer-product-name">
												{getOfferDisplayName(offer)}
											</h3>
											{getOfferTypeBadge(offer.offer_type)}
										</div>
										<p className="offer-company">
											{offer.companies?.company_name ||
												offer.products?.companies?.company_name}
										</p>
										<p className="offer-details-text">
											{getOfferDetails(offer)}
										</p>

										{/* Pool Info (if free_item type) */}
										{offer.offer_type === "free_item" &&
											offer.offer_pool &&
											offer.offer_pool.length > 0 && (
												<div className="offer-pool-info">
													<span className="pool-badge">
														🏊 Pool: {offer.offer_pool[0].accumulated_quantity}{" "}
														items
													</span>
												</div>
											)}
									</div>

									{/* Actions */}
									<div className="offer-actions-cell">
										{/* Toggle Active */}
										<label className="toggle-wrapper">
											<input
												type="checkbox"
												checked={offer.is_active}
												onChange={() =>
													handleToggleActive(offer.id, offer.is_active)
												}
											/>
											<span
												className={`toggle-slider ${offer.is_active ? "checked" : ""}`}
											></span>
											<span className="toggle-text">
												{offer.is_active ? "Active" : "Inactive"}
											</span>
										</label>

										{/* Delete Button */}
										<button
											className="delete-offer-btn"
											onClick={() => handleDeleteOffer(offer.id)}
										>
											🗑️ Delete
										</button>
									</div>
								</div>
							))
						) : (
							<div className="no-results">
								<p>No offers found</p>
								{searchQuery && (
									<p className="no-results-hint">Try a different search term</p>
								)}
							</div>
						)}
					</div>
				</>
			)}
		</div>
	);
}

export default ViewOffers;
