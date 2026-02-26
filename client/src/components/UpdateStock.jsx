import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/UpdateStock.css";
import { API_BASE_URL } from "../config/api";

function UpdateStock() {
	const navigate = useNavigate();
	const [searchQuery, setSearchQuery] = useState("");
	const [allProducts, setAllProducts] = useState([]);
	const [filteredProducts, setFilteredProducts] = useState([]);
	const [showDropdown, setShowDropdown] = useState(false);
	const [selectedProduct, setSelectedProduct] = useState(null);
	const [currentStock, setCurrentStock] = useState(null);

	// Form states
	const [actionType, setActionType] = useState("add"); // 'add' or 'update'
	const [quantity, setQuantity] = useState("");
	const [reasonType, setReasonType] = useState("new_shipment");
	const [reasonNote, setReasonNote] = useState("");
	const [adminPin, setAdminPin] = useState("");
	const [newThreshold, setNewThreshold] = useState("");

	const [loading, setLoading] = useState(false);
	const [fetchingStock, setFetchingStock] = useState(false);
	const [message, setMessage] = useState({ type: "", text: "" });
	const [recentlyUpdated, setRecentlyUpdated] = useState([]);

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
			const response = await fetch(`${API_BASE_URL}/stock`);
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
			const response = await fetch(`${API_BASE_URL}/stock`);
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
			const response = await fetch(
				`${API_BASE_URL}/stock/product/${stockItem.product_id}`,
			);
			const data = await response.json();

			if (data.success) {
				setCurrentStock(data.data);
				setNewThreshold(data.data.low_stock_threshold.toString());
			}
		} catch (error) {
			console.error("Error fetching stock:", error);
		} finally {
			setFetchingStock(false);
		}
	};

	const getStockStatus = (quantity, threshold) => {
		if (quantity === 0) return "out";
		if (quantity < threshold) return "low";
		return "in";
	};

	const getStockLabel = (quantity, threshold) => {
		if (quantity === 0) return "Out of Stock";
		if (quantity < threshold) return "Low Stock";
		return "In Stock";
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

		if (actionType === "update" && adminPin.trim() === "") {
			setMessage({ type: "error", text: "PIN is required for updating stock" });
			return;
		}

		setLoading(true);
		setMessage({ type: "", text: "" });

		try {
			const endpoint =
				actionType === "add"
					? `${API_BASE_URL}/stock/${selectedProduct.product_id}/add`
					: `${API_BASE_URL}/stock/${selectedProduct.product_id}/update`;

			const method = "POST";
			const body = {
				quantity: parseInt(quantity),
				reason_type: reasonType,
				reason_note: reasonType === "other" ? reasonNote : null,
				low_stock_threshold: parseInt(newThreshold) || 600,
			};

			if (actionType === "update") {
				body.admin_pin = adminPin;
			}

			const response = await fetch(endpoint, {
				method: actionType === "update" ? "PUT" : "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});

			const data = await response.json();

			if (response.ok) {
				const newQty =
					actionType === "add"
						? currentStock.quantity + parseInt(quantity)
						: parseInt(quantity);

				setMessage({
					type: "success",
					text: `Stock ${actionType === "add" ? "added" : "updated"} successfully! New quantity: ${newQty} units`,
				});

				setCurrentStock((prev) => ({
					...prev,
					quantity: newQty,
					low_stock_threshold: parseInt(newThreshold) || 600,
				}));

				// Reset form
				setQuantity("");
				setReasonNote("");
				setAdminPin("");

				await fetchAllProducts();
				await fetchRecentlyUpdated();

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

	const handleClearSelection = () => {
		setSelectedProduct(null);
		setCurrentStock(null);
		setSearchQuery("");
		setQuantity("");
		setReasonNote("");
		setAdminPin("");
		setNewThreshold("");
		setActionType("add");
		setReasonType("new_shipment");
		setMessage({ type: "", text: "" });
	};

	const handleViewHistory = () => {
		if (selectedProduct) {
			navigate(`/admin/stock/history/${selectedProduct.product_id}`);
		} else {
			navigate("/admin/stock/history");
		}
	};

	return (
		<div className="update-stock-page">
			<div className="update-stock__header">
				<h2 className="update-stock__title">Stock Management</h2>
				<button className="stock-history-btn" onClick={handleViewHistory}>
					📋 View Stock History
				</button>
			</div>

			<div className="update-stock__body">
				{/* Left Panel */}
				<div className="update-stock__left">
					{/* Search Section */}
					<div className="stock-search-section">
						<div className="stock-search-wrapper">
							<div className="stock-search-input-row" ref={searchRef}>
								<input
									type="text"
									className="stock-search__input"
									placeholder="Search product by name or company..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									onFocus={() => {
										if (filteredProducts.length > 0) setShowDropdown(true);
									}}
								/>
								<span className="stock-search__icon">🔍</span>
								{searchQuery && (
									<button
										className="stock-search__clear"
										type="button"
										onClick={handleClearSelection}
									>
										✕
									</button>
								)}
							</div>

							{/* Dropdown Results */}
							{showDropdown && (
								<div className="stock-search__dropdown" ref={dropdownRef}>
									{filteredProducts.length > 0 ? (
										filteredProducts.map((item) => {
											const status = getStockStatus(
												item.quantity,
												item.low_stock_threshold,
											);
											return (
												<div
													key={item.id}
													className="stock-search__result"
													onClick={() => handleSelectProduct(item)}
												>
													<div className="stock-search__result-img">
														{item.products.product_images?.[0] ? (
															<img
																src={item.products.product_images[0]}
																alt={item.products.product_name}
															/>
														) : (
															<div className="stock-search__result-placeholder">
																{item.products.product_name
																	.charAt(0)
																	.toUpperCase()}
															</div>
														)}
													</div>
													<div className="stock-search__result-info">
														<p className="stock-search__result-name">
															{item.products.product_name}
														</p>
														<p className="stock-search__result-company">
															{item.products.companies?.company_name}
														</p>
													</div>
													<div className="stock-search__result-right">
														<span
															className={`stock-badge stock-badge--${status}`}
														>
															{getStockLabel(
																item.quantity,
																item.low_stock_threshold,
															)}
														</span>
														<span className="stock-search__result-qty">
															{item.quantity} units
														</span>
													</div>
												</div>
											);
										})
									) : (
										<div className="stock-search__no-results">
											No products found
										</div>
									)}
								</div>
							)}
						</div>
					</div>

					{/* Update Form */}
					{selectedProduct && (
						<div className="stock-update-form">
							{/* Product Preview */}
							<div className="stock-product-preview">
								<div className="stock-product-preview__img">
									{selectedProduct.products.product_images?.[0] ? (
										<img
											src={selectedProduct.products.product_images[0]}
											alt={selectedProduct.products.product_name}
										/>
									) : (
										<div className="stock-product-preview__placeholder">
											{selectedProduct.products.product_name
												.charAt(0)
												.toUpperCase()}
										</div>
									)}
								</div>
								<div className="stock-product-preview__info">
									<p className="stock-product-preview__company">
										{selectedProduct.products.companies?.company_name}
									</p>
									<h3 className="stock-product-preview__name">
										{selectedProduct.products.product_name}
									</h3>
									<p className="stock-product-preview__price">
										₹{selectedProduct.products.selling_price}
									</p>
								</div>
								<button
									type="button"
									className="stock-product-preview__clear"
									onClick={handleClearSelection}
								>
									✕
								</button>
							</div>

							{/* Current Stock Status */}
							{fetchingStock ? (
								<div className="stock-loading">
									<div className="spinner"></div>
									<p>Fetching current stock...</p>
								</div>
							) : (
								currentStock && (
									<>
										<div className="current-stock-display">
											<div className="current-stock-display__item">
												<span className="current-stock-display__label">
													Current Stock
												</span>
												<span
													className={`current-stock-display__value current-stock-display__value--${getStockStatus(
														currentStock.quantity,
														currentStock.low_stock_threshold,
													)}`}
												>
													{currentStock.quantity} units
												</span>
											</div>
											<div className="current-stock-display__item">
												<span className="current-stock-display__label">
													Status
												</span>
												<span
													className={`stock-badge stock-badge--${getStockStatus(
														currentStock.quantity,
														currentStock.low_stock_threshold,
													)}`}
												>
													{getStockLabel(
														currentStock.quantity,
														currentStock.low_stock_threshold,
													)}
												</span>
											</div>
											<div className="current-stock-display__item">
												<span className="current-stock-display__label">
													Last Updated
												</span>
												<span className="current-stock-display__date">
													{new Date(
														currentStock.last_updated,
													).toLocaleDateString("en-IN", {
														day: "numeric",
														month: "short",
														year: "numeric",
														hour: "2-digit",
														minute: "2-digit",
													})}
												</span>
											</div>
										</div>

										{/* Action Type Selector */}
										<div className="action-type-selector">
											<button
												type="button"
												className={`action-type-btn ${actionType === "add" ? "active" : ""}`}
												onClick={() => setActionType("add")}
											>
												➕ Add Stock
											</button>
											<button
												type="button"
												className={`action-type-btn ${actionType === "update" ? "active" : ""}`}
												onClick={() => setActionType("update")}
											>
												✏️ Update Stock
											</button>
										</div>

										{/* Form */}
										<form onSubmit={handleSubmit} className="stock-form">
											<div className="stock-form__group">
												<label className="stock-form__label">
													{actionType === "add"
														? "Quantity to Add *"
														: "New Stock Quantity *"}
												</label>
												<div className="stock-form__input-wrapper">
													<input
														type="number"
														className="stock-form__input"
														placeholder={
															actionType === "add" ? "e.g., 200" : "e.g., 800"
														}
														value={quantity}
														onChange={(e) => setQuantity(e.target.value)}
														min="1"
														required
													/>
													<span className="stock-form__unit">units</span>
												</div>

												{/* Preview */}
												{quantity !== "" && (
													<div className="stock-form__preview">
														{actionType === "add" ? (
															<span>
																After addition:{" "}
																<strong>
																	{currentStock.quantity +
																		parseInt(quantity || 0)}{" "}
																	units
																</strong>
															</span>
														) : (
															<span>
																Change:{" "}
																<strong
																	className={
																		parseInt(quantity) > currentStock.quantity
																			? "positive"
																			: "negative"
																	}
																>
																	{parseInt(quantity) > currentStock.quantity
																		? "+"
																		: ""}
																	{parseInt(quantity) - currentStock.quantity}{" "}
																	units
																</strong>
															</span>
														)}
													</div>
												)}
											</div>

											{/* Reason Type */}
											<div className="stock-form__group">
												<label className="stock-form__label">Reason *</label>
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
														className="stock-form__input"
														placeholder="Specify reason..."
														value={reasonNote}
														onChange={(e) => setReasonNote(e.target.value)}
														required
														style={{ marginTop: "1rem" }}
													/>
												)}
											</div>

											{/* Low Stock Threshold */}
											<div className="stock-form__group">
												<label className="stock-form__label">
													Low Stock Threshold
												</label>
												<div className="stock-form__input-wrapper">
													<input
														type="number"
														className="stock-form__input"
														placeholder="Default: 600"
														value={newThreshold}
														onChange={(e) => setNewThreshold(e.target.value)}
														min="0"
													/>
													<span className="stock-form__unit">units</span>
												</div>
											</div>

											{/* PIN for Update */}
											{actionType === "update" && (
												<div className="stock-form__group">
													<label className="stock-form__label">
														Admin PIN * (Required for Update)
													</label>
													<input
														type="password"
														className="stock-form__input"
														placeholder="Enter admin PIN"
														value={adminPin}
														onChange={(e) => setAdminPin(e.target.value)}
														required
													/>
													<p className="stock-form__hint">
														🔒 Stock updates require authentication
													</p>
												</div>
											)}

											{message.text && (
												<div className={`message message--${message.type}`}>
													{message.text}
												</div>
											)}

											<button
												type="submit"
												className="stock-update-btn"
												disabled={loading}
											>
												{loading
													? actionType === "add"
														? "Adding..."
														: "Updating..."
													: actionType === "add"
														? "Add Stock"
														: "Update Stock"}
											</button>
										</form>
									</>
								)
							)}
						</div>
					)}

					{!selectedProduct && (
						<div className="stock-empty-state">
							<div className="stock-empty-state__icon">📦</div>
							<h3>Search for a product above</h3>
							<p>Select a product to manage its stock</p>
						</div>
					)}
				</div>

				{/* Right Panel */}
				<div className="update-stock__right">
					<h3 className="recent-updates__title">Recently Updated</h3>
					<div className="recent-updates__list">
						{recentlyUpdated.length > 0 ? (
							recentlyUpdated.map((item) => {
								const status = getStockStatus(
									item.quantity,
									item.low_stock_threshold,
								);
								return (
									<div
										key={item.id}
										className={`recent-update-card recent-update-card--${status}`}
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
												<span className={`stock-badge stock-badge--${status}`}>
													{item.quantity} units
												</span>
												<span className="recent-update-card__date">
													{new Date(item.last_updated).toLocaleDateString(
														"en-IN",
														{
															day: "numeric",
															month: "short",
														},
													)}
												</span>
											</div>
										</div>
									</div>
								);
							})
						) : (
							<p className="recent-updates__empty">No updates yet</p>
						)}
					</div>

					{/* Stock Overview */}
					<div className="stock-overview">
						<h3 className="stock-overview__title">Stock Overview</h3>
						<div className="stock-overview__stats">
							<div className="stock-stat stock-stat--in">
								<span className="stock-stat__number">
									{
										allProducts.filter(
											(p) =>
												p.quantity > 0 && p.quantity >= p.low_stock_threshold,
										).length
									}
								</span>
								<span className="stock-stat__label">In Stock</span>
							</div>
							<div className="stock-stat stock-stat--low">
								<span className="stock-stat__number">
									{
										allProducts.filter(
											(p) =>
												p.quantity > 0 && p.quantity < p.low_stock_threshold,
										).length
									}
								</span>
								<span className="stock-stat__label">Low Stock</span>
							</div>
							<div className="stock-stat stock-stat--out">
								<span className="stock-stat__number">
									{allProducts.filter((p) => p.quantity === 0).length}
								</span>
								<span className="stock-stat__label">Out of Stock</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default UpdateStock;
