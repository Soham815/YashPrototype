import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import "../styles/AddOffer.css";

function AddOffer() {
	const navigate = useNavigate();

	// Offer Type Selection
	const [offerType, setOfferType] = useState("free_item"); // 'free_item' or 'discount'

	// Product Search
	const [searchQuery, setSearchQuery] = useState("");
	const [products, setProducts] = useState([]);
	const [filteredProducts, setFilteredProducts] = useState([]);
	const [selectedProduct, setSelectedProduct] = useState(null);
	const [showResults, setShowResults] = useState(false);

	// Offer Conditions
	const [minWeight, setMinWeight] = useState("");
	const [minMRP, setMinMRP] = useState("");

	// Free Item Configuration
	const [freeItemType, setFreeItemType] = useState("same_product"); // 'same_product', 'different_product', 'external'
	const [freeItemProduct, setFreeItemProduct] = useState(null);
	const [freeItemQuantity, setFreeItemQuantity] = useState("1");
	const [externalItemName, setExternalItemName] = useState("");
	const [externalItemDescription, setExternalItemDescription] = useState("");
	const [selectedExternalItem, setSelectedExternalItem] = useState(null);

	// Free Item Product Search
	const [freeItemSearchQuery, setFreeItemSearchQuery] = useState("");
	const [filteredFreeProducts, setFilteredFreeProducts] = useState([]);
	const [showFreeItemResults, setShowFreeItemResults] = useState(false);

	// External Items
	const [externalItems, setExternalItems] = useState([]);
	const [showExternalResults, setShowExternalResults] = useState(false);

	// Discount Configuration
	const [discountType, setDiscountType] = useState("fixed"); // 'fixed' or 'percentage'
	const [discountValue, setDiscountValue] = useState("");

	// State
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState({ type: "", text: "" });
	const [overlappingOffers, setOverlappingOffers] = useState([]);
	const [showOverlapWarning, setShowOverlapWarning] = useState(false);

	useEffect(() => {
		fetchProducts();
	}, []);

	useEffect(() => {
		if (searchQuery.trim() === "") {
			setFilteredProducts([]);
			setShowResults(false);
		} else {
			const filtered = products.filter((product) =>
				product.product_name.toLowerCase().includes(searchQuery.toLowerCase()),
			);
			setFilteredProducts(filtered);
			setShowResults(true);
		}
	}, [searchQuery, products]);

	useEffect(() => {
		if (freeItemSearchQuery.trim() === "") {
			setFilteredFreeProducts([]);
			setShowFreeItemResults(false);
		} else {
			const filtered = products.filter((product) =>
				product.product_name
					.toLowerCase()
					.includes(freeItemSearchQuery.toLowerCase()),
			);
			setFilteredFreeProducts(filtered);
			setShowFreeItemResults(true);
		}
	}, [freeItemSearchQuery, products]);

	// Fetch external items when external type is selected
	useEffect(() => {
		if (freeItemType === "external") {
			fetchExternalItems();
		}
	}, [freeItemType]);

	// Filter external items based on search
	useEffect(() => {
		if (externalItemName.trim() === "") {
			setShowExternalResults(false);
		} else {
			setShowExternalResults(true);
		}
	}, [externalItemName]);

	const fetchProducts = async () => {
		try {
			const response = await fetch(`${API_BASE_URL}/products`);
			const data = await response.json();
			if (data.success) {
				setProducts(data.data);
			}
		} catch (error) {
			console.error("Error fetching products:", error);
		}
	};

	const fetchExternalItems = async () => {
		try {
			const response = await fetch(`${API_BASE_URL}/external-items`);
			const data = await response.json();
			if (data.success) {
				setExternalItems(data.data);
			}
		} catch (error) {
			console.error("Error fetching external items:", error);
		}
	};

	const handleProductSelect = async (product) => {
		setSelectedProduct(product);
		setSearchQuery(product.product_name);
		setShowResults(false);

		// Pre-fill form with product info
		if (product.weight) setMinWeight(product.weight.toString());
		if (product.mrp) setMinMRP(product.mrp.toString());

		// Check for overlapping offers
		await checkOverlappingOffers(product.id);
	};

	const handleFreeItemProductSelect = (product) => {
		setFreeItemProduct(product);
		setFreeItemSearchQuery(product.product_name);
		setShowFreeItemResults(false);
	};

	const handleExternalItemSelect = (item) => {
		setSelectedExternalItem(item);
		setExternalItemName(item.item_name);
		setExternalItemDescription(item.item_description || "");
		setShowExternalResults(false);
	};

	const checkOverlappingOffers = async (productId) => {
		try {
			const response = await fetch(
				`${API_BASE_URL}/offers/check-overlaps/${productId}`,
			);
			const data = await response.json();

			if (data.success && data.data && data.data.length > 0) {
				setOverlappingOffers(data.data);
				setShowOverlapWarning(true);
			}
		} catch (error) {
			console.error("Error checking overlaps:", error);
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!selectedProduct) {
			setMessage({ type: "error", text: "Please select a product" });
			return;
		}

		// Validate based on offer type
		if (offerType === "free_item") {
			if (freeItemType === "different_product" && !freeItemProduct) {
				setMessage({
					type: "error",
					text: "Please select a free item product",
				});
				return;
			}

			if (freeItemType === "external" && !selectedExternalItem) {
				setMessage({ type: "error", text: "Please select an external item" });
				return;
			}

			if (!freeItemQuantity || parseFloat(freeItemQuantity) <= 0) {
				setMessage({
					type: "error",
					text: "Please enter a valid free item quantity",
				});
				return;
			}
		}

		if (offerType === "discount") {
			if (!discountValue || parseFloat(discountValue) <= 0) {
				setMessage({
					type: "error",
					text: "Please enter a valid discount value",
				});
				return;
			}

			if (discountType === "percentage" && parseFloat(discountValue) > 100) {
				setMessage({
					type: "error",
					text: "Percentage discount cannot exceed 100%",
				});
				return;
			}
		}

		setLoading(true);
		setMessage({ type: "", text: "" });

		try {
			const submitData = {
				offer_type: offerType,
				product_id: selectedProduct.id,
				company_id: selectedProduct.company_id,
				min_product_weight: minWeight ? parseFloat(minWeight) : null,
				min_product_mrp: minMRP ? parseFloat(minMRP) : null,
			};

			// Add type-specific fields
			if (offerType === "free_item") {
				submitData.free_item_type = freeItemType;
				submitData.free_item_quantity = parseFloat(freeItemQuantity);

				if (freeItemType === "different_product") {
					submitData.free_item_product_id = freeItemProduct.id;
				} else if (freeItemType === "external") {
					submitData.external_item_id = selectedExternalItem.id;
					submitData.free_item_external_name = selectedExternalItem.item_name;
					submitData.free_item_external_description =
						selectedExternalItem.item_description || null;
				}
			} else if (offerType === "discount") {
				submitData.discount_type = discountType;
				submitData.discount_value = parseFloat(discountValue);
			}

			const response = await fetch(`${API_BASE_URL}/offers`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(submitData),
			});

			const data = await response.json();

			if (response.ok) {
				setMessage({
					type: "success",
					text: data.message || "Offer created successfully!",
				});

				// Reset form
				resetForm();

				setTimeout(() => {
					navigate("/admin/offers");
				}, 2000);
			} else {
				setMessage({
					type: "error",
					text: data.error || "Failed to create offer",
				});
			}
		} catch (error) {
			console.error("Error:", error);
			setMessage({ type: "error", text: "Network error. Please try again." });
		} finally {
			setLoading(false);
		}
	};

	const resetForm = () => {
		setSelectedProduct(null);
		setSearchQuery("");
		setMinWeight("");
		setMinMRP("");
		setFreeItemType("same_product");
		setFreeItemProduct(null);
		setFreeItemQuantity("1");
		setFreeItemSearchQuery("");
		setExternalItemName("");
		setExternalItemDescription("");
		setSelectedExternalItem(null);
		setDiscountType("fixed");
		setDiscountValue("");
		setOverlappingOffers([]);
		setShowOverlapWarning(false);
	};

	const handleClearSelection = () => {
		resetForm();
		setMessage({ type: "", text: "" });
	};

	const getFilteredExternalItems = () => {
		if (!externalItemName.trim()) return [];
		return externalItems.filter((item) =>
			item.item_name.toLowerCase().includes(externalItemName.toLowerCase()),
		);
	};

	return (
		<div className="add-offer-container">
			<div className="add-offer__header">
				<h2 className="form-title">Create New Offer</h2>
				<button className="back-btn" onClick={() => navigate("/admin/offers")}>
					← Back to Offers
				</button>
			</div>

			<form onSubmit={handleSubmit} className="offer-form">
				{/* Offer Type Selection */}
				<div className="form-group offer-type-group">
					<label>Offer Type *</label>
					<div className="offer-type-buttons">
						<button
							type="button"
							className={`offer-type-btn ${offerType === "free_item" ? "active" : ""}`}
							onClick={() => setOfferType("free_item")}
						>
							🎁 Free Item
						</button>
						<button
							type="button"
							className={`offer-type-btn ${offerType === "discount" ? "active" : ""}`}
							onClick={() => setOfferType("discount")}
						>
							💰 Discount
						</button>
					</div>
				</div>

				{/* Product Search */}
				<div className="form-group">
					<label htmlFor="search">Select Product *</label>
					<div className="search-wrapper">
						<input
							type="text"
							id="search"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Type product name to search..."
							className="search-input"
						/>
						<span className="search-icon">🔍</span>
						{searchQuery && (
							<button
								type="button"
								className="search-clear-btn"
								onClick={handleClearSelection}
							>
								✕
							</button>
						)}
					</div>

					{/* Search Results Dropdown */}
					{showResults && filteredProducts.length > 0 && (
						<div className="search-results">
							{filteredProducts.map((product) => (
								<div
									key={product.id}
									className="search-result-item"
									onClick={() => handleProductSelect(product)}
								>
									<div className="result-info">
										<span className="result-name">{product.product_name}</span>
										<span className="result-company">
											{product.companies?.company_name}
										</span>
									</div>
									<span className="result-price">₹{product.mrp}</span>
								</div>
							))}
						</div>
					)}

					{showResults && filteredProducts.length === 0 && (
						<div className="search-results">
							<div className="no-results-item">No products found</div>
						</div>
					)}
				</div>

				{/* Selected Product Display */}
				{selectedProduct && (
					<div className="selected-info">
						<div className="selected-header">
							<span className="selected-label">Selected Product:</span>
							<button
								type="button"
								className="clear-btn"
								onClick={handleClearSelection}
							>
								✕ Clear
							</button>
						</div>
						<div className="selected-details">
							<p>
								<strong>Product:</strong> {selectedProduct.product_name}
							</p>
							<p>
								<strong>Company:</strong>{" "}
								{selectedProduct.companies?.company_name}
							</p>
							<p>
								<strong>MRP:</strong> ₹{selectedProduct.mrp}
							</p>
							{selectedProduct.weight && (
								<p>
									<strong>Weight:</strong> {selectedProduct.weight}gm
								</p>
							)}
						</div>
					</div>
				)}

				{/* Offer Conditions - Only show if product selected */}
				{selectedProduct && (
					<>
						{/* Minimum Requirements */}
						<div className="form-row">
							<div className="form-group">
								<label htmlFor="min_product_weight">
									Min Weight (gm) {offerType === "free_item" ? "*" : ""}
								</label>
								<input
									type="number"
									id="min_product_weight"
									name="min_product_weight"
									value={minWeight}
									onChange={(e) => setMinWeight(e.target.value)}
									placeholder="e.g., 11000"
									step="0.01"
									min="0"
								/>
							</div>

							<div className="form-group">
								<label htmlFor="min_product_mrp">Min MRP (₹)</label>
								<input
									type="number"
									id="min_product_mrp"
									name="min_product_mrp"
									value={minMRP}
									onChange={(e) => setMinMRP(e.target.value)}
									placeholder="e.g., 500"
									step="0.01"
									min="0"
								/>
							</div>
						</div>

						{/* FREE ITEM CONFIGURATION */}
						{offerType === "free_item" && (
							<>
								{/* Free Item Type Selection */}
								<div className="form-group">
									<label>Free Item Type *</label>
									<div className="free-item-type-group">
										<label className="free-item-type-radio">
											<input
												type="radio"
												name="free_item_type"
												value="same_product"
												checked={freeItemType === "same_product"}
												onChange={(e) => setFreeItemType(e.target.value)}
											/>
											<span className="free-item-type-text">
												📦 Same Product
												<small>Give the product itself as free item</small>
											</span>
										</label>

										<label className="free-item-type-radio">
											<input
												type="radio"
												name="free_item_type"
												value="different_product"
												checked={freeItemType === "different_product"}
												onChange={(e) => setFreeItemType(e.target.value)}
											/>
											<span className="free-item-type-text">
												🎁 Different Product
												<small>Give another product from inventory</small>
											</span>
										</label>

										<label className="free-item-type-radio">
											<input
												type="radio"
												name="free_item_type"
												value="external"
												checked={freeItemType === "external"}
												onChange={(e) => setFreeItemType(e.target.value)}
											/>
											<span className="free-item-type-text">
												🏷️ External Item
												<small>Give non-inventory item (e.g., container)</small>
											</span>
										</label>
									</div>
								</div>

								{/* Different Product Selection */}
								{freeItemType === "different_product" && (
									<div className="form-group">
										<label>Select Free Item Product *</label>
										<div className="search-wrapper">
											<input
												type="text"
												value={freeItemSearchQuery}
												onChange={(e) => setFreeItemSearchQuery(e.target.value)}
												placeholder="Search for free item product..."
												className="search-input"
											/>
											<span className="search-icon">🔍</span>
										</div>

										{showFreeItemResults && filteredFreeProducts.length > 0 && (
											<div className="search-results">
												{filteredFreeProducts.map((product) => (
													<div
														key={product.id}
														className="search-result-item"
														onClick={() => handleFreeItemProductSelect(product)}
													>
														<div className="result-info">
															<span className="result-name">
																{product.product_name}
															</span>
															<span className="result-company">
																{product.companies?.company_name}
															</span>
														</div>
														<span className="result-price">₹{product.mrp}</span>
													</div>
												))}
											</div>
										)}

										{freeItemProduct && (
											<div className="selected-free-item">
												<p>
													<strong>Selected:</strong>{" "}
													{freeItemProduct.product_name}
												</p>
												<button
													type="button"
													className="clear-btn"
													onClick={() => {
														setFreeItemProduct(null);
														setFreeItemSearchQuery("");
													}}
												>
													✕ Clear
												</button>
											</div>
										)}
									</div>
								)}

								{/* External Item Selection */}
								{freeItemType === "external" && (
									<>
										<div className="form-group">
											<label>Select External Item *</label>
											<div className="search-wrapper">
												<input
													type="text"
													value={externalItemName}
													onChange={(e) => setExternalItemName(e.target.value)}
													placeholder="Search for external item..."
													className="search-input"
												/>
												<span className="search-icon">🔍</span>
											</div>

											{/* External Items Dropdown */}
											{showExternalResults &&
												getFilteredExternalItems().length > 0 && (
													<div className="search-results">
														{getFilteredExternalItems().map((item) => (
															<div
																key={item.id}
																className="search-result-item"
																onClick={() => handleExternalItemSelect(item)}
															>
																<div className="result-info">
																	<span className="result-name">
																		{item.item_name}
																	</span>
																	{item.item_description && (
																		<span className="result-company">
																			{item.item_description}
																		</span>
																	)}
																</div>
																<span className="result-price">
																	Stock: {item.stock_quantity}
																</span>
															</div>
														))}
													</div>
												)}

											{showExternalResults &&
												getFilteredExternalItems().length === 0 && (
													<div className="search-results">
														<div className="no-results-item">
															No external items found
														</div>
													</div>
												)}

											{selectedExternalItem && (
												<div className="selected-free-item">
													<p>
														<strong>Selected:</strong>{" "}
														{selectedExternalItem.item_name}
													</p>
													<button
														type="button"
														className="clear-btn"
														onClick={() => {
															setSelectedExternalItem(null);
															setExternalItemName("");
															setExternalItemDescription("");
														}}
													>
														✕ Clear
													</button>
												</div>
											)}
										</div>

										{selectedExternalItem?.item_description && (
											<div className="form-group">
												<label>Item Description</label>
												<p className="external-item-description">
													{selectedExternalItem.item_description}
												</p>
											</div>
										)}
									</>
								)}

								{/* Free Item Quantity */}
								<div className="form-group">
									<label>Free Item Quantity *</label>
									<div className="quantity-input-wrapper">
										<input
											type="number"
											className="form-input"
											value={freeItemQuantity}
											onChange={(e) => setFreeItemQuantity(e.target.value)}
											placeholder="1"
											step="0.01"
											min="0.01"
											required
										/>
										<span className="quantity-unit">
											{freeItemType === "same_product"
												? selectedProduct.weight
													? "gm"
													: "unit(s)"
												: freeItemType === "different_product" &&
													  freeItemProduct
													? freeItemProduct.weight
														? "gm"
														: "unit(s)"
													: "unit(s)"}
										</span>
									</div>
								</div>
							</>
						)}

						{/* DISCOUNT CONFIGURATION */}
						{offerType === "discount" && (
							<>
								{/* Discount Type */}
								<div className="form-group">
									<label>Discount Type *</label>
									<div className="discount-type-group">
										<label className="discount-type-radio">
											<input
												type="radio"
												name="discount_type"
												value="fixed"
												checked={discountType === "fixed"}
												onChange={(e) => setDiscountType(e.target.value)}
											/>
											<span className="discount-type-text">
												💵 Fixed Amount
												<small>Flat discount in rupees</small>
											</span>
										</label>

										<label className="discount-type-radio">
											<input
												type="radio"
												name="discount_type"
												value="percentage"
												checked={discountType === "percentage"}
												onChange={(e) => setDiscountType(e.target.value)}
											/>
											<span className="discount-type-text">
												📊 Percentage
												<small>Discount as percentage of price</small>
											</span>
										</label>
									</div>
								</div>

								{/* Discount Value */}
								<div className="form-group">
									<label>
										Discount Value * (
										{discountType === "percentage" ? "%" : "₹"})
									</label>
									<div className="quantity-input-wrapper">
										<input
											type="number"
											className="form-input"
											value={discountValue}
											onChange={(e) => setDiscountValue(e.target.value)}
											placeholder={
												discountType === "percentage" ? "e.g., 10" : "e.g., 50"
											}
											step="0.01"
											min="0.01"
											max={discountType === "percentage" ? "100" : undefined}
											required
										/>
										<span className="quantity-unit">
											{discountType === "percentage" ? "%" : "₹"}
										</span>
									</div>
									{discountType === "percentage" && (
										<p className="form-hint">Max 100%</p>
									)}
								</div>
							</>
						)}

						{/* Message Display */}
						{message.text && (
							<div className={`message message--${message.type}`}>
								{message.text}
							</div>
						)}

						{/* Submit Button */}
						<button type="submit" className="submit-btn" disabled={loading}>
							{loading ? "Creating Offer..." : "Create Offer"}
						</button>
					</>
				)}
			</form>

			{/* Overlap Warning Modal */}
			{showOverlapWarning && (
				<div
					className="modal-overlay"
					onClick={() => setShowOverlapWarning(false)}
				>
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h3>⚠️ Overlapping Offers Detected</h3>
							<button
								className="modal-close-btn"
								onClick={() => setShowOverlapWarning(false)}
							>
								✕
							</button>
						</div>
						<div className="modal-body">
							<p>This product already has active offers:</p>
							<div className="overlap-offers-list">
								{overlappingOffers.map((offer) => (
									<div key={offer.offer_id} className="overlap-offer-item">
										<p>
											<strong>Offer #{offer.offer_id}</strong>
										</p>
										{offer.min_weight && (
											<p>Min Weight: {offer.min_weight}gm</p>
										)}
										{offer.min_mrp && <p>Min MRP: ₹{offer.min_mrp}</p>}
										{offer.free_item_info && (
											<p>Free Item: {offer.free_item_info}</p>
										)}
										{offer.discount_info && (
											<p>Discount: {offer.discount_info}</p>
										)}
									</div>
								))}
							</div>
							<p className="overlap-warning-note">
								Multiple offers can be active simultaneously. A customer buying
								in bulk may qualify for multiple offers at once.
							</p>
						</div>
						<div className="modal-actions">
							<button
								className="modal-btn modal-btn--primary"
								onClick={() => setShowOverlapWarning(false)}
							>
								Continue Anyway
							</button>
							<button
								className="modal-btn modal-btn--secondary"
								onClick={() => {
									setShowOverlapWarning(false);
									handleClearSelection();
								}}
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default AddOffer;
