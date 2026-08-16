import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import { useCart } from "../context/CartContext";
import { useSearch } from "../hooks/useSearch";
import { toTitleCase } from "../utils/textUtils";
import "../styles/Cart.css";

function Cart() {
	const navigate = useNavigate();
	const { cartItems, removeFromCart, updateQuantity, totalItems, totalAmount, totalMrp } = useCart();
	const totalDiscount = totalMrp - totalAmount;

	const [allProducts,  setAllProducts]  = useState([]);
	const [stockData,    setStockData]    = useState({});
	const [imageErrors,  setImageErrors]  = useState({});
	const [quantities,   setQuantities]   = useState({});
	const [units,        setUnits]        = useState({});
	const [cartMsg,      setCartMsg]      = useState({});

	// useSearch powers "You May Also Need" — seed with names from cart
	const cartQuery = cartItems.map((i) => i.product.product_name).join(" ");
	const { similarProducts, setQuery } = useSearch(allProducts, stockData);

	useEffect(() => { fetchProducts(); fetchStockData(); }, []);
	useEffect(() => {
		if (cartQuery) setQuery(cartQuery);
	}, [cartQuery]);

	const fetchProducts = async () => {
		try {
			const res  = await fetch(`${API_BASE_URL}/products`);
			const data = await res.json();
			if (data.success) setAllProducts(data.data);
		} catch (e) { console.error(e); }
	};

	const fetchStockData = async () => {
		try {
			const res  = await fetch(`${API_BASE_URL}/stock`);
			const data = await res.json();
			if (data.success) {
				const map = {};
				data.data.forEach((i) => { map[i.product_id] = i; });
				setStockData(map);
			}
		} catch (e) { console.error(e); }
	};

	const { addToCart } = useCart();

	const handleQuickAdd = (e, product) => {
		e.preventDefault();
		const qty  = quantities[product.id];
		const unit = units[product.id] || "pieces";
		if (!qty || Number(qty) <= 0) return;
		addToCart(product, qty, unit);
		setQuantities((p) => ({ ...p, [product.id]: "" }));
		setCartMsg((p) => ({ ...p, [product.id]: "Added!" }));
		setTimeout(() => setCartMsg((p) => ({ ...p, [product.id]: "" })), 2000);
	};

	// Filter out products already in cart from suggestions
	const cartIds      = new Set(cartItems.map((i) => i.product.id));
	const suggestions  = similarProducts.filter((p) => !cartIds.has(p.id)).slice(0, 6);

	const handleSearchSubmit = (e) => {
		e.preventDefault();
		const q = e.target.elements.search.value;
		if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
	};

	return (
		<section className="cart-page">
			<header className="header">
				<nav className="nav">
					<img
						src="/logo-white.png"
						alt="shop logo"
						className="nav__logo"
						onClick={() => navigate("/")}
						style={{ cursor: "pointer" }}
					/>
					<form className="search" onSubmit={handleSearchSubmit}>
						<input type="text" name="search" className="search__input" placeholder="Search items" />
						<button className="search__button" type="submit">
							<ion-icon className="search__icon" name="search-outline"></ion-icon>
						</button>
					</form>
					<div className="nav__subnav">
						<div className="icon">
							<figure className="icon__box">
								<ion-icon name="heart-outline" className="icon__icon"></ion-icon>
							</figure>
							<figure className="icon__box" style={{ position: "relative" }}>
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
					<div className="cart__page">

						{cartItems.length === 0 ? (
							<div className="cart__empty">
								<ion-icon name="cart-outline" class="cart__empty__icon"></ion-icon>
								<h2>Your cart is empty</h2>
								<p>Add some products to get started</p>
								<button className="btn btn--form" onClick={() => navigate("/search")}>Browse Products</button>
							</div>
						) : (
							<>
								{/* LEFT — Cart items */}
								<div className="cart__items">
									<h2 className="cart__title">Your Cart ({totalItems} pieces)</h2>

									{cartItems.map((item, idx) => {
										const discount = Math.round(
											((item.product.mrp - item.product.selling_price) / item.product.mrp) * 100,
										);
										return (
											<div key={`${item.product.id}-${item.unit}-${idx}`} className="cart__item">
												<div className="cart__item__img-box">
													{item.product.product_images?.length > 0 ? (
														<img
															src={item.product.product_images[0]}
															alt={toTitleCase(item.product.product_name)}
															className="cart__item__img"
														/>
													) : (
														<div className="cart__item__img-placeholder">
															{item.product.product_name.charAt(0).toUpperCase()}
														</div>
													)}
												</div>

												<div className="cart__item__details">
													<h3 className="cart__item__company">
														{toTitleCase(item.product.companies?.company_name)}
													</h3>
													<h4 className="cart__item__name">
														{toTitleCase(item.product.product_name)}
													</h4>
													<p className="cart__item__unit">
														{item.quantity} {item.unit}
														{item.pieces !== item.quantity && (
															<span className="cart__item__pieces"> → {item.pieces} pieces</span>
														)}
													</p>
													<div className="cart__item__prices">
														<span className="cart__item__rate">&#8377;{item.product.selling_price}</span>
														<span className="cart__item__mrp">&#8377;{item.product.mrp}</span>
														{discount > 0 && <span className="cart__item__discount">{discount}% off</span>}
													</div>
												</div>

												<div className="cart__item__controls">
													<div className="cart__item__qty-row">
														<button
															className="cart__item__qty-btn"
															onClick={() => updateQuantity(item.product.id, item.unit, item.quantity - 1)}
														>−</button>
														<span className="cart__item__qty">{item.quantity}</span>
														<button
															className="cart__item__qty-btn"
															onClick={() => updateQuantity(item.product.id, item.unit, item.quantity + 1)}
														>+</button>
													</div>
													<p className="cart__item__subtotal">
														&#8377;{(item.product.selling_price * item.pieces).toFixed(2)}
													</p>
													<button
														className="cart__item__remove"
														onClick={() => removeFromCart(item.product.id, item.unit)}
													>
														<ion-icon name="trash-outline"></ion-icon> Remove
													</button>
												</div>
											</div>
										);
									})}
								</div>

								{/* RIGHT — Bill summary */}
								<div className="cart__summary">
									<h2 className="cart__summary__title">Price Details</h2>
									<div className="cart__summary__rows">
										<div className="cart__summary__row">
											<span>Price ({totalItems} pieces)</span>
											<span>&#8377;{totalMrp.toFixed(2)}</span>
										</div>
										<div className="cart__summary__row cart__summary__row--discount">
											<span>Discount</span>
											<span>− &#8377;{totalDiscount.toFixed(2)}</span>
										</div>
										<div className="cart__summary__row">
											<span>Delivery Charges</span>
											<span className="cart__summary__free">FREE</span>
										</div>
									</div>
									<div className="cart__summary__divider"></div>
									<div className="cart__summary__row cart__summary__row--total">
										<span>Total Amount</span>
										<span>&#8377;{totalAmount.toFixed(2)}</span>
									</div>
									{totalDiscount > 0 && (
										<p className="cart__summary__saving">
											You will save &#8377;{totalDiscount.toFixed(2)} on this order
										</p>
									)}
									<button className="cart__checkout-btn btn" disabled>
										Proceed to Checkout
										<ion-icon name="arrow-forward-outline"></ion-icon>
									</button>
									<p className="cart__checkout-note">Checkout coming soon</p>
								</div>
							</>
						)}
					</div>

					{/* YOU MAY ALSO NEED — shown when cart has items and suggestions exist */}
					{cartItems.length > 0 && suggestions.length > 0 && (
						<div className="cart__suggestions">
							<div className="cart__suggestions__header">
								<h3 className="cart__suggestions__title">You May Also Need</h3>
								<p className="cart__suggestions__subtitle">Based on what's in your cart</p>
							</div>
							<div className="cart__suggestions__row">
								{suggestions.map((product) => {
									const discount = Math.round(
										((product.mrp - product.selling_price) / product.mrp) * 100,
									);
									return (
										<article key={product.id} className="cart__sug__card">
											{product.product_images?.length > 0 && !imageErrors[product.id] ? (
												<img
													src={product.product_images[0]}
													alt={toTitleCase(product.product_name)}
													className="cart__sug__img"
													onError={() => setImageErrors((p) => ({ ...p, [product.id]: true }))}
												/>
											) : (
												<div className="cart__sug__img-placeholder">
													{product.product_name.charAt(0).toUpperCase()}
												</div>
											)}
											<h4 className="cart__sug__company">
												{toTitleCase(product.companies?.company_name)}
											</h4>
											<h3 className="cart__sug__name">
												{toTitleCase(product.product_name)}
											</h3>
											<div className="cart__sug__prices">
												<span className="cart__sug__rate">&#8377;{product.selling_price}</span>
												{discount > 0 && (
													<span className="cart__sug__discount">{discount}% off</span>
												)}
											</div>
											<form
												className="cart__sug__form"
												onSubmit={(e) => handleQuickAdd(e, product)}
											>
												<input
													type="number"
													min="0"
													placeholder="Qty"
													className="cart__sug__qty"
													value={quantities[product.id] || ""}
													onChange={(e) =>
														setQuantities((p) => ({ ...p, [product.id]: e.target.value }))
													}
												/>
												<select
													className="cart__sug__unit"
													value={units[product.id] || "pieces"}
													onChange={(e) =>
														setUnits((p) => ({ ...p, [product.id]: e.target.value }))
													}
												>
													<option value="pieces">Pcs</option>
													<option value="kilos">Kg</option>
													<option value="box/bag">Box</option>
												</select>
												<button className="cart__sug__btn btn--form btn" type="submit">
													{cartMsg[product.id] || "+ Add"}
												</button>
											</form>
										</article>
									);
								})}
							</div>
						</div>
					)}
				</div>
			</main>
		</section>
	);
}

export default Cart;
