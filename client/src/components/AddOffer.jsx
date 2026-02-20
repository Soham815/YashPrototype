import { useState, useEffect } from "react";
import "../styles/AddOffer.css";

function AddOffer() {
	const [offerType, setOfferType] = useState("product"); // 'product' or 'company'
	const [searchQuery, setSearchQuery] = useState("");
	const [products, setProducts] = useState([]);
	const [filteredProducts, setFilteredProducts] = useState([]);
	const [selectedProduct, setSelectedProduct] = useState(null);
	const [selectedCompany, setSelectedCompany] = useState(null);
	const [showResults, setShowResults] = useState(false);

	const [formData, setFormData] = useState({
		min_product_weight: "",
		min_product_mrp: "",
		offer_item: "",
		offer_discount: "",
		is_active: true,
	});

	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState({ type: "", text: "" });

	// Fetch all products on mount
	useEffect(() => {
		fetchProducts();
	}, []);

	// Filter products when search query changes
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

	const fetchProducts = async () => {
		try {
			const response = await fetch("http://localhost:5000/api/products");
			const data = await response.json();
			if (data.success) {
				setProducts(data.data);
			}
		} catch (error) {
			console.error("Error fetching products:", error);
		}
	};

	const handleOfferTypeChange = (type) => {
		setOfferType(type);
		setSelectedProduct(null);
		setSelectedCompany(null);
		setSearchQuery("");
		setFormData({
			min_product_weight: "",
			min_product_mrp: "",
			offer_item: "",
			offer_discount: "",
			is_active: true,
		});
	};

	const handleProductSelect = (product) => {
		setSelectedProduct(product);
		setSelectedCompany(product.companies);
		setSearchQuery(product.product_name);
		setShowResults(false);

		// Pre-fill form with product info
		setFormData((prev) => ({
			...prev,
			min_product_weight: product.weight || "",
			min_product_mrp: product.mrp || "",
		}));
	};

	const handleInputChange = (e) => {
		const { name, value, type, checked } = e.target;
		setFormData({
			...formData,
			[name]: type === "checkbox" ? checked : value,
		});
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setMessage({ type: "", text: "" });

		// Validation
		if (offerType === "product" && !selectedProduct) {
			setMessage({ type: "error", text: "Please select a product" });
			setLoading(false);
			return;
		}

		if (offerType === "company" && !selectedCompany) {
			setMessage({ type: "error", text: "Please select a company" });
			setLoading(false);
			return;
		}

		try {
			const submitData = {
				offer_type: offerType,
				product_id: offerType === "product" ? selectedProduct.id : null,
				company_id:
					offerType === "company"
						? selectedCompany.id
						: selectedProduct?.company_id,
				...formData,
			};

			const response = await fetch("http://localhost:5000/api/offers", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(submitData),
			});

			const data = await response.json();

			if (response.ok) {
				setMessage({ type: "success", text: "Offer added successfully!" });
				// Reset form
				setSelectedProduct(null);
				setSelectedCompany(null);
				setSearchQuery("");
				setFormData({
					min_product_weight: "",
					min_product_mrp: "",
					offer_item: "",
					offer_discount: "",
					is_active: true,
				});
			} else {
				setMessage({
					type: "error",
					text: data.error || "Failed to add offer",
				});
			}
		} catch (error) {
			console.error("Error:", error);
			setMessage({ type: "error", text: "Network error. Please try again." });
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="add-offer-container">
			<h2 className="form-title">Add New Offer</h2>

			<form onSubmit={handleSubmit} className="offer-form">
				{/* Offer Type Selection */}
				<div className="form-group offer-type-group">
					<label>Offer Type *</label>
					<div className="offer-type-buttons">
						<button
							type="button"
							className={`offer-type-btn ${offerType === "product" ? "active" : ""}`}
							onClick={() => handleOfferTypeChange("product")}
						>
							Product Specific
						</button>
						<button
							type="button"
							className={`offer-type-btn ${offerType === "company" ? "active" : ""}`}
							onClick={() => handleOfferTypeChange("company")}
						>
							Company Wide
						</button>
					</div>
				</div>

				{/* Search Bar */}
				<div className="form-group">
					<label htmlFor="search">
						{offerType === "product"
							? "Search Product *"
							: "Search Product (to select company) *"}
					</label>
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

				{/* Selected Product/Company Display */}
				{(selectedProduct || selectedCompany) && (
					<div className="selected-info">
						<div className="selected-header">
							<span className="selected-label">
								{offerType === "product"
									? "Selected Product:"
									: "Selected Company:"}
							</span>
							<button
								type="button"
								className="clear-btn"
								onClick={() => {
									setSelectedProduct(null);
									setSelectedCompany(null);
									setSearchQuery("");
								}}
							>
								✕ Clear
							</button>
						</div>
						<div className="selected-details">
							{offerType === "product" ? (
								<>
									<p>
										<strong>Product:</strong> {selectedProduct.product_name}
									</p>
									<p>
										<strong>Company:</strong> {selectedCompany?.company_name}
									</p>
									<p>
										<strong>MRP:</strong> ₹{selectedProduct.mrp}
									</p>
									{selectedProduct.weight && (
										<p>
											<strong>Weight:</strong> {selectedProduct.weight}gm
										</p>
									)}
								</>
							) : (
								<p>
									<strong>Company:</strong> {selectedCompany?.company_name}
								</p>
							)}
						</div>
					</div>
				)}

				{/* Offer Details - Only show if product/company selected */}
				{(selectedProduct || selectedCompany) && (
					<>
						{/* Minimum Requirements */}
						<div className="form-row">
							<div className="form-group">
								<label htmlFor="min_product_weight">Min Weight (gm)</label>
								<input
									type="number"
									id="min_product_weight"
									name="min_product_weight"
									value={formData.min_product_weight}
									onChange={handleInputChange}
									placeholder="0.00"
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
									value={formData.min_product_mrp}
									onChange={handleInputChange}
									placeholder="0.00"
									step="0.01"
									min="0"
								/>
							</div>
						</div>

						{/* Offer Benefits */}
						<div className="form-row">
							<div className="form-group">
								<label htmlFor="offer_item">Free Item</label>
								<input
									type="text"
									id="offer_item"
									name="offer_item"
									value={formData.offer_item}
									onChange={handleInputChange}
									placeholder="e.g., 100gm free"
								/>
							</div>

							<div className="form-group">
								<label htmlFor="offer_discount">Discount Amount (₹)</label>
								<input
									type="number"
									id="offer_discount"
									name="offer_discount"
									value={formData.offer_discount}
									onChange={handleInputChange}
									placeholder="0.00"
									step="0.01"
									min="0"
								/>
							</div>
						</div>

						{/* Is Active Toggle */}
						<div className="form-group toggle-group">
							<label className="toggle-wrapper">
								<input
									type="checkbox"
									name="is_active"
									checked={formData.is_active}
									onChange={handleInputChange}
								/>
								<span
									className={`toggle-slider ${formData.is_active ? "checked" : ""}`}
								></span>
								<span className="toggle-text">Offer Active</span>
							</label>
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
				<button
					type="submit"
					className="submit-btn"
					disabled={loading || (!selectedProduct && !selectedCompany)}
				>
					{loading ? "Adding Offer..." : "Add Offer"}
				</button>
			</form>
		</div>
	);
}

export default AddOffer;
