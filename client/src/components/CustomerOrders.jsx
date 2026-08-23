import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { toTitleCase } from "../utils/textUtils";
import { API_BASE_URL } from "../config/api";
import "../styles/CustomerOrders.css";
import OrderProgress from "./OrderProgress";

const STATUS_LABELS = {
	placed:           { label: "Placed",           color: "blue"   },
	delivered:        { label: "Delivered",         color: "green"  },
	return_requested: { label: "Return Requested",  color: "orange" },
	returned:         { label: "Returned",          color: "grey"   },
};

export default function CustomerOrders() {
	const navigate = useNavigate();
	const { customer, logout } = useAuth();
	const { totalItems } = useCart();

	const [orders,  setOrders]  = useState([]);
	const [loading, setLoading] = useState(true);
	const [expanded, setExpanded] = useState(null);
	const [searchQuery, setSearchQuery] = useState("");

	useEffect(() => {
		if (!customer) { navigate("/login"); return; }
		fetchOrders();
	}, [customer]);

	const fetchOrders = async () => {
		try {
			setLoading(true);
			const res  = await fetch(`${API_BASE_URL}/orders/customer/${customer.id}`);
			const data = await res.json();
			if (data.success) setOrders(data.data);
		} catch (e) { console.error(e); }
		finally { setLoading(false); }
	};

	const handleSearchSubmit = (e) => {
		e.preventDefault();
		if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
	};

	if (!customer) return null;

	return (
		<section className="orders-page">
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
							<figure
								className="icon__box"
								style={{ cursor: "pointer" }}
								onClick={() => navigate("/orders")}
							>
								<ion-icon name="albums-outline" className="icon__icon"></ion-icon>
							</figure>
							<figure
								className="icon__box"
								style={{ cursor: "pointer" }}
								onClick={() => navigate("/finance")}
							>
								<ion-icon name="wallet-outline" className="icon__icon"></ion-icon>
							</figure>
							<figure
								className="icon__box"
								style={{ cursor: "pointer" }}
								onClick={() => navigate("/preorders")}
							>
								<ion-icon name="time-outline" className="icon__icon"></ion-icon>
							</figure>
						</div>
						<div className="nav__seperation">&nbsp;</div>
						<img
							src="/profile-pic.jpeg"
							alt="profile"
							className="nav__profile-pic"
							style={{ cursor: "pointer" }}
							onClick={logout}
							title="Logout"
						/>
					</div>
				</nav>
			</header>

			<main>
				<div className="container container--orange">
					<div className="orders-content">
						<div className="orders-header">
							<h2 className="orders-title">My Orders</h2>
							<p className="orders-subtitle">
								Welcome, {toTitleCase(customer.name)}
							</p>
						</div>

						{loading ? (
							<div className="orders-loading">
								<div className="spinner" />
								<p>Loading your orders...</p>
							</div>
						) : orders.length === 0 ? (
							<div className="orders-empty">
								<div className="orders-empty__icon">📦</div>
								<h3>No orders yet</h3>
								<p>Start shopping to see your orders here</p>
								<button className="btn btn--form" onClick={() => navigate("/search")}>
									Browse Products
								</button>
							</div>
						) : (
							<div className="orders-list">
								{orders.map((order) => {
									const statusInfo = STATUS_LABELS[order.status] || { label: order.status, color: "grey" };
									const isExpanded = expanded === order.id;

									return (
										<div key={order.id} className="order-card">
											<div
												className="order-card__header"
												onClick={() => setExpanded(isExpanded ? null : order.id)}
											>
												<div className="order-card__id">
													<span className="order-card__id__label">Order</span>
													<span className="order-card__id__value">#{order.id}</span>
												</div>

												<div className="order-card__meta">
													<span className="order-card__date">
														{new Date(order.created_at).toLocaleDateString("en-IN", {
															day: "numeric", month: "short", year: "numeric",
														})}
													</span>
													<span className={`order-card__status order-card__status--${statusInfo.color}`}>
														{statusInfo.label}
													</span>
												</div>

												<div className="order-card__summary">
													<span className="order-card__pieces">{order.total_pieces} pieces</span>
													<span className="order-card__amount">&#8377;{Number(order.total_amount).toFixed(2)}</span>
												</div>

												<span className={`order-card__chevron ${isExpanded ? "order-card__chevron--up" : ""}`}>
													▼
												</span>
											</div>

											<OrderProgress status={order.status} />

											{isExpanded && (
												<div className="order-card__items">
													{(order.order_items || []).map((item) => {
														return (
															<div key={item.id} className="order-item">
																<div className="order-item__img-box">
																	{item.products?.product_images?.[0] ? (
																		<img
																			src={item.products.product_images[0]}
																			alt={toTitleCase(item.products.product_name)}
																			className="order-item__img"
																		/>
																	) : (
																		<div className="order-item__img-placeholder">
																			{(item.products?.product_name || "P").charAt(0).toUpperCase()}
																		</div>
																	)}
																</div>

																<div className="order-item__details">
																	<h4 className="order-item__company">
																		{toTitleCase(item.products?.companies?.company_name)}
																	</h4>
																	<h3 className="order-item__name">
																		{toTitleCase(item.products?.product_name)}
																	</h3>
																	<p className="order-item__qty">
																		{item.quantity_display} {item.unit_display}
																		{item.pieces !== item.quantity_display && (
																			<span> → {item.pieces} pieces</span>
																		)}
																	</p>
																</div>

																<div className="order-item__prices">
																	<span className="order-item__rate">
																		&#8377;{item.price_per_piece} × {item.pieces}
																	</span>
																	<span className="order-item__subtotal">
																		&#8377;{Number(item.subtotal).toFixed(2)}
																	</span>
																	<span className={`order-item__status order-card__status--${STATUS_LABELS[item.status]?.color || "grey"}`}>
																		{STATUS_LABELS[item.status]?.label || item.status}
																	</span>
																</div>
															</div>
														);
													})}

													<div className="order-card__total">
														<span>Total</span>
														<span>&#8377;{Number(order.total_amount).toFixed(2)}</span>
													</div>
												</div>
											)}
										</div>
									);
								})}
							</div>
						)}
					</div>
				</div>
			</main>
		</section>
	);
}
