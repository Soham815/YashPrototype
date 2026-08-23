import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import { toTitleCase } from "../utils/textUtils";
import "../styles/AdminPreorders.css";

const STATUS_LABELS = {
	waiting:             { label: "Waiting",             color: "blue"   },
	partially_fulfilled: { label: "Partial",             color: "orange" },
	fulfilled:           { label: "Fulfilled",           color: "green"  },
	cancelled:           { label: "Cancelled",           color: "grey"   },
};

export default function AdminPreorders() {
	const navigate = useNavigate();

	const [entries,     setEntries]     = useState([]);
	const [loading,     setLoading]     = useState(true);
	const [filter,      setFilter]      = useState("active");
	const [searchQuery, setSearchQuery] = useState("");
	const [message,     setMessage]     = useState({ type: "", text: "" });

	useEffect(() => { fetchEntries(); }, [filter]);

	const fetchEntries = async () => {
		try {
			setLoading(true);
			const statusParam = filter === "active" ? "waiting,partially_fulfilled" : filter === "all" ? "" : filter;
			let url = `${API_BASE_URL}/preorders`;
			if (filter === "active") url += "?status=waiting";
			else if (filter !== "all") url += `?status=${filter}`;

			const res  = await fetch(url);
			const data = await res.json();
			if (data.success) setEntries(data.data);
		} catch (e) { console.error(e); }
		finally { setLoading(false); }
	};

	// Group entries by product
	const groupedByProduct = useMemo(() => {
		const filtered = searchQuery.trim()
			? entries.filter((e) => {
				const q = searchQuery.toLowerCase();
				return (
					(e.products?.product_name || "").toLowerCase().includes(q) ||
					(e.customers?.name  || "").toLowerCase().includes(q) ||
					(e.customers?.phone || "").toLowerCase().includes(q)
				);
			})
			: entries;

		const groups = {};
		filtered.forEach((entry) => {
			const pid = entry.product_id;
			if (!groups[pid]) {
				groups[pid] = {
					product:     entry.products,
					entries:     [],
					totalPieces: 0,
				};
			}
			groups[pid].entries.push(entry);
			if (["waiting", "partially_fulfilled"].includes(entry.status)) {
				groups[pid].totalPieces += (entry.pieces_requested - entry.pieces_fulfilled);
			}
		});
		return Object.values(groups);
	}, [entries, searchQuery]);

	const activeCount = entries.filter((e) => ["waiting", "partially_fulfilled"].includes(e.status)).length;

	return (
		<div className="admin-preorders">
			<div className="ap-header">
				<div>
					<h2 className="ap-title">Preorder Queue</h2>
					<p className="ap-subtitle">{activeCount} active preorders</p>
				</div>
				<button className="ap-btn-back" onClick={() => navigate("/admin")}>← Back</button>
			</div>

			{/* Stats */}
			<div className="ap-stats">
				<div className="ap-stat ap-stat--blue">
					<span className="ap-stat__label">Waiting</span>
					<span className="ap-stat__value">
						{entries.filter((e) => e.status === "waiting").length}
					</span>
				</div>
				<div className="ap-stat ap-stat--orange">
					<span className="ap-stat__label">Partially Fulfilled</span>
					<span className="ap-stat__value">
						{entries.filter((e) => e.status === "partially_fulfilled").length}
					</span>
				</div>
				<div className="ap-stat ap-stat--green">
					<span className="ap-stat__label">Fulfilled Today</span>
					<span className="ap-stat__value">
						{entries.filter((e) => {
							if (e.status !== "fulfilled") return false;
							const today = new Date().toDateString();
							return new Date(e.created_at).toDateString() === today;
						}).length}
					</span>
				</div>
				<div className="ap-stat ap-stat--dark">
					<span className="ap-stat__label">Products in Queue</span>
					<span className="ap-stat__value">
						{new Set(entries.filter((e) => ["waiting","partially_fulfilled"].includes(e.status)).map((e) => e.product_id)).size}
					</span>
				</div>
			</div>

			{/* Filters + search */}
			<div className="ap-controls">
				<div className="ap-filters">
					{["active", "all", "waiting", "partially_fulfilled", "fulfilled", "cancelled"].map((f) => (
						<button
							key={f}
							className={`ap-filter-btn ${filter === f ? "ap-filter-btn--active" : ""}`}
							onClick={() => setFilter(f)}
						>
							{f === "active" ? "Active" : f === "all" ? "All" : STATUS_LABELS[f]?.label}
						</button>
					))}
				</div>
				<div className="ap-search-wrapper">
					<input
						type="text"
						className="ap-search"
						placeholder="Search product or customer..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
					{searchQuery && (
						<button className="ap-search-clear" onClick={() => setSearchQuery("")}>✕</button>
					)}
				</div>
			</div>

			{message.text && (
				<div className={`ap-message ap-message--${message.type}`}>{message.text}</div>
			)}

			{loading ? (
				<div className="ap-loading"><div className="ap-spinner" /><p>Loading queue...</p></div>
			) : groupedByProduct.length === 0 ? (
				<div className="ap-empty">
					<div className="ap-empty__icon">✅</div>
					<h3>{filter === "active" ? "No active preorders" : "No entries found"}</h3>
					<p>{filter === "active" ? "All products are in stock" : "Try a different filter"}</p>
				</div>
			) : (
				<div className="ap-groups">
					{groupedByProduct.map((group, gi) => (
						<div key={gi} className="ap-group">
							{/* Product header */}
							<div className="ap-group__header">
								<div className="ap-group__product">
									{group.product?.product_images?.[0] ? (
										<img
											src={group.product.product_images[0]}
											alt={toTitleCase(group.product?.product_name)}
											className="ap-group__img"
										/>
									) : (
										<div className="ap-group__img-placeholder">
											{(group.product?.product_name || "P").charAt(0).toUpperCase()}
										</div>
									)}
									<div>
										<h3 className="ap-group__name">
											{toTitleCase(group.product?.product_name)}
										</h3>
										<p className="ap-group__company">
											{toTitleCase(group.product?.companies?.company_name)}
										</p>
									</div>
								</div>
								{group.totalPieces > 0 && (
									<div className="ap-group__demand">
										<span className="ap-group__demand__label">Total demand</span>
										<span className="ap-group__demand__value">{group.totalPieces} pieces</span>
									</div>
								)}
							</div>

							{/* Queue entries */}
							<div className="ap-entries">
								{group.entries.map((entry) => {
									const statusInfo = STATUS_LABELS[entry.status];
									const remaining  = entry.pieces_requested - entry.pieces_fulfilled;
									const pct = entry.pieces_requested > 0
										? Math.round((entry.pieces_fulfilled / entry.pieces_requested) * 100)
										: 0;

									return (
										<div key={entry.id} className={`ap-entry ap-entry--${statusInfo.color}`}>
											<div className="ap-entry__position">
												#{entry.queue_position}
											</div>

											<div className="ap-entry__customer">
												<span className="ap-entry__customer__name">
													{toTitleCase(entry.customers?.name)}
												</span>
												<span className="ap-entry__customer__phone">
													{entry.customers?.phone}
												</span>
											</div>

											<div className="ap-entry__qty">
												<span className="ap-entry__qty__requested">
													{entry.pieces_requested} pcs requested
												</span>
												{entry.pieces_fulfilled > 0 && (
													<>
														<div className="ap-entry__progress-bar">
															<div className="ap-entry__progress-fill" style={{ width: `${pct}%` }} />
														</div>
														<span className="ap-entry__qty__fulfilled">
															{entry.pieces_fulfilled} fulfilled · {remaining} remaining
														</span>
													</>
												)}
											</div>

											<div className="ap-entry__meta">
												<span className={`ap-entry__status ap-status--${statusInfo.color}`}>
													{statusInfo.label}
												</span>
												<span className="ap-entry__date">
													{new Date(entry.created_at).toLocaleDateString("en-IN", {
														day: "numeric", month: "short",
													})}
												</span>
											</div>
										</div>
									);
								})}
							</div>

							{group.totalPieces > 0 && (
								<p className="ap-group__hint">
									💡 Add stock for this product via Stock Management to auto-fulfil the queue
								</p>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
