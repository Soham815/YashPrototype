import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toTitleCase } from "../utils/textUtils";
import "../styles/OrderConfirmation.css";

export default function OrderConfirmation() {
	const location = useLocation();
	const navigate  = useNavigate();
	const { customer } = useAuth();
	const order = location.state?.order;

	if (!order) {
		navigate("/");
		return null;
	}

	return (
		<section className="confirm-page">
			<nav className="nav">
				<img
					src="/logo-white.png"
					alt="shop logo"
					className="nav__logo"
					onClick={() => navigate("/")}
					style={{ cursor: "pointer" }}
				/>
			</nav>

			<main>
				<div className="confirm-container">
					<div className="confirm-card">
						<div className="confirm-card__icon">✅</div>
						<h1 className="confirm-card__title">Order Placed!</h1>
						<p className="confirm-card__subtitle">
							Thank you{customer ? `, ${toTitleCase(customer.name)}` : ""}!
							Your order has been received.
						</p>

						<div className="confirm-card__order-id">
							Order #{order.id}
						</div>

						<div className="confirm-card__amount">
							<span className="confirm-card__amount__label">Total Bill</span>
							<span className="confirm-card__amount__value">
								&#8377;{Number(order.total_amount).toFixed(2)}
							</span>
						</div>

						<div className="confirm-card__info">
							<p>Your order is being processed. Our team will contact you for delivery.</p>
							<p>Payment will be collected on delivery.</p>
						</div>

						<div className="confirm-card__actions">
							<button
								className="confirm-card__btn confirm-card__btn--primary btn"
								onClick={() => navigate("/orders")}
							>
								View My Orders
							</button>
							<button
								className="confirm-card__btn confirm-card__btn--secondary btn"
								onClick={() => navigate("/search")}
							>
								Continue Shopping
							</button>
						</div>
					</div>
				</div>
			</main>
		</section>
	);
}
