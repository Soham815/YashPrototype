import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import { useSearch, highlightMatch } from "../hooks/useSearch";
import { useCart } from "../context/CartContext";
import { toTitleCase } from "../utils/textUtils";
import "../styles/SearchResults.css";

function SearchResults() {
	const [searchParams] = useSearchParams();
	const navigate       = useNavigate();
	const initialQuery   = searchParams.get("q") || "";
	const { addToCart, totalItems } = useCart();

	const [allProducts,  setAllProducts]  = useState([]);
	const [stockData,    setStockData]    = useState({});
	const [pageLoading,  setPageLoading]  = useState(true);
	const [imageErrors,  setImageErrors]  = useState({});
	const [quantities,   setQuantities]   = useState({});
	const [units,        setUnits]        = useState({});
	const [cartMsg,      setCartMsg]      = useState({});

	const {
		query, setQuery, debouncedQuery,
		results, similarProducts, fallbackProducts,
		suggestion, applySuggestion,
		searchHistory, commitSearch, isSearching,
	} = useSearch(allProducts, stockData);

	useEffect(() => { if (initialQuery) setQuery(initialQuery); }, []);
	useEffect(() => { fetchProducts(); fetchStockData(); }, []);
	useEffect(() => {
		if (debouncedQuery)
			navigate(`/search?q=${encodeURIComponent(debouncedQuery)}`, { replace: true });
	}, [debouncedQuery]);

	const fetchProducts = async () => {
		try {
			setPageLoading(true);
			const res  = await fetch(`${API_BASE_URL}/products`);
			const data = await res.json();
			if (data.success) setAllProducts(data.data);
		} catch (e) { console.error(e); }
		finally { setPageLoading(false); }
	};

	const fetchStockData = async () => {
		try {
			const res  = await fetch(`${API_BASE_URL}/stock`);
			const data = await res.json();
			if (data.success) {
				const map = {};
				data.data.forEach((item) => { map[item.product_id] = item; });
				setStockData(map);
			}
		} catch (e) { console.error(e); }
	};

	const calculateDiscount = (mrp, selling) => {
		if (!mrp || !selling) return 0;
		return Math.round(((mrp - selling) / mrp) * 100);
	};

	const getStockStatus = (productId) => {
		const s = stockData[productId];
		if (!s) return null;
		if (s.quantity === 0) return "out";
		if (s.quantity < s.low_stock_threshold) return "low";
		return "in";
	};

	const handleSearchSubmit = (e) => {
		e.preventDefault();
		commitSearch(query);
	};

	const handleAddToCart = (e, product) => {
		e.preventDefault();
		const qty  = quantities[product.id];
		const unit = units[product.id] || "pieces";
		if (!qty || Number(qty) <= 0) return;
		addToCart(product, qty, unit);
		setQuantities((p) => ({ ...p, [product.id]: "" }));
		setCartMsg((p) => ({ ...p, [product.id]: "Added!" }));
		setTimeout(() => setCartMsg((p) => ({ ...p, [product.id]: "" })), 2000);
	};

	const ProductCard = ({ product, showSimilarBadge = false }) => {
		const stockStatus = getStockStatus(product.id);
		const isOut       = stockStatus === "out";
		const discount    = calculateDiscount(product.mrp, product.selling_price);

		return (
			<article className={`prod-result__details${isOut ? " prod-result__details--out" : ""}`}>

				{showSimilarBadge && <span className="similar-badge">Similar</span>}
				{stockStatus === "out" && <span className="prod-result__stock-tag prod-result__stock-tag--out">Out of Stock</span>}
				{stockStatus === "low" && <span className="prod-result__stock-tag prod-result__stock-tag--low">Only a few left!</span>}

				<Link to={`/product/${product.id}`}>
					{product.product_images?.length > 0 && !imageErrors[product.id] ? (
						<img
							src={product.product_images[0]}
							alt={toTitleCase(product.product_name)}
							className="prod-result__img"
							onError={() => setImageErrors((p) => ({ ...p, [product.id]: true }))}
							loading="lazy"
						/>
					) : (
						<div className="prod-result__img-placeholder">
							{product.product_name.charAt(0).toUpperCase()}
						</div>
					)}
				</Link>

				<button className="prod-result__wishlist">
					<svg xmlns="http://www.w3.org/2000/svg" className="prod-result__wishlist__icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
					</svg>
				</button>

				<h3 className="prod-result__company-name">
					{toTitleCase(product.companies?.company_name)}
				</h3>

				<h4
					className="prod-result__title"
					dangerouslySetInnerHTML={highlightMatch(
						toTitleCase(product.product_name),
						debouncedQuery,
					)}
				/>

				<div className="prod-result__prices">
					<p className="prod-result__mrp">&#8377;{product.mrp}</p>
					<p className="prod-result__rate">&#8377;{product.selling_price}</p>
					{discount > 0 && <p className="prod-result__discount">{discount}% off</p>}
				</div>

				<form
					className="prod-result__quantity-form"
					name="select-quantity"
					onSubmit={(e) => handleAddToCart(e, product)}
				>
					<div className="prod-result__inputs">
						<div className="prod-result__quantity-box">
							<label htmlFor={`qty-${product.id}`} className="prod-result__quantity__label">Quantity</label>
							<input
								id={`qty-${product.id}`}
								className="prod-result__quantity"
								type="number"
								min="0"
								placeholder="eg. 30"
								required
								value={quantities[product.id] || ""}
								onChange={(e) => setQuantities((p) => ({ ...p, [product.id]: e.target.value }))}
							/>
						</div>
						<div className="prod-result__unit-box">
							<label htmlFor={`unit-${product.id}`} className="prod-result__select-unit__label">Preferred unit</label>
							<select
								id={`unit-${product.id}`}
								className="prod-result__select-unit"
								required
								value={units[product.id] || "pieces"}
								onChange={(e) => setUnits((p) => ({ ...p, [product.id]: e.target.value }))}
							>
								<option value="pieces">Pieces</option>
								<option value="kilos">Kilos</option>
								<option value="box/bag">Box / Bag</option>
							</select>
						</div>
					</div>
					<button className="btn btn--form" type="submit" disabled={isOut}>
						{cartMsg[product.id] ? cartMsg[product.id] : "Add to Cart"}
					</button>
				</form>

			</article>
		);
	};

	return (
		<section className="search-result">
			<header className="header">
				<nav className="nav">
					<img
						src="/logo-white.png"
						alt="shop logo"
						className="nav__logo"
						onClick={() => navigate("/")}
						style={{ cursor: "pointer" }}
					/>
					<form action="#" className="search" onSubmit={handleSearchSubmit}>
						<input
							type="text"
							className="search__input"
							placeholder="Search items"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
						/>
						<button className="search__button" type="submit">
							<ion-icon className="search__icon" name="search-outline"></ion-icon>
						</button>
					</form>
					<div className="nav__subnav">
						<div className="icon">
							<figure className="icon__box">
								<ion-icon name="heart-outline" className="icon__icon"></ion-icon>
							</figure>
							<figure
								className="icon__box"
								onClick={() => navigate("/cart")}
								style={{ cursor: "pointer", position: "relative" }}
							>
								<ion-icon name="cart-outline" className="icon__icon"></ion-icon>
								{totalItems > 0 && <span className="nav__cart-count">{totalItems}</span>}
							</figure>
							<figure className="icon__box">
								<ion-icon name="albums-outline" className="icon__icon"></ion-icon>
							</figure>
						</div>
						<div className="nav__seperation">&nbsp;</div>
						<img src="/profile-pic.jpeg" alt="profile" className="nav__profile-pic" />
					</div>
				</nav>
			</header>

			<main>
				<div className="container container--orange">
					{pageLoading ? (
						<div className="loading-state">
							<div className="spinner" />
							<p>Loading products...</p>
						</div>
					) : (
						<>
							{!debouncedQuery && (
								<div className="search-prompt">
									{searchHistory.length > 0 ? (
										<>
											<h3>Recent searches</h3>
											<div className="search-history">
												{searchHistory.map((h, i) => (
													<button key={i} className="search-history__item" onClick={() => setQuery(h)}>{h}</button>
												))}
											</div>
										</>
									) : (
										<>
											<h3>Start searching for products</h3>
											<p>Use the search bar above to find what you are looking for</p>
										</>
									)}
								</div>
							)}

							{isSearching && <div className="search-searching"><div className="spinner" /></div>}

							{debouncedQuery && !isSearching && (
								<>
									<div className="search-result__header">
										<h2 className="search-result__title">Results for "{debouncedQuery}"</h2>
										<p className="search-result__count">
											{results.length} product{results.length !== 1 ? "s" : ""} found
										</p>
										{suggestion && (
											<div className="did-you-mean">
												Did you mean{" "}
												<button className="did-you-mean__btn" onClick={() => applySuggestion(suggestion)}>
													{suggestion}
												</button>?
											</div>
										)}
									</div>

									{results.length > 0 ? (
										<div className="products">
											{results.map((p) => <ProductCard key={p.id} product={p} />)}
										</div>
									) : (
										<div className="no-results">
											<h3>No products found for "{debouncedQuery}"</h3>
											{suggestion && (
												<p>
													Try{" "}
													<button className="did-you-mean__btn" onClick={() => applySuggestion(suggestion)}>
														{suggestion}
													</button>{" "}
													instead
												</p>
											)}
											{fallbackProducts.length > 0 && (
												<>
													<p className="fallback-label">You might like these popular products:</p>
													<div className="products">
														{fallbackProducts.map((p) => <ProductCard key={p.id} product={p} />)}
													</div>
												</>
											)}
										</div>
									)}

									{similarProducts.length > 0 && results.length > 0 && (
										<div className="similar-section">
											<div className="similar-section__header">
												<h3 className="similar-section__title">Similar Products</h3>
												<p className="similar-section__subtitle">Based on your search</p>
											</div>
											<div className="products">
												{similarProducts.map((p) => (
													<ProductCard key={p.id} product={p} showSimilarBadge={true} />
												))}
											</div>
										</div>
									)}
								</>
							)}
						</>
					)}
				</div>
			</main>
		</section>
	);
}

export default SearchResults;
