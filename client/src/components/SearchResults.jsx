import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import Navbar from "./Navbar";
import "../styles/SearchResults.css";

function SearchResults() {
	const [searchParams] = useSearchParams();
	const initialQuery = searchParams.get("q") || "";

	const [searchQuery, setSearchQuery] = useState(initialQuery);
	const [products, setProducts] = useState([]);
	const [filteredProducts, setFilteredProducts] = useState([]);
	const [stockData, setStockData] = useState({});
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState({ type: "", text: "" });
	const [quantities, setQuantities] = useState({});
	const [units, setUnits] = useState({});
	const [imageErrors, setImageErrors] = useState({});

	useEffect(() => {
		fetchProducts();
		fetchStockData();
	}, []);

	useEffect(() => {
		if (searchQuery.trim() === "") {
			setFilteredProducts([]);
		} else {
			const filtered = products.filter((product) => {
				const productName = product.product_name.toLowerCase();
				const companyName = product.companies?.company_name.toLowerCase() || "";
				const query = searchQuery.toLowerCase();

				return productName.includes(query) || companyName.includes(query);
			});
			setFilteredProducts(filtered);
		}
	}, [searchQuery, products]);

	const fetchProducts = async () => {
		try {
			setLoading(true);
			const response = await fetch(`${API_BASE_URL}/products`);
			const data = await response.json();

			if (data.success) {
				setProducts(data.data);

				if (initialQuery) {
					const filtered = data.data.filter((product) => {
						const productName = product.product_name.toLowerCase();
						const companyName =
							product.companies?.company_name.toLowerCase() || "";
						const query = initialQuery.toLowerCase();

						return productName.includes(query) || companyName.includes(query);
					});
					setFilteredProducts(filtered);
				}
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

	const fetchStockData = async () => {
		try {
			const response = await fetch(`${API_BASE_URL}/stock`);
			const data = await response.json();
			if (data.success) {
				// Convert to lookup object: { productId: stockInfo }
				const stockMap = {};
				data.data.forEach((item) => {
					stockMap[item.product_id] = item;
				});
				setStockData(stockMap);
			}
		} catch (error) {
			console.error("Error fetching stock:", error);
		}
	};

	const handleSearch = (query) => {
		setSearchQuery(query);
	};

	const calculateDiscount = (mrp, sellingPrice) => {
		if (!mrp || !sellingPrice) return 0;
		return Math.round(((mrp - sellingPrice) / mrp) * 100);
	};

	const handleQuantityChange = (productId, value) => {
		setQuantities((prev) => ({
			...prev,
			[productId]: value,
		}));
	};

	const handleUnitChange = (productId, value) => {
		setUnits((prev) => ({
			...prev,
			[productId]: value,
		}));
	};

	const handleAddToCart = (e, product) => {
		e.preventDefault();

		// Check stock first
		const stock = stockData[product.id];
		if (!stock || stock.quantity === 0) {
			alert("This product is currently out of stock");
			return;
		}

		const quantity = quantities[product.id] || "";
		const unit = units[product.id] || "kilos";

		if (!quantity || quantity <= 0) {
			alert("Please enter a valid quantity");
			return;
		}

		console.log("Add to cart:", {
			product: product.product_name,
			quantity,
			unit,
			availableStock: stock.quantity,
		});

		setQuantities((prev) => ({
			...prev,
			[product.id]: "",
		}));

		alert(`Added ${quantity} ${unit} of ${product.product_name} to cart!`);
	};

	const handleImageError = (productId) => {
		setImageErrors((prev) => ({
			...prev,
			[productId]: true,
		}));
	};

	const getStockStatus = (productId) => {
		const stock = stockData[productId];
		if (!stock) return null;

		if (stock.quantity === 0) return "out";
		if (stock.quantity < stock.low_stock_threshold) return "low";
		return "in";
	};

	return (
		<>
			<Navbar
				onSearch={handleSearch}
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
			/>

			<div className="search-result">
				<main>
					<div className="container container--orange">
						{loading ? (
							<div className="loading-state">
								<div className="spinner"></div>
								<p>Loading products...</p>
							</div>
						) : (
							<>
								{searchQuery && (
									<div className="search-result__header">
										<h2 className="search-result__title">
											Search Results for "{searchQuery}"
										</h2>
										<p className="search-result__count">
											{filteredProducts.length} product
											{filteredProducts.length !== 1 ? "s" : ""} found
										</p>
									</div>
								)}

								{filteredProducts.length > 0 ? (
									<div className="products">
										{filteredProducts.map((product) => {
											const stockStatus = getStockStatus(product.id);
											const isOutOfStock = stockStatus === "out";
											const isLowStock = stockStatus === "low";

											return (
												<article
													key={product.id}
													className={`prod-result__details ${
														isOutOfStock ? "prod-result__details--out" : ""
													}`}
												>
													<Link to={`/product/${product.id}`}>
														{product.product_images &&
														product.product_images.length > 0 &&
														!imageErrors[product.id] ? (
															<img
																src={product.product_images[0]}
																alt={product.product_name}
																className="prod-result__img"
																onError={() => handleImageError(product.id)}
																loading="lazy"
															/>
														) : (
															<div className="prod-result__img-placeholder">
																{product.product_name.charAt(0).toUpperCase()}
															</div>
														)}
													</Link>

													<button
														className="prod-result__wishlist"
														onClick={(e) => {
															e.preventDefault();
															console.log("Add to wishlist:", product.id);
														}}
													>
														<svg
															xmlns="http://www.w3.org/2000/svg"
															className="prod-result__wishlist__icon"
															fill="none"
															viewBox="0 0 24 24"
															stroke="currentColor"
														>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																strokeWidth={2}
																d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
															/>
														</svg>
													</button>

													<h3 className="prod-result__company-name">
														{product.companies?.company_name || "Unknown"}
													</h3>
													<h4 className="prod-result__title">
														{product.product_name}
													</h4>

													<div className="prod-result__prices">
														<p className="prod-result__mrp">₹{product.mrp}</p>
														<p className="prod-result__rate">
															₹{product.selling_price}
														</p>
														<p className="prod-result__discount">
															{calculateDiscount(
																product.mrp,
																product.selling_price,
															)}
															% off
														</p>
													</div>

													{/* Stock Status Badge */}
													<div className="prod-result__stock">
														{isOutOfStock && (
															<span className="prod-result__stock-tag prod-result__stock-tag--out">
																❌ Out of Stock
															</span>
														)}
														{isLowStock && (
															<span className="prod-result__stock-tag prod-result__stock-tag--low">
																⚡ Only a few left!
															</span>
														)}
														{!isOutOfStock &&
															!isLowStock &&
															stockData[product.id] && (
																<span className="prod-result__stock-tag prod-result__stock-tag--in">
																	✅ In Stock
																</span>
															)}
													</div>

													<form
														className="prod-result__quantity-form"
														onSubmit={(e) => handleAddToCart(e, product)}
													>
														<div className="prod-result__inputs">
															<div className="prod-result__quantity-box">
																<label
																	htmlFor={`quantity-${product.id}`}
																	className="prod-result__quantity__label"
																>
																	Quantity
																</label>
																<input
																	id={`quantity-${product.id}`}
																	className="prod-result__quantity"
																	type="number"
																	min="0"
																	placeholder="eg. 30"
																	value={quantities[product.id] || ""}
																	onChange={(e) =>
																		handleQuantityChange(
																			product.id,
																			e.target.value,
																		)
																	}
																	disabled={isOutOfStock}
																	required
																/>
															</div>

															<div className="prod-result__unit-box">
																<label
																	htmlFor={`unit-${product.id}`}
																	className="prod-result__select-unit__label"
																>
																	Preferred unit
																</label>
																<select
																	id={`unit-${product.id}`}
																	className="prod-result__select-unit"
																	value={units[product.id] || "kilos"}
																	onChange={(e) =>
																		handleUnitChange(product.id, e.target.value)
																	}
																	disabled={isOutOfStock}
																	required
																>
																	<option value="kilos">Kilos</option>
																	<option value="pieces">Pieces</option>
																	<option value="bundles">Bundle</option>
																	<option value="box/bag">Box / Bag</option>
																</select>
															</div>
														</div>
														<button
															type="submit"
															className="btn--form"
															disabled={isOutOfStock}
														>
															{isOutOfStock ? "Out of Stock" : "Add to Cart"}
														</button>
													</form>
												</article>
											);
										})}
									</div>
								) : (
									searchQuery && (
										<div className="no-results">
											<h3>No products found</h3>
											<p>
												Try searching with different keywords or browse our
												catalog
											</p>
										</div>
									)
								)}

								{!searchQuery && (
									<div className="search-prompt">
										<h3>Start searching for products</h3>
										<p>
											Use the search bar above to find what you're looking for
										</p>
									</div>
								)}
							</>
						)}
					</div>
				</main>
			</div>
		</>
	);
}

export default SearchResults;
