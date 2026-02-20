import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/Navbar.css";

function Navbar({ onSearch, searchQuery, setSearchQuery }) {
	const navigate = useNavigate();
	const [showProfileMenu, setShowProfileMenu] = useState(false);

	const handleSearchSubmit = (e) => {
		e.preventDefault();
		if (searchQuery.trim()) {
			navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
			if (onSearch) {
				onSearch(searchQuery);
			}
		}
	};

	const handleSearchChange = (e) => {
		const value = e.target.value;
		setSearchQuery(value);
		if (onSearch) {
			onSearch(value);
		}
	};

	return (
		<header className="header">
			<nav className="nav">
				<Link to="/">
					<img src="/logo-white.png" alt="shop logo" className="nav__logo" />
				</Link>

				<form className="search" onSubmit={handleSearchSubmit}>
					<input
						type="text"
						className="search__input"
						placeholder="Search items"
						value={searchQuery}
						onChange={handleSearchChange}
					/>
					<button type="submit" className="search__button">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="search__icon"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
					</button>
				</form>

				<div className="nav__subnav">
					<div className="icon">
						<Link to="/wishlist" className="icon__box">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="icon__icon"
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
						</Link>

						<Link to="/cart" className="icon__box">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="icon__icon"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
								/>
							</svg>
						</Link>

						<Link to="/orders" className="icon__box">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="icon__icon"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
								/>
							</svg>
						</Link>
					</div>

					<div className="nav__seperation">&nbsp;</div>

					<div
						className="nav__profile-wrapper"
						onClick={() => setShowProfileMenu(!showProfileMenu)}
					>
						<img
							src="/profile-pic.jpeg"
							alt="profile-pic"
							className="nav__profile-pic"
						/>
					</div>
				</div>
			</nav>
		</header>
	);
}

export default Navbar;
