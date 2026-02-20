import { useNavigate } from "react-router-dom";
import "../styles/LandingPage.css";

function LandingPage() {
	const navigate = useNavigate();

	return (
		<div className="landing-page">
			<div className="landing-container">
				<h1 className="landing-title">Product Management System</h1>
				<p className="landing-subtitle">Choose your portal</p>

				<div className="cards-container">
					{/* Client Card */}
					<div className="landing-card client-card">
						<div className="card-icon">👥</div>
						<h2 className="card-title">Client Portal</h2>
						<p className="card-description">
							Browse products and special offers
						</p>
						<button className="card-btn client-btn" disabled>
							Coming Soon
						</button>
					</div>

					{/* Admin Card */}
					<div className="landing-card admin-card">
						<div className="card-icon">⚙️</div>
						<h2 className="card-title">Admin Portal</h2>
						<p className="card-description">
							Manage companies, products, and offers
						</p>
						<button
							className="card-btn admin-btn"
							onClick={() => navigate("/admin")}
						>
							Enter Admin
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default LandingPage;
