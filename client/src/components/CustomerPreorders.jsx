import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { toTitleCase } from "../utils/textUtils";
import { API_BASE_URL } from "../config/api";
import "../styles/CustomerPreorders.css";

const STATUS_LABELS = {
	waiting:              { label: "In Queue",            color: "blue"   },
	partially_fulfilled:  { label: "Partially Fulfilled", color: "orange" },
	fulfilled:            { label: "Fulfilled",           color: "green"  },
	cancelled:            { label: "Cancelled",           color: "grey"   },
};

export default function CustomerPreorders() {
	const navigate = useNavigate();
	const { customer, logout } = useAuth();
	const { totalItems } = useCart();

	const [preorders,   setPreorders]   = useState([]);
	const [loading,     setLoading]     = useState(true);
	const [cancelling,  setCancelling]  = useState(null);
	const [message,     setMessage]     = useState({ type: "", text: "" });
	const [searchQuery, setSearchQuery] = useState("");

	useEffect(() => {
		if (!customer) { navigate("/login"); return; }
		fetchPreorders();
	}, [customer]);

	const fetchPreorders = async () => {
		try {
			setLoading(true);
			const res  = await fetch(`${API_BASE_URL}/preorders/customer/${customer.id}`);
			const data = await res.json();
			if (data.success) setPreorders(data.data);
		} catch (e) { console.error(e); }
		finally { setLoading(false); }
	};

	const handleCancel = async (id) => {
		if (!window.confirm("Cancel this preorder?")) return;
		setCancelling(id);
		try {
			const res  = await fetch(`${API_BASE_URL}/preorders/${id}`, { method: "DELETE" });
			const data = await res.json();
			if (res.ok) {
				setMessage({ type: "success", text: "Preorder cancelled" });
				setPreorders((prev) => prev.map((p) =>
					p.id === id ? { ...p, status: "cancelled" } : p
				));
			} else {
				setMessage({ type: "error", text: data.error });
			}
		} catch (e) {
			setMessage({ type: "error", text: "Network error" });
		} finally {
			setCancelling(null);
			setTimeout(() => setMessage({ type: "", text: "" }), 3000);
		}
	};

	const handleSearchSubmit = (e) => {
		e.preventDefault();
		if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
	};

	const active    = preorders.filter((p) => ["waiting", "partially_fulfilled"].includes(p.status));
	const completed = preorders.filter((p) => ["fulfilled", "cancelled"].includes(p.status));

	if (!customer) return null;

	return (
		<section className="preorders-page">
			<header className="header">
				<nav className="nav">
					<img src="/logo-white.png" alt="logo" className="nav__logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }} />
					<form className="search" onSubmit={handleSearchSubmit}>
						<input type="text" className="search__input" placeholder="Search items" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
						<button className="search__button" type="submit">
							<ion-icon className="search__icon" name="search-outline"></ion-icon>
						</button>
					</form>
					<div className="nav__subnav">
						<div className="icon">
							<figure className="icon__box"><ion-icon name="heart-outline" className="icon__icon"></ion-icon></figure>
							<figure className="icon__box" onClick={() => navigate("/cart")} style={{ cursor: "pointer", position: "relative" }}>
								<ion-icon name="cart-outline" className="icon__icon"></ion-icon>
								{totalItems > 0 && <span className="nav__cart-count">{totalItems}</span>}
							</figure>
							<figure className="icon__box" style={{ cursor: "pointer" }} onClick={() => navigate("/orders")}>
								<ion-icon name="albums-outline" className="icon__icon"></ion-icon>
							</figure>
							<figure className="icon__box" style={{ cursor: "pointer" }} onClick={() => navigate("/finance")}>
								<ion-icon name="wallet-outline" className="icon__icon"></ion-icon>
							</figure>
						</div>
						<div className="nav__seperation">&nbsp;</div>
						<img src="/profile-pic.jpeg" alt="profile" className="nav__profile-pic" style={{ cursor: "pointer" }} onClick={logout} title="Logout" />
					</div>
				</nav>
			</header>

			<main>
				<div className="container container--orange">
					<div className="po-content">
						<div className="po-header">
							<h2 className="po-title">My Preorders</h2>
							<p className="po-subtitle">{active.length} active · {completed.length} completed</p>
						</div>

						{message.text && (
							<div className={`po-message po-message--${message.type}`}>{message.text}</div>
						)}

						{loading ? (
							<div className="po-loading"><div className="spinner" /><p>Loading preorders...</p></div>
						) : preorders.length === 0 ? (
							<div className="po-empty">
								<div className="po-empty__icon">🕐</div>
								<h3>No preorders yet</h3>
								<p>When a product is out of stock you can preorder it and we will fulfil it as soon as stock arrives</p>
								<button className="btn btn--form" onClick={() => navigate("/search")}>Browse Products</button>
							</div>
						) : (
							<>
								{/* Active preorders */}
								{active.length > 0 && (
									<div className="po-section">
										<h3 className="po-section__title">Active Preorders</h3>
										<div className="po-list">
											{active.map((entry) => {
												const statusInfo = STATUS_LABELS[entry.status];
												const pct = entry.pieces_requested > 0
													? Math.round((entry.pieces_fulfilled / entry.pieces_requested) * 100)
													: 0;

												return (
													<div key={entry.id} className="po-card">
														<div className="po-card__img-box">
															{entry.products?.product_images?.[0] ? (
																<img src={entry.products.product_images[0]} alt={toTitleCase(entry.products?.product_name)} className="po-card__img" />
															) : (
																<div className="po-card__img-placeholder">
																	{(entry.products?.product_name || "P").charAt(0).toUpperCase()}
																</div>
															)}
														</div>

														<div className="po-card__details">
															<h4 className="po-card__company">
																{toTitleCase(entry.products?.companies?.company_name)}
															</h4>
															<h3 className="po-card__name">
																{toTitleCase(entry.products?.product_name)}
															</h3>
															<p className="po-card__qty">
																{entry.quantity_display} {entry.unit_display}
																<span> ({entry.pieces_requested} pieces)</span>
															</p>
															<p className="po-card__position">
																Queue position: <strong>#{entry.queue_position}</strong>
															</p>
															<p className="po-card__date">
																Added {new Date(entry.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
															</p>
														</div>

														<div className="po-card__right">
															<span className={`po-card__status po-status--${statusInfo.color}`}>
																{statusInfo.label}
															</span>

															{entry.status === "partially_fulfilled" && (
																<div className="po-card__progress">
																	<div className="po-progress__bar">
																		<div className="po-progress__fill" style={{ width: `${pct}%` }} />
																	</div>
																	<span className="po-progress__label">
																		{entry.pieces_fulfilled}/{entry.pieces_requested} pieces filled
																	</span>
																</div>
															)}

															{entry.status !== "cancelled" && (
																<button
																	className="po-card__cancel"
																	onClick={() => handleCancel(entry.id)}
																	disabled={cancelling === entry.id}
																>
																	{cancelling === entry.id ? "..." : "Cancel"}
																</button>
															)}
														</div>
													</div>
												);
											})}
										</div>
									</div>
								)}

								{/* Completed preorders */}
								{completed.length > 0 && (
									<div className="po-section">
										<h3 className="po-section__title">Completed / Cancelled</h3>
										<div className="po-list">
											{completed.map((entry) => {
												const statusInfo = STATUS_LABELS[entry.status];
												return (
													<div key={entry.id} className={`po-card po-card--${entry.status}`}>
														<div className="po-card__img-box">
															{entry.products?.product_images?.[0] ? (
																<img src={entry.products.product_images[0]} alt={toTitleCase(entry.products?.product_name)} className="po-card__img" />
															) : (
																<div className="po-card__img-placeholder">
																	{(entry.products?.product_name || "P").charAt(0).toUpperCase()}
																</div>
															)}
														</div>
														<div className="po-card__details">
															<h4 className="po-card__company">{toTitleCase(entry.products?.companies?.company_name)}</h4>
															<h3 className="po-card__name">{toTitleCase(entry.products?.product_name)}</h3>
															<p className="po-card__qty">{entry.pieces_requested} pieces</p>
														</div>
														<span className={`po-card__status po-status--${statusInfo.color}`}>
															{statusInfo.label}
														</span>
													</div>
												);
											})}
										</div>
									</div>
								)}
							</>
						)}
					</div>
				</div>
			</main>
		</section>
	);
}
