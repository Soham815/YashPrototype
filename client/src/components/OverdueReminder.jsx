import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";
import "../styles/OverdueReminder.css";

export default function OverdueReminder() {
	const { customer } = useAuth();
	const navigate     = useNavigate();
	const [overdueAmt, setOverdueAmt] = useState(0);
	const [show,       setShow]       = useState(false);

	useEffect(() => {
		if (!customer) return;
		checkOverdue();
	}, [customer]);

	const checkOverdue = async () => {
		try {
			const res  = await fetch(`${API_BASE_URL}/finance/${customer.id}`);
			const data = await res.json();
			if (!data.success) return;

			const sevenDays = 7 * 24 * 60 * 60 * 1000;
			const now       = Date.now();

			const overdueTotal = (data.data.transactions || [])
				.filter(
					(t) =>
						t.type === "debit" &&
						Number(t.remaining_amount) > 0 &&
						now - new Date(t.created_at).getTime() > sevenDays,
				)
				.reduce((sum, t) => sum + Number(t.remaining_amount), 0);

			if (overdueTotal > 0) {
				setOverdueAmt(overdueTotal);
				setShow(true);
			}
		} catch (e) {
			// Silently fail — reminder is non-critical
		}
	};

	if (!show) return null;

	return (
		<div className="overdue-reminder">
			<div className="overdue-reminder__content">
				<ion-icon name="warning-outline" class="overdue-reminder__icon"></ion-icon>
				<p className="overdue-reminder__text">
					You have an overdue balance of{" "}
					<strong>₹{overdueAmt.toFixed(2)}</strong> (7+ days).
					Please clear it at your earliest.
				</p>
				<button
					className="overdue-reminder__btn"
					onClick={() => navigate("/finance")}
				>
					View Account
				</button>
				<button
					className="overdue-reminder__close"
					onClick={() => setShow(false)}
					aria-label="Dismiss"
				>
					<ion-icon name="close-outline" class="overdue-reminder__close-icon"></ion-icon>
				</button>
			</div>
		</div>
	);
}
