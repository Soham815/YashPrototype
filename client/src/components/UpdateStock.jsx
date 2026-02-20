import { useState, useEffect, useRef } from "react";
import "../styles/UpdateStock.css";

function UpdateStock() {
	const [searchQuery, setSearchQuery] = useState("");
	const [allProducts, setAllProducts] = useState([]);
	const [filteredProducts, setFilteredProducts] = useState([]);
	const [showDropdown, setShowDropdown] = useState(false);
	const [selectedProduct, setSelectedProduct] = useState(null);
	const [currentStock, setCurrentStock] = useState(null);
	const [newQuantity, setNewQuantity] = useState("");
	const [newThreshold, setNewThreshold] = useState("");
	const [loading, setLoading] = useState(false);
	const [fetchingStock, setFetchingStock] = useState(false);
	const [message, setMessage] = useState({ type: "", text: "" });
	const [recentlyUpdated, setRecentlyUpdated] = useState([]);

	const searchRef = useRef(null);
	const dropdownRef = useRef(null);

	// Fetch all products on mount
	useEffect(() => {
		fetchAllProducts();
		fetchRecentlyUpdated();
	}, []);

	// Close dropdown on outside click
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

	// Filter products as user types
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
			const response = await fetch("http://localhost:5000/api/stock");
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
			const response = await fetch("http://localhost:5000/api/stock");
			const data = await response.json();
			if (data.success) {
				// Get 5 most recently updated with non-zero stock
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
				`http://localhost:5000/api/stock/product/${stockItem.product_id}`,
			);
			const data = await response.json();

			if (data.success) {
				setCurrentStock(data.data);
				setNewQuantity(data.data.quantity.toString());
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

	const handleUpdate = async (e) => {
		e.preventDefault();

		if (!selectedProduct) return;

		if (newQuantity === "" || parseInt(newQuantity) < 0) {
			setMessage({ type: "error", text: "Please enter a valid quantity" });
			return;
		}

		setLoading(true);
		setMessage({ type: "", text: "" });

		try {
			const response = await fetch(
				`http://localhost:5000/api/stock/${selectedProduct.product_id}`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						quantity: parseInt(newQuantity),
						low_stock_threshold: parseInt(newThreshold) || 600,
						updated_by: "admin",
					}),
				},
			);

			const data = await response.json();

			if (response.ok) {
				setMessage({
					type: "success",
					text: `Stock updated to ${newQuantity} units!`,
				});
				setCurrentStock((prev) => ({
					...prev,
					quantity: parseInt(newQuantity),
					low_stock_threshold: parseInt(newThreshold) || 600,
				}));

				// Refresh lists
				await fetchAllProducts();
				await fetchRecentlyUpdated();

				setTimeout(() => setMessage({ type: "", text: "" }), 3000);
			} else {
				setMessage({ type: "error", text: data.error || "Update failed" });
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
		setNewQuantity("");
		setNewThreshold("");
		setMessage({ type: "", text: "" });
	};

	return (
		<div className="update-stock-page">
			<div className="update-stock__header">
				<h2 className="update-stock__title">Update Stock</h2>
				<p className="update-stock__subtitle">
					Search for a product and update its stock quantity
				</p>
			</div>

			<div className="update-stock__body">
				{/* Left Panel - Search & Update Form */}
				<div className="update-stock__left">
					{/* Search */}
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
							{/* Selected Product Preview */}
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

										{/* Update Fields */}
										<form onSubmit={handleUpdate} className="stock-form">
											<div className="stock-form__group">
												<label className="stock-form__label">
													New Stock Quantity *
												</label>
												<div className="stock-form__input-wrapper">
													<input
														type="number"
														className="stock-form__input"
														placeholder="Enter quantity"
														value={newQuantity}
														onChange={(e) => setNewQuantity(e.target.value)}
														min="0"
														required
													/>
													<span className="stock-form__unit">units</span>
												</div>

												{/* Visual feedback while typing */}
												{newQuantity !== "" && (
													<div
														className={`stock-form__preview stock-form__preview--${getStockStatus(
															parseInt(newQuantity),
															parseInt(newThreshold) || 600,
														)}`}
													>
														After update:{" "}
														{getStockLabel(
															parseInt(newQuantity),
															parseInt(newThreshold) || 600,
														)}
													</div>
												)}
											</div>

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
												<p className="stock-form__hint">
													Products below this quantity will show "Few items
													left" to customers
												</p>
											</div>

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
												{loading ? "Updating..." : "Update Stock"}
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
							<p>Select a product to view and update its stock</p>
						</div>
					)}
				</div>

				{/* Right Panel - Recently Updated */}
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
