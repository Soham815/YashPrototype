import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import { toTitleCase } from "../utils/textUtils";
import "../styles/AdminOrders.css";

const STATUS_OPTIONS = ["placed", "delivered", "return_requested", "returned"];

const STATUS_LABELS = {
	placed:           { label: "Placed",          color: "blue"   },
	delivered:        { label: "Delivered",        color: "green"  },
	return_requested: { label: "Return Requested", color: "orange" },
	returned:         { label: "Returned",         color: "grey"   },
};

export default function AdminOrders() {
	const navigate = useNavigate();

	const [orders,      setOrders]      = useState([]);
	const [loading,     setLoading]     = useState(true);
	const [filter,      setFilter]      = useState("all");
	const [expanded,    setExpanded]    = useState(null);
	const [updating,    setUpdating]    = useState(null);
	const [message,     setMessage]     = useState({ type: "", text: "" });

	useEffect(() => { fetchOrders(); }, [filter]);

	const fetchOrders = async () => {
		try {
			setLoading(true);
			const url = filter === "all"
				? `${API_BASE_URL}/orders`
				: `${API_BASE_URL}/orders?status=${filter}`;
			const res  = await fetch(url);
			const data = await res.json();
			if (data.success) setOrders(data.data);
		} catch (e) { console.error(e); }
		finally { setLoading(false); }
	};

	const handleStatusChange = async (orderId, newStatus) => {
		setUpdating(orderId);
		try {
			const res = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: newStatus }),
			});
			const data = await res.json();
			if (res.ok) {
				setOrders((prev) =>
					prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o)
				);
				setMessage({ type: "success", text: `Order #${orderId} marked as ${STATUS_LABELS[newStatus].label}` });
				setTimeout(() => setMessage({ type: "", text: "" }), 3000);
			} else {
				setMessage({ type: "error", text: data.error });
			}
		} catch (e) {
			setMessage({ type: "error", text: "Network error" });
		} finally {
			setUpdating(null);
		}
	};

	const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);

	return (
		<div className="admin-orders">
			<div className="ao-header">
				<div>
					<h2 className="ao-title">Orders</h2>
					<p className="ao-subtitle">
						{orders.length} order{orders.length !== 1 ? "s" : ""}
						{filter !== "all" ? ` · ${STATUS_LABELS[filter]?.label}` : ""}
					</p>
				</div>
				<button className="ao-btn-back" onClick={() => navigate("/admin")}>← Back</button>
			</div>

			{/* Stats row */}
			<div className="ao-stats">
				<div className="ao-stat">
					<span className="ao-stat__label">Total Orders</span>
					<span className="ao-stat__value">{orders.length}</span>
				</div>
				<div className="ao-stat ao-stat--green">
					<span className="ao-stat__label">Revenue</span>
					<span className="ao-stat__value">₹{totalRevenue.toFixed(0)}</span>
				</div>
				<div className="ao-stat ao-stat--blue">
					<span className="ao-stat__label">Placed</span>
					<span className="ao-stat__value">{orders.filter((o) => o.status === "placed").length}</span>
				</div>
				<div className="ao-stat ao-stat--orange">
					<span className="ao-stat__label">Returns</span>
					<span className="ao-stat__value">{orders.filter((o) => o.status === "return_requested").length}</span>
				</div>
			</div>

			{/* Filter tabs */}
			<div className="ao-filters">
				{["all", ...STATUS_OPTIONS].map((s) => (
					<button
						key={s}
						className={`ao-filter-btn ${filter === s ? "ao-filter-btn--active" : ""}`}
						onClick={() => setFilter(s)}
					>
						{s === "all" ? "All" : STATUS_LABELS[s]?.label}
					</button>
				))}
			</div>

			{message.text && (
				<div className={`ao-message ao-message--${message.type}`}>{message.text}</div>
			)}

			{loading ? (
				<div className="ao-loading">
					<div className="ao-spinner" />
					<p>Loading orders...</p>
				</div>
			) : orders.length === 0 ? (
				<div className="ao-empty">
					<div className="ao-empty__icon">📦</div>
					<h3>No orders {filter !== "all" ? `with status "${STATUS_LABELS[filter]?.label}"` : "yet"}</h3>
				</div>
			) : (
				<div className="ao-list">
					{orders.map((order) => {
						const statusInfo = STATUS_LABELS[order.status];
						const isExpanded = expanded === order.id;

						return (
							<div key={order.id} className="ao-card">
								{/* Card header */}
								<div
									className="ao-card__header"
									onClick={() => setExpanded(isExpanded ? null : order.id)}
								>
									<div className="ao-card__id">
										<span className="ao-card__id__label">Order</span>
										<span className="ao-card__id__value">#{order.id}</span>
									</div>

									<div className="ao-card__customer">
										<span className="ao-card__customer__name">
											{toTitleCase(order.customers?.name)}
										</span>
										<span className="ao-card__customer__phone">
											{order.customers?.phone}
										</span>
										{order.customers?.city && (
											<span className="ao-card__customer__city">
												{toTitleCase(order.customers.city)}
											</span>
										)}
									</div>

									<div className="ao-card__meta">
										<span className="ao-card__date">
											{new Date(order.created_at).toLocaleDateString("en-IN", {
												day: "numeric", month: "short", year: "numeric",
											})}
										</span>
										<span className="ao-card__pieces">{order.total_pieces} pcs</span>
									</div>

									<span className="ao-card__amount">
										₹{Number(order.total_amount).toFixed(2)}
									</span>

									<span className={`ao-card__status ao-status--${statusInfo.color}`}>
										{statusInfo.label}
									</span>

									<span className={`ao-card__chevron ${isExpanded ? "ao-card__chevron--up" : ""}`}>▼</span>
								</div>

								{/* Expanded */}
								{isExpanded && (
									<div className="ao-card__body">
										{/* Items */}
										<div className="ao-items">
											{(order.order_items || []).map((item) => (
												<div key={item.id} className="ao-item">
													<div className="ao-item__img-box">
														{item.products?.product_images?.[0] ? (
															<img
																src={item.products.product_images[0]}
																alt={toTitleCase(item.products?.product_name)}
																className="ao-item__img"
															/>
														) : (
															<div className="ao-item__img-placeholder">
																{(item.products?.product_name || "P").charAt(0).toUpperCase()}
															</div>
														)}
													</div>
													<div className="ao-item__details">
														<h4 className="ao-item__company">
															{toTitleCase(item.products?.companies?.company_name)}
														</h4>
														<h3 className="ao-item__name">
															{toTitleCase(item.products?.product_name)}
														</h3>
														<p className="ao-item__qty">
															{item.quantity_display} {item.unit_display} → {item.pieces} pcs
														</p>
													</div>
													<div className="ao-item__price">
														<span>₹{item.price_per_piece} × {item.pieces}</span>
														<span className="ao-item__subtotal">₹{Number(item.subtotal).toFixed(2)}</span>
													</div>
												</div>
											))}
										</div>

										{/* Status update */}
										<div className="ao-card__actions">
											<span className="ao-card__actions__label">Update Status:</span>
											<div className="ao-status-btns">
												{STATUS_OPTIONS.map((s) => (
													<button
														key={s}
														className={`ao-status-btn ao-status-btn--${STATUS_LABELS[s].color} ${order.status === s ? "ao-status-btn--active" : ""}`}
														onClick={() => handleStatusChange(order.id, s)}
														disabled={order.status === s || updating === order.id}
													>
														{updating === order.id ? "..." : STATUS_LABELS[s].label}
													</button>
												))}
											</div>
										</div>

										<div className="ao-card__total">
											<span>Order Total</span>
											<span>₹{Number(order.total_amount).toFixed(2)}</span>
										</div>
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
