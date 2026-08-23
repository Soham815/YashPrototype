import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import { toTitleCase } from "../utils/textUtils";
import "../styles/AdminFinance.css";

export default function AdminFinance() {
	const navigate = useNavigate();

	const [accounts,        setAccounts]        = useState([]);
	const [loading,         setLoading]         = useState(true);
	const [selectedAccount, setSelectedAccount] = useState(null);
	const [txnLoading,      setTxnLoading]      = useState(false);
	const [searchQuery,     setSearchQuery]      = useState("");

	const [paymentAmount,   setPaymentAmount]   = useState("");
	const [paymentNote,     setPaymentNote]     = useState("");
	const [paymentLoading,  setPaymentLoading]  = useState(false);
	const [message,         setMessage]         = useState({ type: "", text: "" });

	useEffect(() => { fetchAccounts(); }, []);

	const fetchAccounts = async () => {
		try {
			setLoading(true);
			const res  = await fetch(`${API_BASE_URL}/finance`);
			const data = await res.json();
			if (data.success) setAccounts(data.data);
		} catch (e) { console.error(e); }
		finally { setLoading(false); }
	};

	const fetchCustomerFinance = async (customerId) => {
		try {
			setTxnLoading(true);
			setSelectedAccount(null);
			const res  = await fetch(`${API_BASE_URL}/finance/${customerId}`);
			const data = await res.json();
			if (data.success) setSelectedAccount(data.data);
		} catch (e) { console.error(e); }
		finally { setTxnLoading(false); }
	};

	const handleSelectCustomer = (acc) => {
		setPaymentAmount("");
		setPaymentNote("");
		setMessage({ type: "", text: "" });
		fetchCustomerFinance(acc.customer_id);
	};

	const handleRecordPayment = async (e) => {
		e.preventDefault();
		if (!paymentAmount || Number(paymentAmount) <= 0) return;
		setPaymentLoading(true);
		setMessage({ type: "", text: "" });
		try {
			const res = await fetch(
				`${API_BASE_URL}/finance/${selectedAccount.customer_id}/payment`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						amount: Number(paymentAmount),
						note:   paymentNote || "Payment received",
					}),
				},
			);
			const data = await res.json();
			if (res.ok) {
				setMessage({ type: "success", text: data.message });
				setPaymentAmount("");
				setPaymentNote("");
				await fetchAccounts();
				await fetchCustomerFinance(selectedAccount.customer_id);
			} else {
				setMessage({ type: "error", text: data.error });
			}
		} catch (e) {
			setMessage({ type: "error", text: "Network error" });
		} finally {
			setPaymentLoading(false);
		}
	};

	// ── Search filtering ──────────────────────────────────────
	const filteredAccounts = useMemo(() => {
		if (!searchQuery.trim()) return accounts;
		const q = searchQuery.toLowerCase();
		return accounts.filter((acc) => {
			const c = acc.customers || {};
			return (
				(c.customer_name  || "").toLowerCase().includes(q) ||
				(c.phone || "").toLowerCase().includes(q) ||
				(c.email || "").toLowerCase().includes(q) ||
				(c.city  || "").toLowerCase().includes(q) ||
				(c.address || "").toLowerCase().includes(q)
			);
		});
	}, [accounts, searchQuery]);

	// ── Summary stats ─────────────────────────────────────────
	const totalPending   = accounts.reduce((s, a) => s + Number(a.computed_pending || a.pending_credit), 0);
	const totalBilled    = accounts.reduce((s, a) => s + Number(a.total_billed), 0);
	const totalCollected = accounts.reduce((s, a) => s + Number(a.total_paid), 0);
	const overdueCount   = accounts.filter((a) => a.has_overdue).length;

	// ── Customer row color tier ───────────────────────────────
	const getTier = (acc) => {
		if (acc.has_overdue)                               return "overdue";   // 7+ days debt — red
		if (Number(acc.computed_pending || acc.pending_credit) > 0) return "pending";  // has debt — orange
		return "clear";                                                        // no debt — green
	};

	// ── Overdue days display ──────────────────────────────────
	const getDaysOverdue = (dateStr) => {
		if (!dateStr) return 0;
		const diff = Date.now() - new Date(dateStr).getTime();
		return Math.floor(diff / (1000 * 60 * 60 * 24));
	};

	return (
		<div className="admin-finance">
			<div className="af-header">
				<div>
					<h2 className="af-title">Finance</h2>
					<p className="af-subtitle">{accounts.length} accounts · {overdueCount} overdue</p>
				</div>
				<button className="af-btn-back" onClick={() => navigate("/admin")}>← Back</button>
			</div>

			{/* Summary stats */}
			<div className="af-stats">
				<div className="af-stat af-stat--overdue">
					<span className="af-stat__label">Overdue (7+ days)</span>
					<span className="af-stat__value">{overdueCount} customers</span>
				</div>
				<div className="af-stat af-stat--dark">
					<span className="af-stat__label">Total Pending</span>
					<span className="af-stat__value">&#8377;{totalPending.toFixed(0)}</span>
				</div>
				<div className="af-stat af-stat--orange">
					<span className="af-stat__label">Total Billed</span>
					<span className="af-stat__value">&#8377;{totalBilled.toFixed(0)}</span>
				</div>
				<div className="af-stat af-stat--green">
					<span className="af-stat__label">Total Collected</span>
					<span className="af-stat__value">&#8377;{totalCollected.toFixed(0)}</span>
				</div>
			</div>

			{/* Color legend */}
			<div className="af-legend">
				<span className="af-legend__item af-legend__item--overdue">🔴 7+ days overdue</span>
				<span className="af-legend__item af-legend__item--pending">🟠 Payment pending</span>
				<span className="af-legend__item af-legend__item--clear">🟢 All clear</span>
			</div>

			<div className="af-body">
				{/* LEFT — customer list */}
				<div className="af-list-col">
					{/* Search */}
					<div className="af-search-wrapper">
						<input
							type="text"
							className="af-search"
							placeholder="Search by name, phone, city..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
						{searchQuery && (
							<button className="af-search-clear" onClick={() => setSearchQuery("")}>✕</button>
						)}
					</div>

					<p className="af-list-count">
						{filteredAccounts.length} of {accounts.length} customers
					</p>

					{loading ? (
						<div className="af-loading"><div className="af-spinner" /><p>Loading...</p></div>
					) : filteredAccounts.length === 0 ? (
						<p className="af-empty">No customers found</p>
					) : (
						<div className="af-customer-list">
							{filteredAccounts.map((acc) => {
								const tier    = getTier(acc);
								const pending = Number(acc.computed_pending || acc.pending_credit);
								const days    = acc.oldest_unpaid_date ? getDaysOverdue(acc.oldest_unpaid_date) : 0;
								const isActive= selectedAccount?.customer_id === acc.customer_id;

								return (
									<div
										key={acc.customer_id}
										className={`af-customer-row af-customer-row--${tier} ${isActive ? "af-customer-row--active" : ""}`}
										onClick={() => handleSelectCustomer(acc)}
									>
										<div className="af-customer-row__dot af-dot--${tier}"></div>
										<div className="af-customer-row__info">
											<span className="af-customer-row__name">
												{toTitleCase(acc.customers?.customer_name)}
											</span>
											<span className="af-customer-row__phone">{acc.customers?.phone}</span>
											{acc.customers?.city && (
												<span className="af-customer-row__city">{toTitleCase(acc.customers.city)}</span>
											)}
											{tier === "overdue" && (
												<span className="af-customer-row__overdue-tag">
													⚠️ {days} days overdue
												</span>
											)}
										</div>
										<div className="af-customer-row__amounts">
											{pending > 0 ? (
												<>
													<span className={`af-customer-row__pending af-pending--${tier}`}>
														&#8377;{pending.toFixed(0)}
													</span>
													<span className="af-customer-row__pending-label">due</span>
												</>
											) : (
												<span className="af-customer-row__clear">✓ Clear</span>
											)}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* RIGHT — detail panel */}
				<div className="af-detail-col">
					{!selectedAccount && !txnLoading && (
						<div className="af-detail-empty">
							<div className="af-detail-empty__icon">👈</div>
							<p>Select a customer to view their account</p>
						</div>
					)}

					{txnLoading && (
						<div className="af-loading"><div className="af-spinner" /><p>Loading account...</p></div>
					)}

					{selectedAccount && !txnLoading && (
						<>
							{/* Customer header */}
							<div className="af-detail-header">
								<div>
									<h3 className="af-detail-name">
										{toTitleCase(selectedAccount.customers?.customer_name || "")}
									</h3>
									<p className="af-detail-contact">
										{selectedAccount.customers?.phone}
										{selectedAccount.customers?.city && ` · ${toTitleCase(selectedAccount.customers.city)}`}
									</p>
								</div>
								{selectedAccount.has_overdue && (
									<div className="af-overdue-badge">
										⚠️ {getDaysOverdue(selectedAccount.oldest_unpaid_date)}+ days overdue
									</div>
								)}
							</div>

							{/* Balance cards */}
							<div className="af-detail-stats">
								<div className={`af-detail-stat ${selectedAccount.pending_credit > 0 ? "af-detail-stat--pending" : "af-detail-stat--clear"}`}>
									<span className="af-detail-stat__label">Amount Due</span>
									<span className="af-detail-stat__value">
										&#8377;{Number(selectedAccount.pending_credit).toFixed(2)}
									</span>
								</div>
								<div className="af-detail-stat">
									<span className="af-detail-stat__label">Total Billed</span>
									<span className="af-detail-stat__value">
										&#8377;{Number(selectedAccount.total_billed).toFixed(2)}
									</span>
								</div>
								<div className="af-detail-stat af-detail-stat--paid">
									<span className="af-detail-stat__label">Total Paid</span>
									<span className="af-detail-stat__value">
										&#8377;{Number(selectedAccount.total_paid).toFixed(2)}
									</span>
								</div>
							</div>

							{/* Payment form */}
							{Number(selectedAccount.pending_credit) > 0 && (
								<div className="af-payment-form">
									<h3 className="af-payment-form__title">Record Payment</h3>

									{message.text && (
										<div className={`af-message af-message--${message.type}`}>{message.text}</div>
									)}

									<form onSubmit={handleRecordPayment} className="af-form">
										<div className="af-form__row">
											<div className="af-form__group">
												<label className="af-form__label">Amount (₹) *</label>
												<input
													type="number"
													min="1"
													step="0.01"
													className="af-form__input"
													placeholder="Enter amount"
													value={paymentAmount}
													onChange={(e) => setPaymentAmount(e.target.value)}
													required
												/>
											</div>
											<div className="af-form__group">
												<label className="af-form__label">Note (optional)</label>
												<input
													type="text"
													className="af-form__input"
													placeholder="e.g. Cash, UPI ref #123"
													value={paymentNote}
													onChange={(e) => setPaymentNote(e.target.value)}
												/>
											</div>
										</div>

										{/* Quick amount buttons */}
										<div className="af-quick-amounts">
											<span className="af-quick-amounts__label">Quick:</span>
											{[0.25, 0.5, 0.75, 1].map((fraction) => {
												const amt = (Number(selectedAccount.pending_credit) * fraction).toFixed(0);
												return (
													<button
														key={fraction}
														type="button"
														className="af-quick-btn"
														onClick={() => setPaymentAmount(amt)}
													>
														{fraction === 1 ? "Full" : `${fraction * 100}%`}
														<span> &#8377;{amt}</span>
													</button>
												);
											})}
										</div>

										<button
											type="submit"
											className="af-payment-btn"
											disabled={paymentLoading || !paymentAmount}
										>
											{paymentLoading ? "Recording..." : "✓ Record Payment"}
										</button>
									</form>
								</div>
							)}

							{/* Transaction ledger */}
							<div className="af-txn-section">
								<h3 className="af-txn-section__title">Transaction Ledger</h3>
								{(!selectedAccount.transactions || selectedAccount.transactions.length === 0) ? (
									<p className="af-txn-empty">No transactions yet</p>
								) : (
									<div className="af-txn-list">
										{selectedAccount.transactions.map((txn) => {
											const isOverdueTxn = txn.type === "debit"
												&& Number(txn.remaining_amount) > 0
												&& getDaysOverdue(txn.created_at) > 7;

											return (
												<div
													key={txn.id}
													className={`af-txn af-txn--${txn.type} ${isOverdueTxn ? "af-txn--overdue" : ""}`}
												>
													<div className="af-txn__icon">
														{txn.type === "debit" ? "🛒" : "💳"}
													</div>
													<div className="af-txn__details">
														<p className="af-txn__note">
															{txn.note || (txn.type === "debit" ? "Order placed" : "Payment received")}
															{isOverdueTxn && (
																<span className="af-txn__overdue-flag"> ⚠️ {getDaysOverdue(txn.created_at)} days old</span>
															)}
														</p>
														{txn.order_id && (
															<p className="af-txn__order">Order #{txn.order_id}</p>
														)}
														<p className="af-txn__date">
															{new Date(txn.created_at).toLocaleDateString("en-IN", {
																day: "numeric", month: "short", year: "numeric",
																hour: "2-digit", minute: "2-digit",
															})}
														</p>
													</div>
													<div className="af-txn__right">
														<div className={`af-txn__amount af-txn__amount--${txn.type}`}>
															{txn.type === "debit" ? "+" : "−"}
															&#8377;{Number(txn.amount).toFixed(2)}
														</div>
														{txn.type === "debit" && Number(txn.remaining_amount) > 0 && (
															<div className="af-txn__remaining">
																&#8377;{Number(txn.remaining_amount).toFixed(2)} unpaid
															</div>
														)}
														{txn.type === "debit" && Number(txn.remaining_amount) === 0 && (
															<div className="af-txn__cleared">✓ Cleared</div>
														)}
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
