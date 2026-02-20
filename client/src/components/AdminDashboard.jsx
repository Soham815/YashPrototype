import { useNavigate } from "react-router-dom";
import "../styles/AdminDashboard.css";

function AdminDashboard() {
	const navigate = useNavigate();

	return (
		<div className="admin-dashboard">
			<div className="admin-dashboard__header">
				<h1 className="admin-dashboard__title">Admin Dashboard</h1>
				<p className="admin-dashboard__subtitle">
					Manage your inventory and business operations
				</p>
			</div>

			<div className="admin-dashboard__grid">
				{/* Companies Card */}
				<div className="admin-card admin-card--companies">
					<div className="admin-card__icon-wrapper">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="admin-card__icon"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
							/>
						</svg>
					</div>
					<h2 className="admin-card__title">Companies</h2>
					<p className="admin-card__description">
						Manage company profiles and logos
					</p>
					<div className="admin-card__actions">
						<button
							className="admin-card__btn admin-card__btn--primary"
							onClick={() => navigate("/admin/companies/add")}
						>
							Add Company
						</button>
						<button
							className="admin-card__btn admin-card__btn--secondary"
							onClick={() => navigate("/admin/companies")}
						>
							View All
						</button>
					</div>
				</div>

				{/* Products Card */}
				<div className="admin-card admin-card--products">
					<div className="admin-card__icon-wrapper">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="admin-card__icon"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
							/>
						</svg>
					</div>
					<h2 className="admin-card__title">Products</h2>
					<p className="admin-card__description">
						Add and manage product catalog
					</p>
					<div className="admin-card__actions">
						<button
							className="admin-card__btn admin-card__btn--primary"
							onClick={() => navigate("/admin/products/add")}
						>
							Add Product
						</button>
						<button
							className="admin-card__btn admin-card__btn--secondary"
							onClick={() => navigate("/admin/products")}
						>
							View All
						</button>
					</div>
				</div>

				{/* Offers Card */}
				<div className="admin-card admin-card--offers">
					<div className="admin-card__icon-wrapper">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="admin-card__icon"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
							/>
						</svg>
					</div>
					<h2 className="admin-card__title">Offers</h2>
					<p className="admin-card__description">
						Create and manage special offers
					</p>
					<div className="admin-card__actions">
						<button
							className="admin-card__btn admin-card__btn--primary"
							onClick={() => navigate("/admin/offers/add")}
						>
							Add Offer
						</button>
						<button
							className="admin-card__btn admin-card__btn--secondary"
							onClick={() => navigate("/admin/offers")}
						>
							View All
						</button>
					</div>
				</div>

				{/* Stock Card - NEW */}
				<div className="admin-card admin-card--stock">
					<div className="admin-card__icon-wrapper">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="admin-card__icon"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
							/>
						</svg>
					</div>
					<h2 className="admin-card__title">Stock Management</h2>
					<p className="admin-card__description">
						Update inventory and track stock levels
					</p>
					<div className="admin-card__actions">
						<button
							className="admin-card__btn admin-card__btn--primary admin-card__btn--full"
							onClick={() => navigate("/admin/stock")}
						>
							Update Stock
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default AdminDashboard;
