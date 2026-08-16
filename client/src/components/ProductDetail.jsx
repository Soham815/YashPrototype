import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import { useCart } from "../context/CartContext";
import { toTitleCase } from "../utils/textUtils";
import "../styles/ProductDetail.css";

function ProductDetail() {
	const { id }     = useParams();
	const navigate   = useNavigate();
	const { addToCart, totalItems } = useCart();

	const [product,     setProduct]     = useState(null);
	const [stock,       setStock]       = useState(null);
	const [loading,     setLoading]     = useState(true);
	const [error,       setError]       = useState(null);
	const [activeImg,   setActiveImg]   = useState(0);
	const [searchQuery, setSearchQuery] = useState("");
	const [quantity,    setQuantity]    = useState("");
	const [unit,        setUnit]        = useState("pieces");
	const [cartMsg,     setCartMsg]     = useState("");

	useEffect(() => { fetchProduct(); fetchStock(); }, [id]);

	const fetchProduct = async () => {
		try {
			setLoading(true);
			const res  = await fetch(`${API_BASE_URL}/products/${id}`);
			const data = await res.json();
			if (data.success) { setProduct(data.data); setActiveImg(0); }
			else setError("Product not found");
		} catch (e) { setError("Failed to load product"); }
		finally { setLoading(false); }
	};

	const fetchStock = async () => {
		try {
			const res  = await fetch(`${API_BASE_URL}/stock/product/${id}`);
			const data = await res.json();
			if (data.success) setStock(data.data);
		} catch (e) { console.error(e); }
	};

	const calculateDiscount = (mrp, selling) => {
		if (!mrp || !selling) return 0;
		return Math.round(((mrp - selling) / mrp) * 100);
	};

	const getStockStatus = () => {
		if (!stock) return null;
		if (stock.quantity === 0) return "out";
		if (stock.quantity < stock.low_stock_threshold) return "low";
		return "in";
	};

	const handleSearchSubmit = (e) => {
		e.preventDefault();
		if (searchQuery.trim())
			navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
	};

	const handleAddToCart = () => {
		if (!quantity || Number(quantity) <= 0) return;
		addToCart(product, quantity, unit);
		setCartMsg("Added to cart!");
		setQuantity("");
		setTimeout(() => setCartMsg(""), 2000);
	};

	const handleBuyNow = () => {
		if (!quantity || Number(quantity) <= 0) return;
		addToCart(product, quantity, unit);
		navigate("/cart");
	};

	const stockStatus = getStockStatus();
	const discount    = product ? calculateDiscount(product.mrp, product.selling_price) : 0;
	const images      = product?.product_images || [];

	return (
		<section className="product-page">
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
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
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
					{loading && (
						<div className="prod__loading">
							<div className="spinner" />
							<p>Loading product...</p>
						</div>
					)}

					{error && !loading && (
						<div className="prod__error">
							<h2>Oops!</h2>
							<p>{error}</p>
						</div>
					)}

					{product && !loading && (
						<div className="prod__page">

							{/* LEFT — Gallery */}
							<div className="prod__gallery">
								<img
									src={images[activeImg] || ""}
									alt={toTitleCase(product.product_name)}
									className="prod__img"
								/>

								{images.length > 1 && (
									<div className="prod__thumbnails">
										{images.map((img, i) => (
											<img
												key={i}
												src={img}
												alt={`view ${i + 1}`}
												className={`prod__thumbnail${activeImg === i ? " prod__thumbnail--active" : ""}`}
												onClick={() => setActiveImg(i)}
											/>
										))}
									</div>
								)}

								{/* Quantity + unit form */}
								<form
									className="prod__quantity-form"
									onSubmit={(e) => { e.preventDefault(); handleAddToCart(); }}
								>
									<div className="prod__quantity-inputs">
										<div className="prod-result__quantity-box">
											<label className="prod-result__quantity__label">Quantity</label>
											<input
												className="prod-result__quantity"
												type="number"
												min="0"
												placeholder="eg. 30"
												value={quantity}
												onChange={(e) => setQuantity(e.target.value)}
											/>
										</div>
										<div className="prod-result__unit-box">
											<label className="prod-result__select-unit__label">Preferred unit</label>
											<select
												className="prod-result__select-unit"
												value={unit}
												onChange={(e) => setUnit(e.target.value)}
											>
												<option value="pieces">Pieces</option>
												<option value="kilos">Kilos</option>
												<option value="box/bag">Box / Bag</option>
											</select>
										</div>
									</div>
								</form>

								<div className="prod__btns">
									<button
										className="prod__cart btn"
										onClick={handleAddToCart}
										disabled={stockStatus === "out"}
									>
										<ion-icon name="cart-outline" class="prod__cart__icon"></ion-icon>
										<span>{cartMsg || "Add to cart"}</span>
									</button>
									<button
										className="prod__buy btn"
										onClick={handleBuyNow}
										disabled={stockStatus === "out"}
									>
										<ion-icon name="bag-remove-outline" class="prod__buy__icon"></ion-icon>
										<span>Buy now</span>
									</button>
								</div>
							</div>

							{/* RIGHT — Description */}
							<div className="prod__description">
								<h2 className="prod__company-name">
									{toTitleCase(product.companies?.company_name)}
								</h2>
								<h3 className="prod__title">
									{toTitleCase(product.product_name)}
								</h3>

								{stockStatus === "out" && <p className="prod__stock-tag prod__stock-tag--out">Out of Stock</p>}
								{stockStatus === "low" && <p className="prod__stock-tag prod__stock-tag--low">Only a few left!</p>}

								<div className="prod__prices">
									<p className="prod__mrp">&#8377;{product.mrp}</p>
									<p className="prod__rate">&#8377;{product.selling_price}</p>
									{discount > 0 && <p className="prod__discount">{discount}% off</p>}
								</div>

								<div className="prod__features">
									<div className="prod__feature">
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="prod__feature__icon">
											<path d="M24,12c0-1.696-.86-3.191-2.168-4.073,.301-1.548-.148-3.213-1.347-4.413-1.199-1.199-2.864-1.648-4.413-1.347-.882-1.308-2.377-2.168-4.073-2.168s-3.191,.86-4.073,2.168c-1.548-.301-3.214,.148-4.413,1.347-1.199,1.199-1.648,2.864-1.347,4.413-1.308,.882-2.168,2.377-2.168,4.073s.86,3.191,2.168,4.073c-.301,1.548,.148,3.214,1.347,4.413,1.199,1.199,2.864,1.648,4.413,1.347,.882,1.308,2.377,2.168,4.073,2.168s3.191-.86,4.073-2.168c1.548,.301,3.214-.148,4.413-1.347,1.199-1.199,1.648-2.864,1.347-4.413,1.308-.882,2.168-2.377,2.168-4.073Zm-16-3c0-.552,.448-1,1-1s1,.448,1,1-.448,1-1,1-1-.448-1-1Zm2.766,7h-2.332l4.8-8h2.332l-4.8,8Zm4.234,0c-.552,0-1-.448-1-1s.448-1,1-1,1,.448,1,1-.448,1-1,1Z" />
										</svg>
										<p className="prod__feature__description">Big Savings Await: Enjoy Huge Discounts!</p>
									</div>
									<div className="prod__feature">
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="prod__feature__icon">
											<path d="M20,22V5c0-1.654-1.346-3-3-3h-1.19c-.18-.507-.48-.968-.908-1.319C14.205,.109,13.298-.115,12.412,.059L6.411,1.259c-1.397,.28-2.411,1.518-2.411,2.941V22H0v2H24v-2h-4Zm-7.5-8.75c-.828,0-1.5-.672-1.5-1.5s.672-1.5,1.5-1.5,1.5,.672,1.5,1.5-.672,1.5-1.5,1.5Zm5.5,8.75h-2V4h1c.551,0,1,.448,1,1V22Z" />
										</svg>
										<p className="prod__feature__description">Get safe delivery at your doorstep</p>
									</div>
									<div className="prod__feature">
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="prod__feature__icon">
											<path d="m14.181.207a1 1 0 0 0 -1.181.983v2.879a8.053 8.053 0 1 0 6.931 6.931h2.886a1 1 0 0 0 .983-1.181 12.047 12.047 0 0 0 -9.619-9.612zm1.819 12.793h-2.277a1.994 1.994 0 1 1 -2.723-2.723v-3.277a1 1 0 0 1 2 0v3.277a2 2 0 0 1 .723.723h2.277a1 1 0 0 1 0 2z" />
										</svg>
										<p className="prod__feature__description">Get Your Order Delivered in Just 3 Hours!</p>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			</main>
		</section>
	);
}

export default ProductDetail;
