import { useNavigate } from "react-router-dom";
import "../styles/RootLanding.css";

export default function RootLanding() {
	const navigate = useNavigate();

	const cards = [
		{
			key:         "client",
			icon:        "👥",
			title:       "Client Portal",
			description: "Browse products, place orders and manage your account.",
			btnLabel:    "Enter Client Portal",
			onClick:     () => navigate("/client"),
			modifier:    "client",
		},
		{
			key:         "admin",
			icon:        "⚙️",
			title:       "Admin Portal",
			description: "Manage inventory, companies, offers, stock and finances.",
			btnLabel:    "Enter Admin Portal",
			onClick:     () => navigate("/admin"),
			modifier:    "admin",
		},
		{
			key:         "worker",
			icon:        "🚚",
			title:       "Worker Portal",
			description: "View delivery assignments and record collections.",
			btnLabel:    "Enter Worker Portal",
			onClick:     () => navigate('/worker/login'),
			modifier:    "worker",
			disabled:    false,
		},
	];

	return (
		<div className="root-landing">
			<div className="root-landing__header">
				<h1 className="root-landing__title">Yash Enterprises</h1>
				<p className="root-landing__subtitle">Select your portal to continue</p>
			</div>

			<div className="root-landing__cards">
				{cards.map((card) => (
					<div
						key={card.key}
						className={`root-card root-card--${card.modifier}${card.disabled ? " root-card--disabled" : ""}`}
					>
						<div className="root-card__icon">{card.icon}</div>
						<h2 className="root-card__title">{card.title}</h2>
						<p className="root-card__description">{card.description}</p>
						<button
							className="root-card__btn"
							onClick={card.onClick}
							disabled={!!card.disabled}
						>
							{card.btnLabel}
						</button>
					</div>
				))}
			</div>
		</div>
	);
}
