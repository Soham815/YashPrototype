import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import OverdueReminder from "./OverdueReminder";
import "../styles/LandingPage.css";

export default function LandingPage() {
	const navigate       = useNavigate();
	const { customer, logout } = useAuth();
	const { totalItems } = useCart();
	const [searchQuery, setSearchQuery] = useState("");

	const handleSearch = (e) => {
		e.preventDefault();
		if (searchQuery.trim())
			navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
	};

	return (
		<section className="landing-page">
			{/* ── NAV ── */}
			<header className="header">
				<nav className="nav">
					<img src="/logo-white.png" alt="logo" className="nav__logo" />

					<form className="search" onSubmit={handleSearch}>
						<input
							type="text"
							className="search__input"
							placeholder="Search products..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
						<button className="search__button" type="submit">
							<ion-icon name="search-outline" class="search__icon"></ion-icon>
						</button>
					</form>

					<div className="nav__subnav">
						<div className="icon">
							<figure className="icon__box">
								<ion-icon name="heart-outline" class="icon__icon"></ion-icon>
							</figure>
							<figure
								className="icon__box"
								onClick={() => navigate("/cart")}
								style={{ position: "relative", cursor: "pointer" }}
							>
								<ion-icon name="cart-outline" class="icon__icon"></ion-icon>
								{totalItems > 0 && (
									<span className="nav__cart-count">{totalItems}</span>
								)}
							</figure>
							<figure
								className="icon__box"
								onClick={() => navigate(customer ? "/orders" : "/login")}
								style={{ cursor: "pointer" }}
							>
								<ion-icon name="albums-outline" class="icon__icon"></ion-icon>
							</figure>
						</div>

						<div className="nav__seperation">&nbsp;</div>

						{customer ? (
							<div className="nav__customer">
								<span
									className="nav__customer__name"
									onClick={() => navigate("/finance")}
									title="My Account"
								>
									{customer.customer_name?.split(" ")[0]}
								</span>
								<button className="nav__logout-btn" onClick={logout} title="Logout">
									<ion-icon name="log-out-outline" class="nav__logout-icon"></ion-icon>
								</button>
							</div>
						) : (
							<div className="nav__auth-links">
								<button className="nav__login-btn" onClick={() => navigate("/login")}>
									Login
								</button>
								<button className="nav__signup-btn" onClick={() => navigate("/signup")}>
									Sign Up
								</button>
							</div>
						)}
					</div>
				</nav>
			</header>

			{/* ── OVERDUE REMINDER (only for logged-in customers with debt) ── */}
			{customer && <OverdueReminder />}

			{/* ── HERO ── */}
			<div className="hero container">
				<div className="hero__text-box">
					{customer ? (
						<>
							<h1 className="hero__heading">
								Welcome back,<br />
								<span className="hero__heading--highlight">
									{customer.customer_name?.split(" ")[0]}
								</span>
							</h1>
							<p className="hero__description">
								Browse our latest stock and place your wholesale order.
							</p>
							<div className="hero__btns">
								<button
									className="btn btn--primary hero__btn"
									onClick={() => navigate("/search?q=")}
								>
									Browse Products
								</button>
								<button
									className="btn btn--secondary hero__btn"
									onClick={() => navigate("/orders")}
								>
									My Orders
								</button>
							</div>
						</>
					) : (
						<>
							<h1 className="hero__heading">
								Wholesale prices,<br />
								<span className="hero__heading--highlight">delivered to you.</span>
							</h1>
							<p className="hero__description">
								Quality grocery products at wholesale rates. Sign up for a business account and start ordering today.
							</p>
							<div className="hero__btns">
								<button
									className="btn btn--primary hero__btn"
									onClick={() => navigate("/signup")}
								>
									Create Account
								</button>
								<button
									className="btn btn--secondary hero__btn"
									onClick={() => navigate("/search?q=")}
								>
									Browse Products
								</button>
							</div>
						</>
					)}
				</div>

				<div className="hero__img-box">
					<img src="/hero.png" alt="wholesale groceries" className="hero__img" />
				</div>
			</div>

			{/* ── QUICK LINKS (logged-in only) ── */}
			{customer && (
				<div className="landing__quick container--orange">
					<div className="landing__quick__grid">
						<div
							className="landing__quick__card"
							onClick={() => navigate("/orders")}
						>
							<ion-icon name="albums-outline" class="landing__quick__icon"></ion-icon>
							<span>My Orders</span>
						</div>
						<div
							className="landing__quick__card"
							onClick={() => navigate("/finance")}
						>
							<ion-icon name="wallet-outline" class="landing__quick__icon"></ion-icon>
							<span>My Account</span>
						</div>
						<div
							className="landing__quick__card"
							onClick={() => navigate("/preorders")}
						>
							<ion-icon name="time-outline" class="landing__quick__icon"></ion-icon>
							<span>Preorders</span>
						</div>
						<div
							className="landing__quick__card"
							onClick={() => navigate("/search?q=")}
						>
							<ion-icon name="search-outline" class="landing__quick__icon"></ion-icon>
							<span>Browse All</span>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}
