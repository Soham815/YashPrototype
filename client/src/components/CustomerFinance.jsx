import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { API_BASE_URL } from "../config/api";
import { toTitleCase } from "../utils/textUtils";
import "../styles/CustomerFinance.css";

export default function CustomerFinance() {
	const navigate       = useNavigate();
	const { customer, logout } = useAuth();
	const { totalItems } = useCart();

	const [finance,     setFinance]     = useState(null);
	const [loading,     setLoading]     = useState(true);
	const [searchQuery, setSearchQuery] = useState("");

	useEffect(() => {
		if (!customer) { navigate("/login"); return; }
		fetchFinance();
	}, [customer]);

	const fetchFinance = async () => {
		try {
			setLoading(true);
			const res  = await fetch(`${API_BASE_URL}/finance/${customer.id}`);
			const data = await res.json();
			if (data.success) setFinance(data.data);
		} catch (e) { console.error(e); }
		finally { setLoading(false); }
	};

	const handleSearchSubmit = (e) => {
		e.preventDefault();
		if (searchQuery.trim())
			navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
	};

	if (!customer) return null;

	return (
		<section className="finance-page">
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
					<div className="cf-content">
						<div className="cf-header">
							<h2 className="cf-title">My Account</h2>
							<p className="cf-subtitle">{toTitleCase(customer.customer_name)}</p>
						</div>

						{loading ? (
							<div className="cf-loading">
								<div className="spinner" />
								<p>Loading account...</p>
							</div>
						) : !finance ? (
							<div className="cf-empty">
								<p>No finance account found. Place an order to get started.</p>
							</div>
						) : (
							<>
								{/* Balance cards */}
								<div className="cf-balance-grid">
									<div className="cf-balance-card cf-balance-card--pending">
										<span className="cf-balance-card__label">Amount Due</span>
										<span className="cf-balance-card__value">
											&#8377;{Number(finance.pending_credit).toFixed(2)}
										</span>
										<span className="cf-balance-card__note">Please pay at your earliest</span>
									</div>
									<div className="cf-balance-card cf-balance-card--billed">
										<span className="cf-balance-card__label">Total Billed</span>
										<span className="cf-balance-card__value">
											&#8377;{Number(finance.total_billed).toFixed(2)}
										</span>
									</div>
									<div className="cf-balance-card cf-balance-card--paid">
										<span className="cf-balance-card__label">Total Paid</span>
										<span className="cf-balance-card__value">
											&#8377;{Number(finance.total_paid).toFixed(2)}
										</span>
									</div>
								</div>

								{/* Transaction history */}
								<div className="cf-transactions">
									<h3 className="cf-transactions__title">Transaction History</h3>

									{(!finance.transactions || finance.transactions.length === 0) ? (
										<p className="cf-transactions__empty">No transactions yet</p>
									) : (
										<div className="cf-txn-list">
											{finance.transactions.map((txn) => (
												<div
													key={txn.id}
													className={`cf-txn cf-txn--${txn.type}`}
												>
													<div className="cf-txn__icon">
														{txn.type === "debit" ? "🛒" : "💳"}
													</div>
													<div className="cf-txn__details">
														<p className="cf-txn__note">
															{txn.note || (txn.type === "debit" ? "Order placed" : "Payment received")}
														</p>
														{txn.order_id && (
															<p className="cf-txn__order">Order #{txn.order_id}</p>
														)}
														<p className="cf-txn__date">
															{new Date(txn.created_at).toLocaleDateString("en-IN", {
																day: "numeric", month: "short", year: "numeric",
																hour: "2-digit", minute: "2-digit",
															})}
														</p>
													</div>
													<div className={`cf-txn__amount cf-txn__amount--${txn.type}`}>
														{txn.type === "debit" ? "+" : "-"}
														&#8377;{Number(txn.amount).toFixed(2)}
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							</>
						)}
					</div>
				</div>
			</main>
		</section>
	);
}
