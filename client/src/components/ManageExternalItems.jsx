import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import "../styles/ManageExternalItems.css";

function ManageExternalItems() {
	const navigate = useNavigate();

	// View mode: 'list' or 'add' or 'update'
	const [viewMode, setViewMode] = useState("list");
	const [selectedItem, setSelectedItem] = useState(null);

	// Items list
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState({ type: "", text: "" });

	// Add/Edit form
	const [formData, setFormData] = useState({
		item_name: "",
		item_description: "",
		stock_quantity: "0",
	});
	const [imageFile, setImageFile] = useState(null);
	const [imagePreview, setImagePreview] = useState(null);
	const [formLoading, setFormLoading] = useState(false);

	useEffect(() => {
		fetchItems();
	}, []);

	const fetchItems = async () => {
		try {
			setLoading(true);
			const response = await fetch(`${API_BASE_URL}/external-items`);
			const data = await response.json();

			if (data.success) {
				setItems(data.data);
			}
		} catch (error) {
			console.error("Error fetching items:", error);
			setMessage({ type: "error", text: "Failed to load external items" });
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (e) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value,
		});
	};

	const handleImageChange = (e) => {
		const file = e.target.files[0];

		if (file) {
			if (!file.type.startsWith("image/")) {
				setMessage({ type: "error", text: "Please select an image file" });
				return;
			}

			if (file.size > 5 * 1024 * 1024) {
				setMessage({ type: "error", text: "File size must be less than 5MB" });
				return;
			}

			setImageFile(file);

			const reader = new FileReader();
			reader.onloadend = () => {
				setImagePreview(reader.result);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!formData.item_name.trim()) {
			setMessage({ type: "error", text: "Item name is required" });
			return;
		}

		setFormLoading(true);
		setMessage({ type: "", text: "" });

		try {
			const submitData = new FormData();
			submitData.append("item_name", formData.item_name);
			submitData.append("item_description", formData.item_description);
			submitData.append("stock_quantity", formData.stock_quantity);

			if (imageFile) {
				submitData.append("item_image", imageFile);
			}

			const response = await fetch(`${API_BASE_URL}/external-items`, {
				method: "POST",
				body: submitData,
			});

			const data = await response.json();

			if (response.ok) {
				setMessage({
					type: "success",
					text: "External item added successfully!",
				});

				// Reset form
				setFormData({
					item_name: "",
					item_description: "",
					stock_quantity: "0",
				});
				setImageFile(null);
				setImagePreview(null);

				// Refresh list
				await fetchItems();

				// Return to list after 2 seconds
				setTimeout(() => {
					setViewMode("list");
					setMessage({ type: "", text: "" });
				}, 2000);
			} else {
				setMessage({
					type: "error",
					text: data.error || "Failed to add item",
				});
			}
		} catch (error) {
			console.error("Error:", error);
			setMessage({ type: "error", text: "Network error. Please try again." });
		} finally {
			setFormLoading(false);
		}
	};

	const handleUpdateStock = (item) => {
		setSelectedItem(item);
		setViewMode("update");
	};

	const handleAddNew = () => {
		setFormData({
			item_name: "",
			item_description: "",
			stock_quantity: "0",
		});
		setImageFile(null);
		setImagePreview(null);
		setMessage({ type: "", text: "" });
		setViewMode("add");
	};

	const handleBackToList = () => {
		setViewMode("list");
		setSelectedItem(null);
		setMessage({ type: "", text: "" });
	};

	// ============================================
	// RENDER: LIST VIEW
	// ============================================

	if (viewMode === "list") {
		return (
			<div className="external-items-page">
				{/* Header */}
				<div className="external-items__header">
					<div>
						<h2 className="external-items__title">External Items</h2>
						<p className="external-items__subtitle">
							Manage non-inventory items for offers
						</p>
					</div>
					<div className="external-items__header-actions">
						<button className="add-external-item-btn" onClick={handleAddNew}>
							<span className="btn-icon">+</span>
							Add External Item
						</button>
						<button className="back-btn" onClick={() => navigate("/admin")}>
							← Back
						</button>
					</div>
				</div>

				{/* Message */}
				{message.text && (
					<div className={`message message--${message.type}`}>
						{message.text}
					</div>
				)}

				{/* Loading */}
				{loading ? (
					<div className="loading-state">
						<div className="spinner"></div>
						<p>Loading external items...</p>
					</div>
				) : items.length === 0 ? (
					<div className="empty-external-items">
						<div className="empty-external-items__icon">🏷️</div>
						<h3>No External Items Yet</h3>
						<p>
							Add external items like containers, gifts, or promotional items
						</p>
						<button className="empty-add-btn" onClick={handleAddNew}>
							+ Add Your First Item
						</button>
					</div>
				) : (
					<div className="external-items-grid">
						{items.map((item) => (
							<div key={item.id} className="external-item-card">
								{/* Image */}
								<div className="external-item-card__image">
									{item.item_image ? (
										<img src={item.item_image} alt={item.item_name} />
									) : (
										<div className="external-item-card__placeholder">
											{item.item_name.charAt(0).toUpperCase()}
										</div>
									)}
								</div>

								{/* Info */}
								<div className="external-item-card__info">
									<h3 className="external-item-card__name">{item.item_name}</h3>
									{item.item_description && (
										<p className="external-item-card__description">
											{item.item_description}
										</p>
									)}

									{/* Stock Badge */}
									<div className="external-item-card__stock">
										<span
											className={`stock-badge ${
												item.stock_quantity === 0
													? "stock-badge--empty"
													: item.stock_quantity <= item.low_stock_threshold
														? "stock-badge--low"
														: "stock-badge--good"
											}`}
										>
											{item.stock_quantity} units
										</span>
									</div>

									{/* Last Updated */}
									<p className="external-item-card__updated">
										Updated:{" "}
										{new Date(item.last_updated).toLocaleDateString("en-IN", {
											day: "numeric",
											month: "short",
											year: "numeric",
										})}
									</p>
								</div>

								{/* Actions */}
								<div className="external-item-card__actions">
									<button
										className="update-stock-btn"
										onClick={() => handleUpdateStock(item)}
									>
										📦 Update Stock
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		);
	}

	// ============================================
	// RENDER: ADD FORM
	// ============================================

	if (viewMode === "add") {
		return (
			<div className="external-items-page">
				<div className="external-items__header">
					<h2 className="external-items__title">Add External Item</h2>
					<button className="back-btn" onClick={handleBackToList}>
						← Back to List
					</button>
				</div>

				<div className="external-item-form-container">
					<form onSubmit={handleSubmit} className="external-item-form">
						{/* Item Name */}
						<div className="form-group">
							<label htmlFor="item_name">Item Name *</label>
							<input
								type="text"
								id="item_name"
								name="item_name"
								value={formData.item_name}
								onChange={handleInputChange}
								placeholder="e.g., Plastic Container, Gift Bag"
								required
							/>
						</div>

						{/* Description */}
						<div className="form-group">
							<label htmlFor="item_description">Description</label>
							<textarea
								id="item_description"
								name="item_description"
								value={formData.item_description}
								onChange={handleInputChange}
								placeholder="e.g., Red plastic container 500ml"
								rows="3"
							/>
						</div>

						{/* Initial Stock */}
						<div className="form-group">
							<label htmlFor="stock_quantity">Initial Stock Quantity</label>
							<input
								type="number"
								id="stock_quantity"
								name="stock_quantity"
								value={formData.stock_quantity}
								onChange={handleInputChange}
								placeholder="0"
								min="0"
							/>
						</div>

						{/* Image Upload */}
						<div className="form-group">
							<label htmlFor="item_image">Item Image (Optional)</label>
							<input
								type="file"
								id="item_image"
								name="item_image"
								accept="image/*"
								onChange={handleImageChange}
							/>

							{imagePreview && (
								<div className="image-preview">
									<img src={imagePreview} alt="Preview" />
								</div>
							)}
						</div>

						{/* Message */}
						{message.text && (
							<div className={`message message--${message.type}`}>
								{message.text}
							</div>
						)}

						{/* Submit Button */}
						<button type="submit" className="submit-btn" disabled={formLoading}>
							{formLoading ? "Adding..." : "Add External Item"}
						</button>
					</form>
				</div>
			</div>
		);
	}

	// ============================================
	// RENDER: UPDATE STOCK VIEW
	// ============================================

	if (viewMode === "update" && selectedItem) {
		return (
			<UpdateExternalStock
				item={selectedItem}
				onBack={handleBackToList}
				onSuccess={() => {
					fetchItems();
					handleBackToList();
				}}
			/>
		);
	}

	return null;
}

// ============================================
// UPDATE STOCK SUB-COMPONENT
// ============================================

function UpdateExternalStock({ item, onBack, onSuccess }) {
	const [action, setAction] = useState("add"); // 'add' or 'update'
	const [quantity, setQuantity] = useState("");
	const [reasonType, setReasonType] = useState("new_shipment");
	const [reasonNote, setReasonNote] = useState("");
	const [pin, setPin] = useState("");
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState({ type: "", text: "" });

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!quantity || parseInt(quantity) <= 0) {
			setMessage({ type: "error", text: "Please enter a valid quantity" });
			return;
		}

		if (reasonType === "other" && !reasonNote.trim()) {
			setMessage({
				type: "error",
				text: "Please provide a reason note for 'other'",
			});
			return;
		}

		if (action === "update" && !pin) {
			setMessage({ type: "error", text: "PIN is required for direct updates" });
			return;
		}

		setLoading(true);
		setMessage({ type: "", text: "" });

		try {
			const endpoint =
				action === "add"
					? `${API_BASE_URL}/external-items/${item.id}/add`
					: `${API_BASE_URL}/external-items/${item.id}/update`;

			const submitData = {
				quantity: action === "add" ? parseInt(quantity) : parseInt(quantity),
				reason_type: reasonType,
				reason_note: reasonNote || null,
			};

			if (action === "update") {
				submitData.admin_pin = pin;
			}

			const response = await fetch(endpoint, {
				method: action === "add" ? "POST" : "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(submitData),
			});

			const data = await response.json();

			if (response.ok) {
				setMessage({
					type: "success",
					text: data.message || "Stock updated successfully!",
				});

				setTimeout(() => {
					onSuccess();
				}, 1500);
			} else {
				setMessage({
					type: "error",
					text: data.error || "Failed to update stock",
				});
			}
		} catch (error) {
			console.error("Error:", error);
			setMessage({ type: "error", text: "Network error. Please try again." });
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="external-items-page">
			<div className="external-items__header">
				<h2 className="external-items__title">
					Update Stock: {item.item_name}
				</h2>
				<button className="back-btn" onClick={onBack}>
					← Back
				</button>
			</div>

			<div className="update-stock-container">
				{/* Item Preview */}
				<div className="item-preview-card">
					<div className="item-preview-card__image">
						{item.item_image ? (
							<img src={item.item_image} alt={item.item_name} />
						) : (
							<div className="item-preview-card__placeholder">
								{item.item_name.charAt(0).toUpperCase()}
							</div>
						)}
					</div>
					<div className="item-preview-card__info">
						<h3>{item.item_name}</h3>
						<p className="current-stock">
							Current Stock: {item.stock_quantity} units
						</p>
						{item.item_description && <p>{item.item_description}</p>}
					</div>
				</div>

				{/* Action Type Selection */}
				<div className="action-type-selection">
					<button
						type="button"
						className={`action-type-btn ${action === "add" ? "active" : ""}`}
						onClick={() => setAction("add")}
					>
						➕ Add Stock (No PIN)
					</button>
					<button
						type="button"
						className={`action-type-btn ${action === "update" ? "active" : ""}`}
						onClick={() => setAction("update")}
					>
						✏️ Set Exact Stock (PIN Required)
					</button>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="update-stock-form">
					<div className="form-group">
						<label>
							{action === "add" ? "Quantity to Add" : "New Stock Quantity"}
						</label>
						<input
							type="number"
							value={quantity}
							onChange={(e) => setQuantity(e.target.value)}
							placeholder={action === "add" ? "e.g., 100" : "e.g., 500"}
							min="0"
							required
						/>
						{action === "add" && quantity && (
							<p className="stock-preview">
								New stock will be:{" "}
								{item.stock_quantity + parseInt(quantity || 0)} units
							</p>
						)}
					</div>

					{/* Reason Type */}
					<div className="form-group">
						<label>Reason</label>
						<div className="reason-radio-group">
							<label className="reason-radio">
								<input
									type="radio"
									name="reason_type"
									value="new_shipment"
									checked={reasonType === "new_shipment"}
									onChange={(e) => setReasonType(e.target.value)}
								/>
								<span className="reason-radio__text">📦 New Shipment</span>
							</label>

							<label className="reason-radio">
								<input
									type="radio"
									name="reason_type"
									value="returns"
									checked={reasonType === "returns"}
									onChange={(e) => setReasonType(e.target.value)}
								/>
								<span className="reason-radio__text">↩️ Returns</span>
							</label>

							<label className="reason-radio">
								<input
									type="radio"
									name="reason_type"
									value="other"
									checked={reasonType === "other"}
									onChange={(e) => setReasonType(e.target.value)}
								/>
								<span className="reason-radio__text">✏️ Other</span>
							</label>
						</div>
					</div>

					{/* Reason Note (if other) */}
					{reasonType === "other" && (
						<div className="form-group">
							<label>Reason Note</label>
							<textarea
								value={reasonNote}
								onChange={(e) => setReasonNote(e.target.value)}
								placeholder="Explain the reason..."
								rows="3"
								required
							/>
						</div>
					)}

					{/* PIN (if update) */}
					{action === "update" && (
						<div className="form-group">
							<label>Admin PIN</label>
							<input
								type="password"
								value={pin}
								onChange={(e) => setPin(e.target.value)}
								placeholder="Enter PIN"
								required
							/>
							<p className="form-hint">🔒 PIN required for security</p>
						</div>
					)}

					{/* Message */}
					{message.text && (
						<div className={`message message--${message.type}`}>
							{message.text}
						</div>
					)}

					{/* Submit */}
					<button type="submit" className="submit-btn" disabled={loading}>
						{loading
							? "Updating..."
							: action === "add"
								? "Add Stock"
								: "Update Stock"}
					</button>
				</form>
			</div>
		</div>
	);
}

export default ManageExternalItems;
