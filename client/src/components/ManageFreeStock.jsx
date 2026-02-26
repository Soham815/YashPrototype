import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ManageFreeStock.css";
import { API_BASE_URL } from "../config/api";

function ManageFreeStock() {
	const navigate = useNavigate();
	const [searchQuery, setSearchQuery] = useState("");
	const [allProducts, setAllProducts] = useState([]);
	const [filteredProducts, setFilteredProducts] = useState([]);
	const [showDropdown, setShowDropdown] = useState(false);
	const [selectedProduct, setSelectedProduct] = useState(null);
	const [currentFreeStock, setCurrentFreeStock] = useState(null);
	const [currentRegularStock, setCurrentRegularStock] = useState(null);

	// Form states
	const [quantity, setQuantity] = useState("");
	const [reasonType, setReasonType] = useState("new_shipment");
	const [reasonNote, setReasonNote] = useState("");

	const [loading, setLoading] = useState(false);
	const [fetchingStock, setFetchingStock] = useState(false);
	const [message, setMessage] = useState({ type: "", text: "" });
	const [recentlyUpdated, setRecentlyUpdated] = useState([]);
	const [showActivationPopup, setShowActivationPopup] = useState(false);
	const [inactiveOffers, setInactiveOffers] = useState([]);

	const searchRef = useRef(null);
	const dropdownRef = useRef(null);

	useEffect(() => {
		fetchAllProducts();
		fetchRecentlyUpdated();
	}, []);

	useEffect(() => {
		const handleClickOutside = (e) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target) &&
				!searchRef.current.contains(e.target)
			) {
				setShowDropdown(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	useEffect(() => {
		if (searchQuery.trim() === "") {
			setFilteredProducts([]);
			setShowDropdown(false);
			return;
		}

		const filtered = allProducts.filter(
			(p) =>
				p.products.product_name
					.toLowerCase()
					.includes(searchQuery.toLowerCase()) ||
				p.products.companies?.company_name
					.toLowerCase()
					.includes(searchQuery.toLowerCase()),
		);

		setFilteredProducts(filtered);
		setShowDropdown(true);
	}, [searchQuery, allProducts]);

	const fetchAllProducts = async () => {
		try {
			const response = await fetch(`${API_BASE_URL}/free-stock`);
			const data = await response.json();
			if (data.success) {
				setAllProducts(data.data);
			}
		} catch (error) {
			console.error("Error fetching products:", error);
		}
	};

	const fetchRecentlyUpdated = async () => {
		try {
			const response = await fetch(`${API_BASE_URL}/free-stock`);
			const data = await response.json();
			if (data.success) {
				const recent = data.data
					.sort((a, b) => new Date(b.last_updated) - new Date(a.last_updated))
					.slice(0, 5);
				setRecentlyUpdated(recent);
			}
		} catch (error) {
			console.error("Error fetching recent:", error);
		}
	};

	const handleSelectProduct = async (stockItem) => {
		setSelectedProduct(stockItem);
		setSearchQuery(stockItem.products.product_name);
		setShowDropdown(false);
		setFetchingStock(true);

		try {
			// Fetch free stock
			const freeResponse = await fetch(
				`${API_BASE_URL}/free-stock/product/${stockItem.product_id}`,
			);
			const freeData = await freeResponse.json();

			// Fetch regular stock for reference
			const regularResponse = await fetch(
				`${API_BASE_URL}/stock/product/${stockItem.product_id}`,
			);
			const regularData = await regularResponse.json();

			if (freeData.success) {
				setCurrentFreeStock(freeData.data);
			}

			if (regularData.success) {
				setCurrentRegularStock(regularData.data);
			}
		} catch (error) {
			console.error("Error fetching stock:", error);
		} finally {
			setFetchingStock(false);
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!selectedProduct) return;

		if (quantity === "" || parseInt(quantity) <= 0) {
			setMessage({ type: "error", text: "Please enter a valid quantity" });
			return;
		}

		if (reasonType === "other" && reasonNote.trim() === "") {
			setMessage({
				type: "error",
				text: "Please provide a reason for 'Other'",
			});
			return;
		}

		setLoading(true);
		setMessage({ type: "", text: "" });

		try {
			const response = await fetch(
				`${API_BASE_URL}/free-stock/${selectedProduct.product_id}/add`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						quantity: parseInt(quantity),
						reason_type: reasonType,
						reason_note: reasonType === "other" ? reasonNote : null,
					}),
				},
			);

			const data = await response.json();

			if (response.ok) {
				const newQty =
					currentFreeStock.free_stock_quantity + parseInt(quantity);

				setMessage({
					type: "success",
					text: `Added ${quantity} units to free stock! New quantity: ${newQty} units`,
				});

				setCurrentFreeStock((prev) => ({
					...prev,
					free_stock_quantity: newQty,
				}));

				// Reset form
				setQuantity("");
				setReasonNote("");

				await fetchAllProducts();
				await fetchRecentlyUpdated();

				// Check for inactive offers
				if (data.inactive_offers && data.inactive_offers.length > 0) {
					setInactiveOffers(data.inactive_offers);
					setShowActivationPopup(true);
				}

				setTimeout(() => setMessage({ type: "", text: "" }), 4000);
			} else {
				setMessage({ type: "error", text: data.error || "Operation failed" });
			}
		} catch (error) {
			console.error("Error:", error);
			setMessage({ type: "error", text: "Network error. Please try again." });
		} finally {
			setLoading(false);
		}
	};

	const handleActivateOffers = async () => {
		// This will be implemented when we update the offers system
		setShowActivationPopup(false);
		setMessage({
			type: "success",
			text: "You can now activate these offers from the Offers page",
		});
	};

	const handleClearSelection = () => {
		setSelectedProduct(null);
		setCurrentFreeStock(null);
		setCurrentRegularStock(null);
		setSearchQuery("");
		setQuantity("");
		setReasonNote("");
		setReasonType("new_shipment");
		setMessage({ type: "", text: "" });
	};

	const getStockStatus = (freeQty, allocated) => {
		const available = freeQty - allocated;
		if (available === 0) return "out";
		if (available < 100) return "low";
		return "in";
	};

	return (
		<div className="manage-free-stock-page">
			<div className="manage-free-stock__header">
				<div>
					<h2 className="manage-free-stock__title">Manage Free Stock</h2>
					<p className="manage-free-stock__subtitle">
						Manage inventory for promotional and offer items
					</p>
				</div>
				<button
					className="free-stock-history-btn"
					onClick={() => navigate("/admin/free-stock/history")}
				>
					📋 View History
				</button>
			</div>

			<div className="manage-free-stock__body">
				{/* Left Panel */}
				<div className="manage-free-stock__left">
					{/* Search Section */}
					<div className="free-stock-search-section">
						<div className="free-stock-search-wrapper">
							<div className="free-stock-search-input-row" ref={searchRef}>
								<input
									type="text"
									className="free-stock-search__input"
									placeholder="Search product by name or company..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									onFocus={() => {
										if (filteredProducts.length > 0) setShowDropdown(true);
									}}
								/>
								<span className="free-stock-search__icon">🔍</span>
								{searchQuery && (
									<button
										className="free-stock-search__clear"
										type="button"
										onClick={handleClearSelection}
									>
										✕
									</button>
								)}
							</div>

							{/* Dropdown Results */}
							{showDropdown && (
								<div className="free-stock-search__dropdown" ref={dropdownRef}>
									{filteredProducts.length > 0 ? (
										filteredProducts.map((item) => {
											const status = getStockStatus(
												item.free_stock_quantity,
												item.allocated_to_offers,
											);
											return (
												<div
													key={item.id}
													className="free-stock-search__result"
													onClick={() => handleSelectProduct(item)}
												>
													<div className="free-stock-search__result-img">
														{item.products.product_images?.[0] ? (
															<img
																src={item.products.product_images[0]}
																alt={item.products.product_name}
															/>
														) : (
															<div className="free-stock-search__result-placeholder">
																{item.products.product_name
																	.charAt(0)
																	.toUpperCase()}
															</div>
														)}
													</div>
													<div className="free-stock-search__result-info">
														<p className="free-stock-search__result-name">
															{item.products.product_name}
														</p>
														<p className="free-stock-search__result-company">
															{item.products.companies?.company_name}
														</p>
													</div>
													<div className="free-stock-search__result-right">
														<span className="free-stock-search__result-qty">
															{item.free_stock_quantity} units
														</span>
														<span className="free-stock-search__result-available">
															{item.available} available
														</span>
													</div>
												</div>
											);
										})
									) : (
										<div className="free-stock-search__no-results">
											No products found
										</div>
									)}
								</div>
							)}
						</div>
					</div>

					{/* Add Free Stock Form */}
					{selectedProduct && (
						<div className="free-stock-form-container">
							{/* Product Preview */}
							<div className="free-stock-product-preview">
								<div className="free-stock-product-preview__img">
									{selectedProduct.products.product_images?.[0] ? (
										<img
											src={selectedProduct.products.product_images[0]}
											alt={selectedProduct.products.product_name}
										/>
									) : (
										<div className="free-stock-product-preview__placeholder">
											{selectedProduct.products.product_name
												.charAt(0)
												.toUpperCase()}
										</div>
									)}
								</div>
								<div className="free-stock-product-preview__info">
									<p className="free-stock-product-preview__company">
										{selectedProduct.products.companies?.company_name}
									</p>
									<h3 className="free-stock-product-preview__name">
										{selectedProduct.products.product_name}
									</h3>
									<p className="free-stock-product-preview__price">
										₹{selectedProduct.products.selling_price}
									</p>
								</div>
								<button
									type="button"
									className="free-stock-product-preview__clear"
									onClick={handleClearSelection}
								>
									✕
								</button>
							</div>

							{/* Current Stock Display */}
							{fetchingStock ? (
								<div className="free-stock-loading">
									<div className="spinner"></div>
									<p>Fetching stock information...</p>
								</div>
							) : (
								currentFreeStock && (
									<>
										<div className="stock-comparison">
											<div className="stock-comparison__item stock-comparison__item--regular">
												<span className="stock-comparison__label">
													Regular Stock
												</span>
												<span className="stock-comparison__value">
													{currentRegularStock?.quantity || 0} units
												</span>
												<span className="stock-comparison__note">
													(For sale)
												</span>
											</div>
											<div className="stock-comparison__item stock-comparison__item--free">
												<span className="stock-comparison__label">
													Free Stock
												</span>
												<span className="stock-comparison__value">
													{currentFreeStock.free_stock_quantity} units
												</span>
												<span className="stock-comparison__note">
													(For offers)
												</span>
											</div>
										</div>

										<div className="free-stock-breakdown">
											<div className="free-stock-breakdown__row">
												<span className="free-stock-breakdown__label">
													Total Free Stock:
												</span>
												<span className="free-stock-breakdown__value">
													{currentFreeStock.free_stock_quantity} units
												</span>
											</div>
											<div className="free-stock-breakdown__row">
												<span className="free-stock-breakdown__label">
													Allocated to Offers:
												</span>
												<span className="free-stock-breakdown__value free-stock-breakdown__value--allocated">
													{currentFreeStock.allocated_to_offers} units
												</span>
											</div>
											<div className="free-stock-breakdown__row free-stock-breakdown__row--available">
												<span className="free-stock-breakdown__label">
													Available for New Offers:
												</span>
												<span className="free-stock-breakdown__value free-stock-breakdown__value--available">
													{currentFreeStock.available} units
												</span>
											</div>
										</div>

										{/* Add Form */}
										<form onSubmit={handleSubmit} className="free-stock-form">
											<div className="free-stock-form__group">
												<label className="free-stock-form__label">
													Quantity to Add *
												</label>
												<div className="free-stock-form__input-wrapper">
													<input
														type="number"
														className="free-stock-form__input"
														placeholder="e.g., 100"
														value={quantity}
														onChange={(e) => setQuantity(e.target.value)}
														min="1"
														required
													/>
													<span className="free-stock-form__unit">units</span>
												</div>

												{/* Preview */}
												{quantity !== "" && (
													<div className="free-stock-form__preview">
														After addition:{" "}
														<strong>
															{currentFreeStock.free_stock_quantity +
																parseInt(quantity || 0)}{" "}
															units
														</strong>
													</div>
												)}
											</div>

											{/* Reason Type */}
											<div className="free-stock-form__group">
												<label className="free-stock-form__label">
													Reason *
												</label>
												<div className="reason-radio-group">
													<label className="reason-radio">
														<input
															type="radio"
															name="reason"
															value="new_shipment"
															checked={reasonType === "new_shipment"}
															onChange={(e) => setReasonType(e.target.value)}
														/>
														<span className="reason-radio__text">
															📦 New Shipment
														</span>
													</label>

													<label className="reason-radio">
														<input
															type="radio"
															name="reason"
															value="returns"
															checked={reasonType === "returns"}
															onChange={(e) => setReasonType(e.target.value)}
														/>
														<span className="reason-radio__text">
															↩️ Returns
														</span>
													</label>

													<label className="reason-radio">
														<input
															type="radio"
															name="reason"
															value="other"
															checked={reasonType === "other"}
															onChange={(e) => setReasonType(e.target.value)}
														/>
														<span className="reason-radio__text">✏️ Other</span>
													</label>
												</div>

												{/* Other Reason Input */}
												{reasonType === "other" && (
													<input
														type="text"
														className="free-stock-form__input"
														placeholder="Specify reason..."
														value={reasonNote}
														onChange={(e) => setReasonNote(e.target.value)}
														required
														style={{ marginTop: "1rem" }}
													/>
												)}
											</div>

											{message.text && (
												<div className={`message message--${message.type}`}>
													{message.text}
												</div>
											)}

											<button
												type="submit"
												className="free-stock-submit-btn"
												disabled={loading}
											>
												{loading ? "Adding..." : "Add to Free Stock"}
											</button>
										</form>
									</>
								)
							)}
						</div>
					)}

					{!selectedProduct && (
						<div className="free-stock-empty-state">
							<div className="free-stock-empty-state__icon">🎁</div>
							<h3>Search for a product above</h3>
							<p>Select a product to manage its free stock</p>
						</div>
					)}
				</div>

				{/* Right Panel */}
				<div className="manage-free-stock__right">
					<h3 className="recent-updates__title">Recently Updated</h3>
					<div className="recent-updates__list">
						{recentlyUpdated.length > 0 ? (
							recentlyUpdated.map((item) => (
								<div
									key={item.id}
									className="recent-update-card"
									onClick={() => handleSelectProduct(item)}
								>
									<div className="recent-update-card__img">
										{item.products.product_images?.[0] ? (
											<img
												src={item.products.product_images[0]}
												alt={item.products.product_name}
											/>
										) : (
											<div className="recent-update-card__placeholder">
												{item.products.product_name.charAt(0).toUpperCase()}
											</div>
										)}
									</div>
									<div className="recent-update-card__info">
										<p className="recent-update-card__name">
											{item.products.product_name}
										</p>
										<p className="recent-update-card__company">
											{item.products.companies?.company_name}
										</p>
										<div className="recent-update-card__bottom">
											<span className="recent-update-card__qty">
												{item.free_stock_quantity} units
											</span>
											<span className="recent-update-card__available">
												{item.available} free
											</span>
										</div>
									</div>
								</div>
							))
						) : (
							<p className="recent-updates__empty">No updates yet</p>
						)}
					</div>

					{/* Quick Actions */}
					<div className="free-stock-quick-actions">
						<h3 className="free-stock-quick-actions__title">Quick Actions</h3>
						<button
							className="quick-action-btn quick-action-btn--pool"
							onClick={() => navigate("/admin/offer-pool")}
						>
							🏊 View Offer Pool
						</button>
						<button
							className="quick-action-btn quick-action-btn--history"
							onClick={() => navigate("/admin/free-stock/history")}
						>
							📋 View Full History
						</button>
					</div>
				</div>
			</div>

			{/* Offer Activation Popup */}
			{showActivationPopup && (
				<div
					className="modal-overlay"
					onClick={() => setShowActivationPopup(false)}
				>
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h3>🎉 Offers Can Be Activated!</h3>
							<button
								className="modal-close-btn"
								onClick={() => setShowActivationPopup(false)}
							>
								✕
							</button>
						</div>
						<div className="modal-body">
							<p>
								Free stock has been replenished. The following inactive offers
								can now be activated:
							</p>
							<div className="inactive-offers-list">
								{inactiveOffers.map((offer) => (
									<div key={offer.id} className="inactive-offer-item">
										Offer #{offer.id}
									</div>
								))}
							</div>
							<p className="modal-note">
								Go to the Offers page to activate these offers.
							</p>
						</div>
						<div className="modal-actions">
							<button
								className="modal-btn modal-btn--primary"
								onClick={() => navigate("/admin/offers")}
							>
								Go to Offers
							</button>
							<button
								className="modal-btn modal-btn--secondary"
								onClick={() => setShowActivationPopup(false)}
							>
								Later
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default ManageFreeStock;
