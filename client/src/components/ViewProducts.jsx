import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ViewProducts.css";

function ViewProducts() {
	const navigate = useNavigate();
	const [products, setProducts] = useState([]);
	const [filteredProducts, setFilteredProducts] = useState([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [sortBy, setSortBy] = useState("all");
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState({ type: "", text: "" });
	const [expandedProduct, setExpandedProduct] = useState(null);
	const [selectedProductOffers, setSelectedProductOffers] = useState(null);
	const [showOfferModal, setShowOfferModal] = useState(false);
	const [deletingProductId, setDeletingProductId] = useState(null);

	useEffect(() => {
		fetchProducts();
	}, []);

	useEffect(() => {
		let filtered = [...products];

		if (searchQuery.trim() !== "") {
			filtered = filtered.filter(
				(product) =>
					product.product_name
						.toLowerCase()
						.includes(searchQuery.toLowerCase()) ||
					product.companies?.company_name
						.toLowerCase()
						.includes(searchQuery.toLowerCase()),
			);
		}

		if (sortBy !== "all") {
			const gstValue = parseFloat(sortBy);
			filtered = filtered.filter(
				(product) => product.gst_percentage === gstValue,
			);
		}

		setFilteredProducts(filtered);
	}, [searchQuery, sortBy, products]);

	const fetchProducts = async () => {
		try {
			setLoading(true);
			const response = await fetch("http://localhost:5000/api/products");
			const data = await response.json();

			if (data.success) {
				setProducts(data.data);
				setFilteredProducts(data.data);
			} else {
				setMessage({ type: "error", text: "Failed to load products" });
			}
		} catch (error) {
			console.error("Error fetching products:", error);
			setMessage({ type: "error", text: "Network error. Please try again." });
		} finally {
			setLoading(false);
		}
	};

	const fetchProductOffers = async (productId) => {
		try {
			const response = await fetch("http://localhost:5000/api/offers");
			const data = await response.json();

			if (data.success) {
				const productOffers = data.data.filter(
					(offer) => offer.product_id === productId,
				);
				setSelectedProductOffers(productOffers);
				setShowOfferModal(true);
			}
		} catch (error) {
			console.error("Error fetching offers:", error);
			setMessage({ type: "error", text: "Failed to load offers" });
		}
	};

	const handleToggleOfferActive = async (offerId, currentStatus, productId) => {
		try {
			const response = await fetch(
				`http://localhost:5000/api/offers/${offerId}`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ is_active: !currentStatus }),
				},
			);

			if (response.ok) {
				setSelectedProductOffers((prevOffers) =>
					prevOffers.map((offer) =>
						offer.id === offerId
							? { ...offer, is_active: !currentStatus }
							: offer,
					),
				);

				await fetchProducts();

				setMessage({
					type: "success",
					text: `Offer ${!currentStatus ? "activated" : "deactivated"}!`,
				});
				setTimeout(() => setMessage({ type: "", text: "" }), 3000);
			}
		} catch (error) {
			console.error("Error toggling offer:", error);
		}
	};

	const handleSearchChange = (e) => {
		setSearchQuery(e.target.value);
	};

	const handleSortChange = (e) => {
		setSortBy(e.target.value);
	};

	const toggleAccordion = (productId) => {
		setExpandedProduct(expandedProduct === productId ? null : productId);
	};

	const closeOfferModal = () => {
		setShowOfferModal(false);
		setSelectedProductOffers(null);
	};

	const formatOfferDetails = (offer) => {
		const details = [];
		if (offer.min_product_weight)
			details.push(`Min: ${offer.min_product_weight}gm`);
		if (offer.min_product_mrp)
			details.push(`Min MRP: ₹${offer.min_product_mrp}`);
		if (offer.offer_item) details.push(`Free: ${offer.offer_item}`);
		if (offer.offer_discount)
			details.push(`Discount: ₹${offer.offer_discount}`);
		return details.length > 0 ? details.join(" | ") : "No details";
	};

	// ✅ Navigation handlers using React Router
	const handleAddProduct = () => {
		navigate("/admin/products/add");
	};

	const handleEditProduct = (productId) => {
		navigate(`/admin/products/edit/${productId}`);
	};

	// ✅ Delete handler (unchanged)
	const handleDelete = async (productId, productName) => {
		const confirmed = window.confirm(
			`Are you sure you want to delete "${productName}"?\n\n⚠️ This will also delete all offers associated with this product!`,
		);

		if (!confirmed) return;

		try {
			setDeletingProductId(productId);
			const response = await fetch(
				`http://localhost:5000/api/products/${productId}`,
				{
					method: "DELETE",
				},
			);

			const data = await response.json();

			if (response.ok) {
				setMessage({
					type: "success",
					text: data.message || "Product deleted successfully!",
				});
				await fetchProducts();
				setTimeout(() => setMessage({ type: "", text: "" }), 3000);
			} else {
				setMessage({
					type: "error",
					text: data.error || "Failed to delete product",
				});
				setTimeout(() => setMessage({ type: "", text: "" }), 5000);
			}
		} catch (error) {
			console.error("Error deleting product:", error);
			setMessage({
				type: "error",
				text: "Network error. Please try again.",
			});
			setTimeout(() => setMessage({ type: "", text: "" }), 5000);
		} finally {
			setDeletingProductId(null);
		}
	};

	return (
		<div className="view-products-page">
			{/* Header */}
			<div className="page-header">
				<h2 className="page-heading">Manage Products</h2>
				<button className="add-product-header-btn" onClick={handleAddProduct}>
					<span className="btn-icon">+</span>
					Add Product
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
						<option value="all">All GST</option>
						<option value="5">5% GST</option>
						<option value="12">12% GST</option>
						<option value="18">18% GST</option>
						<option value="28">28% GST</option>
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
					<p>Loading products...</p>
				</div>
			) : (
				<>
					{/* Products List */}
					<div className="products-list">
						{filteredProducts.length > 0 ? (
							filteredProducts.map((product) => (
								<div key={product.id} className="product-accordion">
									{/* Collapsed Row */}
									<div
										className="product-row"
										onClick={() => toggleAccordion(product.id)}
									>
										{/* Product Image */}
										<div className="product-image-cell">
											{product.product_images &&
											product.product_images.length > 0 ? (
												<img
													src={product.product_images[0]}
													alt={product.product_name}
													className="product-image"
												/>
											) : (
												<div className="product-image-placeholder">
													{product.product_name.charAt(0).toUpperCase()}
												</div>
											)}
										</div>

										{/* Product Name */}
										<div className="product-name-cell">
											<h3>{product.product_name}</h3>
											<span className="product-company">
												{product.companies?.company_name}
											</span>
										</div>

										{/* Weight */}
										<div className="product-info-cell">
											<span className="info-label">Weight</span>
											<span className="info-value">
												{product.weight ? `${product.weight}gm` : "N/A"}
											</span>
										</div>

										{/* MRP */}
										<div className="product-info-cell">
											<span className="info-label">MRP</span>
											<span className="info-value">₹{product.mrp}</span>
										</div>

										{/* Selling Price */}
										<div className="product-info-cell">
											<span className="info-label">Selling</span>
											<span className="info-value price-highlight">
												₹{product.selling_price}
											</span>
										</div>

										{/* GST */}
										<div className="product-info-cell">
											<span className="info-label">GST</span>
											<span className="info-value">
												{product.gst_percentage || 0}%
											</span>
										</div>

										{/* Offer Button */}
										<div className="product-offer-cell">
											<button
												className={`offer-btn ${product.has_offer ? "has-offer" : ""}`}
												onClick={(e) => {
													e.stopPropagation();
													fetchProductOffers(product.id);
												}}
											>
												{product.has_offer ? "🎁 View" : "➕ Add"}
											</button>
										</div>

										{/* Action Buttons */}
										<div className="product-action-cell">
											<button
												className="edit-btn"
												onClick={(e) => {
													e.stopPropagation();
													handleEditProduct(product.id);
												}}
											>
												Edit
											</button>
											<button
												className="delete-btn"
												onClick={(e) => {
													e.stopPropagation();
													handleDelete(product.id, product.product_name);
												}}
												disabled={deletingProductId === product.id}
											>
												{deletingProductId === product.id
													? "Deleting..."
													: "Delete"}
											</button>
										</div>

										{/* Expand Arrow */}
										<div className="expand-arrow-cell">
											<span
												className={`expand-arrow ${expandedProduct === product.id ? "expanded" : ""}`}
											>
												▼
											</span>
										</div>
									</div>

									{/* Expanded Details */}
									{expandedProduct === product.id && (
										<div className="product-details-expanded">
											<div className="details-grid">
												{/* All Images */}
												{product.product_images &&
													product.product_images.length > 1 && (
														<div className="detail-section full-width">
															<h4 className="detail-heading">Product Images</h4>
															<div className="product-images-grid">
																{product.product_images.map((img, index) => (
																	<img
																		key={index}
																		src={img}
																		alt={`${product.product_name} ${index + 1}`}
																		className="detail-image"
																	/>
																))}
															</div>
														</div>
													)}

												{/* Pricing Details */}
												<div className="detail-section">
													<h4 className="detail-heading">Pricing</h4>
													<div className="detail-item">
														<span className="detail-label">MRP:</span>
														<span className="detail-value">₹{product.mrp}</span>
													</div>
													<div className="detail-item">
														<span className="detail-label">Buying Price:</span>
														<span className="detail-value">
															₹{product.buying_price}
														</span>
													</div>
													<div className="detail-item">
														<span className="detail-label">Selling Price:</span>
														<span className="detail-value highlight">
															₹{product.selling_price}
														</span>
													</div>
													<div className="detail-item">
														<span className="detail-label">GST:</span>
														<span className="detail-value">
															{product.gst_percentage || 0}%
														</span>
													</div>
												</div>

												{/* Other Details */}
												<div className="detail-section">
													<h4 className="detail-heading">Other Info</h4>
													<div className="detail-item">
														<span className="detail-label">Weight:</span>
														<span className="detail-value">
															{product.weight ? `${product.weight}gm` : "N/A"}
														</span>
													</div>
													<div className="detail-item">
														<span className="detail-label">Items per Box:</span>
														<span className="detail-value">
															{product.items_per_box || "N/A"}
														</span>
													</div>
													<div className="detail-item">
														<span className="detail-label">Has Offer:</span>
														<span className="detail-value">
															{product.has_offer ? "Yes" : "No"}
														</span>
													</div>
													<div className="detail-item">
														<span className="detail-label">Added:</span>
														<span className="detail-value">
															{new Date(
																product.created_at,
															).toLocaleDateString()}
														</span>
													</div>
												</div>

												{/* Description */}
												{product.product_desc && (
													<div className="detail-section full-width">
														<h4 className="detail-heading">Description</h4>
														<p className="product-description">
															{product.product_desc}
														</p>
													</div>
												)}
											</div>
										</div>
									)}
								</div>
							))
						) : (
							<div className="no-results">
								<p>No products found</p>
								{searchQuery && (
									<p className="no-results-hint">Try a different search term</p>
								)}
							</div>
						)}
					</div>
				</>
			)}

			{/* Offer Modal */}
			{showOfferModal && (
				<div className="modal-overlay" onClick={closeOfferModal}>
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h3>Product Offers</h3>
							<button className="modal-close-btn" onClick={closeOfferModal}>
								✕
							</button>
						</div>
						<div className="modal-body">
							{selectedProductOffers && selectedProductOffers.length > 0 ? (
								selectedProductOffers.map((offer) => (
									<div key={offer.id} className="modal-offer-item">
										<div className="modal-offer-details">
											<p className="modal-offer-text">
												{formatOfferDetails(offer)}
											</p>
										</div>
										<label className="modal-toggle-wrapper">
											<input
												type="checkbox"
												checked={offer.is_active}
												onChange={() =>
													handleToggleOfferActive(
														offer.id,
														offer.is_active,
														offer.product_id,
													)
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
								))
							) : (
								<p className="no-offers-message">
									No offers available for this product
								</p>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default ViewProducts;
