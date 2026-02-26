import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/StockHistory.css";
import { API_BASE_URL } from "../config/api";

function StockHistory() {
	const { productId } = useParams();
	const navigate = useNavigate();
	const [history, setHistory] = useState([]);
	const [loading, setLoading] = useState(true);
	const [productInfo, setProductInfo] = useState(null);

	useEffect(() => {
		fetchHistory();
	}, [productId]);

	const fetchHistory = async () => {
		try {
			setLoading(true);
			const endpoint = productId
				? `${API_BASE_URL}/stock/history/${productId}`
				: `${API_BASE_URL}/stock/history`;

			const response = await fetch(endpoint);
			const data = await response.json();

			if (data.success) {
				setHistory(data.data);

				// If viewing single product, fetch product info
				if (productId && data.data.length > 0) {
					const productResponse = await fetch(
						`${API_BASE_URL}/stock/product/${productId}`,
					);
					const productData = await productResponse.json();
					if (productData.success) {
						setProductInfo(productData.data);
					}
				}
			}
		} catch (error) {
			console.error("Error fetching history:", error);
		} finally {
			setLoading(false);
		}
	};

	// Group history by time periods
	const groupHistoryByPeriod = () => {
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		const grouped = {
			today: [],
			yesterday: [],
			thisMonth: [],
			older: {},
		};

		history.forEach((item) => {
			const itemDate = new Date(item.created_at);
			const itemDay = new Date(
				itemDate.getFullYear(),
				itemDate.getMonth(),
				itemDate.getDate(),
			);

			if (itemDay.getTime() === today.getTime()) {
				grouped.today.push(item);
			} else if (itemDay.getTime() === yesterday.getTime()) {
				grouped.yesterday.push(item);
			} else if (
				itemDate.getMonth() === now.getMonth() &&
				itemDate.getFullYear() === now.getFullYear()
			) {
				grouped.thisMonth.push(item);
			} else {
				const monthYear = itemDate.toLocaleDateString("en-IN", {
					month: "long",
					year: "numeric",
				});
				if (!grouped.older[monthYear]) {
					grouped.older[monthYear] = [];
				}
				grouped.older[monthYear].push(item);
			}
		});

		return grouped;
	};

	const getReasonLabel = (reasonType) => {
		switch (reasonType) {
			case "new_shipment":
				return "📦 New Shipment";
			case "returns":
				return "↩️ Returns";
			case "other":
				return "✏️ Other";
			default:
				return reasonType;
		}
	};

	const getActionLabel = (actionType) => {
		return actionType === "addition" ? "Addition" : "Update";
	};

	const formatDateTime = (dateString) => {
		return new Date(dateString).toLocaleString("en-IN", {
			day: "numeric",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const renderHistoryRow = (item) => {
		const isAddition = item.action_type === "addition";
		const isPositive = item.change_amount > 0;

		return (
			<div
				key={item.id}
				className={`history-row history-row--${item.action_type} history-row--${item.reason_type}`}
			>
				<div className="history-row__left">
					{/* Product Image (only show in all history view) */}
					{!productId && item.products && (
						<div className="history-row__product-img">
							{item.products.product_images?.[0] ? (
								<img
									src={item.products.product_images[0]}
									alt={item.products.product_name}
								/>
							) : (
								<div className="history-row__product-placeholder">
									{item.products.product_name.charAt(0).toUpperCase()}
								</div>
							)}
						</div>
					)}

					{/* Info */}
					<div className="history-row__info">
						{!productId && item.products && (
							<p className="history-row__product-name">
								{item.products.product_name}
							</p>
						)}
						<div className="history-row__meta">
							<span className="history-row__time">
								{formatDateTime(item.created_at)}
							</span>
							{item.admin_pin_used && (
								<span className="history-row__pin-badge">🔒 PIN</span>
							)}
						</div>
					</div>
				</div>

				<div className="history-row__center">
					{/* Action Type Badge */}
					<span className={`history-badge history-badge--${item.action_type}`}>
						{getActionLabel(item.action_type)}
					</span>

					{/* Reason Badge */}
					<span className={`history-badge history-badge--${item.reason_type}`}>
						{getReasonLabel(item.reason_type)}
					</span>

					{/* Custom Reason Note */}
					{item.reason_note && (
						<p className="history-row__reason-note">Note: {item.reason_note}</p>
					)}
				</div>

				<div className="history-row__right">
					{/* Quantity Change */}
					<div className="history-row__quantities">
						<span className="history-row__prev-qty">
							{item.previous_quantity || 0}
						</span>
						<span className="history-row__arrow">→</span>
						<span className="history-row__new-qty">{item.new_quantity}</span>
					</div>

					{/* Change Amount */}
					<div
						className={`history-row__change ${isPositive ? "positive" : "negative"}`}
					>
						{isPositive ? "+" : ""}
						{item.change_amount} units
					</div>
				</div>
			</div>
		);
	};

	const groupedHistory = groupHistoryByPeriod();

	return (
		<div className="stock-history-page">
			{/* Header */}
			<div className="stock-history__header">
				<button className="back-btn" onClick={() => navigate(-1)}>
					← Back
				</button>
				<div className="stock-history__title-section">
					<h2 className="stock-history__title">Stock History</h2>
					{productInfo && (
						<div className="stock-history__product-info">
							<span className="stock-history__product-name">
								{productInfo.products.product_name}
							</span>
							<span className="stock-history__product-company">
								{productInfo.products.companies?.company_name}
							</span>
						</div>
					)}
				</div>
			</div>

			{/* Loading */}
			{loading ? (
				<div className="loading-state">
					<div className="spinner"></div>
					<p>Loading history...</p>
				</div>
			) : history.length === 0 ? (
				<div className="empty-history">
					<div className="empty-history__icon">📋</div>
					<h3>No history available</h3>
					<p>Stock changes will appear here once recorded</p>
				</div>
			) : (
				<div className="stock-history__content">
					{/* Today */}
					{groupedHistory.today.length > 0 && (
						<div className="history-section">
							<h3 className="history-section__heading">Today</h3>
							<div className="history-section__rows">
								{groupedHistory.today.map(renderHistoryRow)}
							</div>
						</div>
					)}

					{/* Yesterday */}
					{groupedHistory.yesterday.length > 0 && (
						<div className="history-section">
							<h3 className="history-section__heading">Yesterday</h3>
							<div className="history-section__rows">
								{groupedHistory.yesterday.map(renderHistoryRow)}
							</div>
						</div>
					)}

					{/* This Month */}
					{groupedHistory.thisMonth.length > 0 && (
						<div className="history-section">
							<h3 className="history-section__heading">Earlier This Month</h3>
							<div className="history-section__rows">
								{groupedHistory.thisMonth.map(renderHistoryRow)}
							</div>
						</div>
					)}

					{/* Older (grouped by month) */}
					{Object.keys(groupedHistory.older).map((monthYear) => (
						<div key={monthYear} className="history-section">
							<h3 className="history-section__heading">{monthYear}</h3>
							<div className="history-section__rows">
								{groupedHistory.older[monthYear].map(renderHistoryRow)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

export default StockHistory;
