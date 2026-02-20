import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ViewOffers.css";

function ViewOffers() {
	const navigate = useNavigate();
	const [offers, setOffers] = useState([]);
	const [filteredOffers, setFilteredOffers] = useState([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [sortBy, setSortBy] = useState("all");
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState({ type: "", text: "" });
	const [deletingOfferId, setDeletingOfferId] = useState(null);

	useEffect(() => {
		fetchOffers();
	}, []);

	useEffect(() => {
		let filtered = [...offers];

		if (searchQuery.trim() !== "") {
			filtered = filtered.filter((offer) => {
				const productName = offer.products?.product_name || "";
				const companyName =
					offer.products?.companies?.company_name ||
					offer.companies?.company_name ||
					"";

				return (
					productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
					companyName.toLowerCase().includes(searchQuery.toLowerCase())
				);
			});
		}

		if (sortBy === "active") {
			filtered = filtered.filter((offer) => offer.is_active === true);
		} else if (sortBy === "inactive") {
			filtered = filtered.filter((offer) => offer.is_active === false);
		}

		filtered.sort((a, b) => {
			if (a.is_active && !b.is_active) return -1;
			if (!a.is_active && b.is_active) return 1;
			return 0;
		});

		setFilteredOffers(filtered);
	}, [searchQuery, sortBy, offers]);

	const fetchOffers = async () => {
		try {
			setLoading(true);
			const response = await fetch("http://localhost:5000/api/offers");
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

	const handleSearchChange = (e) => {
		setSearchQuery(e.target.value);
	};

	const handleSortChange = (e) => {
		setSortBy(e.target.value);
	};

	const handleToggleActive = async (offerId, currentStatus) => {
		try {
			const response = await fetch(
				`http://localhost:5000/api/offers/${offerId}`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ is_active: !currentStatus }),
				},
			);

			const data = await response.json();

			if (response.ok) {
				setOffers((prevOffers) =>
					prevOffers.map((offer) =>
						offer.id === offerId
							? { ...offer, is_active: !currentStatus }
							: offer,
					),
				);

				await fetchOffers();

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

	const getOfferDisplayName = (offer) => {
		if (offer.products) {
			return offer.products.product_name;
		} else if (offer.companies) {
			return `${offer.companies.company_name} (Company-wide)`;
		}
		return "Unknown";
	};

	const getCompanyName = (offer) => {
		if (offer.products?.companies) {
			return offer.products.companies.company_name;
		} else if (offer.companies) {
			return offer.companies.company_name;
		}
		return "N/A";
	};

	const formatOfferDetails = (offer) => {
		const details = [];

		if (offer.min_product_weight) {
			details.push(`Min: ${offer.min_product_weight}gm`);
		}
		if (offer.min_product_mrp) {
			details.push(`Min MRP: ₹${offer.min_product_mrp}`);
		}
		if (offer.offer_item) {
			details.push(`Free: ${offer.offer_item}`);
		}
		if (offer.offer_discount) {
			details.push(`Discount: ₹${offer.offer_discount}`);
		}

		return details.length > 0 ? details.join(" | ") : "No details";
	};

	// ✅ Navigation handler using React Router
	const handleAddOffer = () => {
		navigate("/admin/offers/add");
	};

	// ✅ Delete handler (unchanged)
	const handleDelete = async (offerId, offerName) => {
		const confirmed = window.confirm(
			`Are you sure you want to delete the offer for "${offerName}"?`,
		);

		if (!confirmed) return;

		try {
			setDeletingOfferId(offerId);
			const response = await fetch(
				`http://localhost:5000/api/offers/${offerId}`,
				{
					method: "DELETE",
				},
			);

			const data = await response.json();

			if (response.ok) {
				setMessage({
					type: "success",
					text: data.message || "Offer deleted successfully!",
				});
				await fetchOffers();
				setTimeout(() => setMessage({ type: "", text: "" }), 3000);
			} else {
				setMessage({
					type: "error",
					text: data.error || "Failed to delete offer",
				});
				setTimeout(() => setMessage({ type: "", text: "" }), 5000);
			}
		} catch (error) {
			console.error("Error deleting offer:", error);
			setMessage({
				type: "error",
				text: "Network error. Please try again.",
			});
			setTimeout(() => setMessage({ type: "", text: "" }), 5000);
		} finally {
			setDeletingOfferId(null);
		}
	};

	return (
		<div className="view-offers-page">
			{/* Header Row */}
			<div className="page-header">
				<h2 className="page-heading">Manage Offers</h2>
				<button className="add-offer-header-btn" onClick={handleAddOffer}>
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
						onChange={handleSearchChange}
					/>
					<span className="search-icon">🔍</span>
				</div>

				<div className="filter-wrapper">
					<select
						className="filter-select"
						value={sortBy}
						onChange={handleSortChange}
					>
						<option value="all">All Offers</option>
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
									{/* Product/Company Name */}
									<div className="offer-name-cell">
										<h3>{getOfferDisplayName(offer)}</h3>
										<span className="offer-company">
											{getCompanyName(offer)}
										</span>
									</div>

									{/* Offer Details */}
									<div className="offer-details-cell">
										<p className="offer-details-text">
											{formatOfferDetails(offer)}
										</p>
									</div>

									{/* Active Toggle */}
									<div className="offer-toggle-cell">
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
									</div>

									{/* Delete Button */}
									<div className="offer-delete-cell">
										<button
											className="delete-btn"
											onClick={() =>
												handleDelete(offer.id, getOfferDisplayName(offer))
											}
											disabled={deletingOfferId === offer.id}
										>
											{deletingOfferId === offer.id ? "Deleting..." : "Delete"}
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
