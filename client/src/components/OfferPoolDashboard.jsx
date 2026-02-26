import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/OfferPoolDashboard.css";
import { API_BASE_URL } from "../config/api";

function OfferPoolDashboard() {
	const navigate = useNavigate();
	const [pools, setPools] = useState([]);
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState({ type: "", text: "" });

	// Modal states
	const [showTransferModal, setShowTransferModal] = useState(false);
	const [showDeductModal, setShowDeductModal] = useState(false);
	const [selectedPool, setSelectedPool] = useState(null);

	// Transfer form
	const [transferTo, setTransferTo] = useState("regular");
	const [transferQuantity, setTransferQuantity] = useState("");
	const [transferPin, setTransferPin] = useState("");

	// Deduct form
	const [deductQuantity, setDeductQuantity] = useState("");
	const [deductReason, setDeductReason] = useState("");
	const [deductPin, setDeductPin] = useState("");

	const [actionLoading, setActionLoading] = useState(false);

	useEffect(() => {
		fetchPools();
	}, []);

	const fetchPools = async () => {
		try {
			setLoading(true);
			const response = await fetch(`${API_BASE_URL}/offer-pool`);
			const data = await response.json();

			if (data.success) {
				setPools(data.data);
			}
		} catch (error) {
			console.error("Error fetching pools:", error);
			setMessage({ type: "error", text: "Failed to load offer pools" });
		} finally {
			setLoading(false);
		}
	};

	const openTransferModal = (pool) => {
		setSelectedPool(pool);
		setTransferTo("regular");
		setTransferQuantity("");
		setTransferPin("");
		setShowTransferModal(true);
	};

	const openDeductModal = (pool) => {
		setSelectedPool(pool);
		setDeductQuantity("");
		setDeductReason("");
		setDeductPin("");
		setShowDeductModal(true);
	};

	const handleTransfer = async (e) => {
		e.preventDefault();

		if (!transferQuantity || parseInt(transferQuantity) <= 0) {
			setMessage({ type: "error", text: "Please enter a valid quantity" });
			return;
		}

		if (parseInt(transferQuantity) > selectedPool.accumulated_quantity) {
			setMessage({
				type: "error",
				text: `Only ${selectedPool.accumulated_quantity} items available`,
			});
			return;
		}

		if (!transferPin.trim()) {
			setMessage({ type: "error", text: "PIN is required" });
			return;
		}

		setActionLoading(true);
		setMessage({ type: "", text: "" });

		try {
			const response = await fetch(
				`${API_BASE_URL}/offer-pool/${selectedPool.id}/transfer`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						quantity: parseInt(transferQuantity),
						transfer_to: transferTo,
						admin_pin: transferPin,
					}),
				},
			);

			const data = await response.json();

			if (response.ok) {
				setMessage({
					type: "success",
					text: data.message,
				});
				setShowTransferModal(false);
				await fetchPools();
				setTimeout(() => setMessage({ type: "", text: "" }), 4000);
			} else {
				setMessage({ type: "error", text: data.error || "Transfer failed" });
			}
		} catch (error) {
			console.error("Error:", error);
			setMessage({ type: "error", text: "Network error. Please try again." });
		} finally {
			setActionLoading(false);
		}
	};

	const handleDeduct = async (e) => {
		e.preventDefault();

		if (!deductQuantity || parseInt(deductQuantity) <= 0) {
			setMessage({ type: "error", text: "Please enter a valid quantity" });
			return;
		}

		if (parseInt(deductQuantity) > selectedPool.accumulated_quantity) {
			setMessage({
				type: "error",
				text: `Only ${selectedPool.accumulated_quantity} items available`,
			});
			return;
		}

		if (!deductReason.trim()) {
			setMessage({ type: "error", text: "Reason is required" });
			return;
		}

		if (!deductPin.trim()) {
			setMessage({ type: "error", text: "PIN is required" });
			return;
		}

		setActionLoading(true);
		setMessage({ type: "", text: "" });

		try {
			const response = await fetch(
				`${API_BASE_URL}/offer-pool/${selectedPool.id}/deduct`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						quantity: parseInt(deductQuantity),
						reason: deductReason,
						admin_pin: deductPin,
					}),
				},
			);

			const data = await response.json();

			if (response.ok) {
				setMessage({
					type: "success",
					text: data.message,
				});
				setShowDeductModal(false);
				await fetchPools();
				setTimeout(() => setMessage({ type: "", text: "" }), 4000);
			} else {
				setMessage({ type: "error", text: data.error || "Deduction failed" });
			}
		} catch (error) {
			console.error("Error:", error);
			setMessage({ type: "error", text: "Network error. Please try again." });
		} finally {
			setActionLoading(false);
		}
	};

	const getTotalPoolItems = () => {
		return pools.reduce((sum, pool) => sum + pool.accumulated_quantity, 0);
	};

	const getTotalTransferred = () => {
		return pools.reduce(
			(sum, pool) => sum + pool.total_transferred_to_regular,
			0,
		);
	};

	const getTotalDeducted = () => {
		return pools.reduce((sum, pool) => sum + pool.total_deducted, 0);
	};

	return (
		<div className="offer-pool-page">
			{/* Header */}
			<div className="offer-pool__header">
				<div>
					<h2 className="offer-pool__title">Offer Pool Dashboard</h2>
					<p className="offer-pool__subtitle">
						Manage unclaimed free items from offers
					</p>
				</div>
				<button className="back-btn" onClick={() => navigate("/admin")}>
					← Back to Dashboard
				</button>
			</div>

			{/* Statistics */}
			<div className="pool-stats">
				<div className="pool-stat pool-stat--total">
					<div className="pool-stat__icon">🏊</div>
					<div className="pool-stat__content">
						<span className="pool-stat__value">{getTotalPoolItems()}</span>
						<span className="pool-stat__label">Items in Pool</span>
					</div>
				</div>

				<div className="pool-stat pool-stat--transferred">
					<div className="pool-stat__icon">📦</div>
					<div className="pool-stat__content">
						<span className="pool-stat__value">{getTotalTransferred()}</span>
						<span className="pool-stat__label">Transferred to Stock</span>
					</div>
				</div>

				<div className="pool-stat pool-stat--deducted">
					<div className="pool-stat__icon">🗑️</div>
					<div className="pool-stat__content">
						<span className="pool-stat__value">{getTotalDeducted()}</span>
						<span className="pool-stat__label">Deducted</span>
					</div>
				</div>

				<div className="pool-stat pool-stat--offers">
					<div className="pool-stat__icon">🎁</div>
					<div className="pool-stat__content">
						<span className="pool-stat__value">{pools.length}</span>
						<span className="pool-stat__label">Active Pools</span>
					</div>
				</div>
			</div>

			{/* Message */}
			{message.text && (
				<div className={`message message--${message.type}`}>{message.text}</div>
			)}

			{/* Loading */}
			{loading ? (
				<div className="loading-state">
					<div className="spinner"></div>
					<p>Loading offer pools...</p>
				</div>
			) : pools.length === 0 ? (
				<div className="empty-pool">
					<div className="empty-pool__icon">🏊</div>
					<h3>No Pool Items Yet</h3>
					<p>Unclaimed free items from offers will appear here</p>
				</div>
			) : (
				<div className="pools-list">
					{pools.map((pool) => (
						<div key={pool.id} className="pool-card">
							{/* Product Info */}
							<div className="pool-card__header">
								<div className="pool-card__product">
									<div className="pool-card__product-img">
										{pool.products?.product_images?.[0] ? (
											<img
												src={pool.products.product_images[0]}
												alt={pool.products.product_name}
											/>
										) : (
											<div className="pool-card__product-placeholder">
												{pool.products?.product_name?.charAt(0).toUpperCase()}
											</div>
										)}
									</div>
									<div className="pool-card__product-info">
										<h3 className="pool-card__product-name">
											{pool.products?.product_name}
										</h3>
										<p className="pool-card__product-company">
											{pool.products?.companies?.company_name}
										</p>
										<p className="pool-card__offer-id">
											Offer #{pool.offer_id}
										</p>
									</div>
								</div>

								{/* Pool Quantity */}
								<div className="pool-card__quantity">
									<span className="pool-card__quantity-label">In Pool</span>
									<span className="pool-card__quantity-value">
										{pool.accumulated_quantity}
									</span>
									<span className="pool-card__quantity-unit">units</span>
								</div>
							</div>

							{/* Stats */}
							<div className="pool-card__stats">
								<div className="pool-card__stat">
									<span className="pool-card__stat-label">
										Transferred to Regular
									</span>
									<span className="pool-card__stat-value">
										{pool.total_transferred_to_regular}
									</span>
								</div>
								<div className="pool-card__stat">
									<span className="pool-card__stat-label">
										Transferred to Free
									</span>
									<span className="pool-card__stat-value">
										{pool.total_transferred_to_free}
									</span>
								</div>
								<div className="pool-card__stat">
									<span className="pool-card__stat-label">Deducted</span>
									<span className="pool-card__stat-value">
										{pool.total_deducted}
									</span>
								</div>
							</div>

							{/* Actions */}
							<div className="pool-card__actions">
								<button
									className="pool-action-btn pool-action-btn--transfer"
									onClick={() => openTransferModal(pool)}
									disabled={pool.accumulated_quantity === 0}
								>
									↔️ Transfer
								</button>
								<button
									className="pool-action-btn pool-action-btn--deduct"
									onClick={() => openDeductModal(pool)}
									disabled={pool.accumulated_quantity === 0}
								>
									🗑️ Deduct
								</button>
							</div>

							{/* Last Updated */}
							<div className="pool-card__footer">
								<span className="pool-card__updated">
									Last updated:{" "}
									{new Date(pool.last_updated).toLocaleDateString("en-IN", {
										day: "numeric",
										month: "short",
										year: "numeric",
										hour: "2-digit",
										minute: "2-digit",
									})}
								</span>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Transfer Modal */}
			{showTransferModal && selectedPool && (
				<div
					className="modal-overlay"
					onClick={() => setShowTransferModal(false)}
				>
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h3>Transfer Pool Items</h3>
							<button
								className="modal-close-btn"
								onClick={() => setShowTransferModal(false)}
							>
								✕
							</button>
						</div>
						<div className="modal-body">
							<div className="modal-product-info">
								<p className="modal-product-name">
									{selectedPool.products?.product_name}
								</p>
								<p className="modal-available">
									Available: {selectedPool.accumulated_quantity} units
								</p>
							</div>

							<form onSubmit={handleTransfer} className="modal-form">
								{/* Transfer Destination */}
								<div className="modal-form__group">
									<label className="modal-form__label">Transfer To *</label>
									<div className="transfer-radio-group">
										<label className="transfer-radio">
											<input
												type="radio"
												name="transfer_to"
												value="regular"
												checked={transferTo === "regular"}
												onChange={(e) => setTransferTo(e.target.value)}
											/>
											<span className="transfer-radio__text">
												📦 Regular Stock (to sell)
											</span>
										</label>

										<label className="transfer-radio transfer-radio--disabled">
											<input
												type="radio"
												name="transfer_to"
												value="free"
												disabled
											/>
											<span className="transfer-radio__text">
												🎁 Free Stock (coming soon)
											</span>
										</label>
									</div>
								</div>

								{/* Quantity */}
								<div className="modal-form__group">
									<label className="modal-form__label">Quantity *</label>
									<input
										type="number"
										className="modal-form__input"
										placeholder="Enter quantity"
										value={transferQuantity}
										onChange={(e) => setTransferQuantity(e.target.value)}
										min="1"
										max={selectedPool.accumulated_quantity}
										required
									/>
								</div>

								{/* PIN */}
								<div className="modal-form__group">
									<label className="modal-form__label">Admin PIN *</label>
									<input
										type="password"
										className="modal-form__input"
										placeholder="Enter PIN"
										value={transferPin}
										onChange={(e) => setTransferPin(e.target.value)}
										required
									/>
									<p className="modal-form__hint">
										🔒 PIN required for security
									</p>
								</div>

								<button
									type="submit"
									className="modal-submit-btn"
									disabled={actionLoading}
								>
									{actionLoading ? "Transferring..." : "Transfer Items"}
								</button>
							</form>
						</div>
					</div>
				</div>
			)}

			{/* Deduct Modal */}
			{showDeductModal && selectedPool && (
				<div
					className="modal-overlay"
					onClick={() => setShowDeductModal(false)}
				>
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h3>Deduct Pool Items</h3>
							<button
								className="modal-close-btn"
								onClick={() => setShowDeductModal(false)}
							>
								✕
							</button>
						</div>
						<div className="modal-body">
							<div className="modal-product-info">
								<p className="modal-product-name">
									{selectedPool.products?.product_name}
								</p>
								<p className="modal-available">
									Available: {selectedPool.accumulated_quantity} units
								</p>
							</div>

							<form onSubmit={handleDeduct} className="modal-form">
								{/* Quantity */}
								<div className="modal-form__group">
									<label className="modal-form__label">Quantity *</label>
									<input
										type="number"
										className="modal-form__input"
										placeholder="Enter quantity"
										value={deductQuantity}
										onChange={(e) => setDeductQuantity(e.target.value)}
										min="1"
										max={selectedPool.accumulated_quantity}
										required
									/>
								</div>

								{/* Reason */}
								<div className="modal-form__group">
									<label className="modal-form__label">Reason *</label>
									<textarea
										className="modal-form__textarea"
										placeholder="Why are you deducting these items? (e.g., Damaged, Lost, Expired)"
										value={deductReason}
										onChange={(e) => setDeductReason(e.target.value)}
										rows="3"
										required
									/>
								</div>

								{/* PIN */}
								<div className="modal-form__group">
									<label className="modal-form__label">Admin PIN *</label>
									<input
										type="password"
										className="modal-form__input"
										placeholder="Enter PIN"
										value={deductPin}
										onChange={(e) => setDeductPin(e.target.value)}
										required
									/>
									<p className="modal-form__hint">
										🔒 PIN required for security
									</p>
								</div>

								<button
									type="submit"
									className="modal-submit-btn modal-submit-btn--danger"
									disabled={actionLoading}
								>
									{actionLoading ? "Deducting..." : "Deduct Items"}
								</button>
							</form>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default OfferPoolDashboard;
