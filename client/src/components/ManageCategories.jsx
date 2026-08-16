import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import "../styles/ManageCategories.css";

const COLOR_OPTIONS = [
	{ value: "orange", label: "Orange", hex: "#e67e22" },
	{ value: "blue", label: "Blue", hex: "#3498db" },
	{ value: "green", label: "Green", hex: "#27ae60" },
	{ value: "purple", label: "Purple", hex: "#9b59b6" },
	{ value: "red", label: "Red", hex: "#e74c3c" },
	{ value: "teal", label: "Teal", hex: "#1abc9c" },
	{ value: "yellow", label: "Yellow", hex: "#f39c12" },
	{ value: "pink", label: "Pink", hex: "#e91e8c" },
];

const COLOR_MAP = Object.fromEntries(COLOR_OPTIONS.map((c) => [c.value, c.hex]));

export default function ManageCategories() {
	const navigate = useNavigate();

	// View: 'grid' | 'detail' | 'create' | 'edit'
	const [view, setView] = useState("grid");
	const [categories, setCategories] = useState([]);
	const [selectedCategory, setSelectedCategory] = useState(null);
	const [allProducts, setAllProducts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState({ type: "", text: "" });

	// Form state (create / edit)
	const [formName, setFormName] = useState("");
	const [formDesc, setFormDesc] = useState("");
	const [formColor, setFormColor] = useState("orange");
	const [formLoading, setFormLoading] = useState(false);

	// Delete
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [deletePin, setDeletePin] = useState("");
	const [categoryToDelete, setCategoryToDelete] = useState(null);

	// Product search inside detail view
	const [productSearch, setProductSearch] = useState("");
	const [productSearchResults, setProductSearchResults] = useState([]);
	const [addingProduct, setAddingProduct] = useState(false);

	useEffect(() => {
		fetchCategories();
		fetchAllProducts();
	}, []);

	useEffect(() => {
		if (productSearch.trim() === "") {
			setProductSearchResults([]);
			return;
		}
		const inCategory = new Set(
			(selectedCategory?.product_categories || []).map((pc) => pc.product_id),
		);
		const filtered = allProducts
			.filter((p) => !inCategory.has(p.id))
			.filter(
				(p) =>
					p.product_name.toLowerCase().includes(productSearch.toLowerCase()) ||
					p.companies?.company_name
						.toLowerCase()
						.includes(productSearch.toLowerCase()),
			)
			.slice(0, 8);
		setProductSearchResults(filtered);
	}, [productSearch, allProducts, selectedCategory]);

	const fetchCategories = async () => {
		try {
			setLoading(true);
			const res = await fetch(`${API_BASE_URL}/categories`);
			const data = await res.json();
			if (data.success) setCategories(data.data);
		} catch (e) {
			setMessage({ type: "error", text: "Failed to load categories" });
		} finally {
			setLoading(false);
		}
	};

	const fetchAllProducts = async () => {
		try {
			const res = await fetch(`${API_BASE_URL}/products`);
			const data = await res.json();
			if (data.success) setAllProducts(data.data);
		} catch (e) {
			console.error("Failed to load products", e);
		}
	};

	const fetchCategoryDetail = async (id) => {
		try {
			const res = await fetch(`${API_BASE_URL}/categories/${id}`);
			const data = await res.json();
			if (data.success) setSelectedCategory(data.data);
		} catch (e) {
			setMessage({ type: "error", text: "Failed to load category" });
		}
	};

	// ── Create ──────────────────────────────────
	const handleCreate = async (e) => {
		e.preventDefault();
		if (!formName.trim()) return;
		setFormLoading(true);
		try {
			const res = await fetch(`${API_BASE_URL}/categories`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					category_name: formName,
					category_description: formDesc,
					category_color: formColor,
				}),
			});
			const data = await res.json();
			if (res.ok) {
				setMessage({ type: "success", text: "Category created!" });
				setFormName(""); setFormDesc(""); setFormColor("orange");
				await fetchCategories();
				setTimeout(() => { setMessage({ type: "", text: "" }); setView("grid"); }, 1500);
			} else {
				setMessage({ type: "error", text: data.error });
			}
		} catch (e) {
			setMessage({ type: "error", text: "Network error" });
		} finally {
			setFormLoading(false);
		}
	};

	// ── Edit ────────────────────────────────────
	const openEdit = (cat) => {
		setFormName(cat.category_name);
		setFormDesc(cat.category_description || "");
		setFormColor(cat.category_color || "orange");
		setSelectedCategory(cat);
		setView("edit");
	};

	const handleEdit = async (e) => {
		e.preventDefault();
		if (!formName.trim() || !selectedCategory) return;
		setFormLoading(true);
		try {
			const res = await fetch(`${API_BASE_URL}/categories/${selectedCategory.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					category_name: formName,
					category_description: formDesc,
					category_color: formColor,
				}),
			});
			const data = await res.json();
			if (res.ok) {
				setMessage({ type: "success", text: "Category updated!" });
				await fetchCategories();
				setTimeout(() => { setMessage({ type: "", text: "" }); setView("grid"); }, 1500);
			} else {
				setMessage({ type: "error", text: data.error });
			}
		} catch (e) {
			setMessage({ type: "error", text: "Network error" });
		} finally {
			setFormLoading(false);
		}
	};

	// ── Delete ──────────────────────────────────
	const openDelete = (cat) => {
		setCategoryToDelete(cat);
		setDeletePin("");
		setShowDeleteModal(true);
	};

	const handleDelete = async () => {
		if (!deletePin) return;
		try {
			const res = await fetch(`${API_BASE_URL}/categories/${categoryToDelete.id}`, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ admin_pin: deletePin }),
			});
			const data = await res.json();
			if (res.ok) {
				setMessage({ type: "success", text: "Category deleted" });
				setShowDeleteModal(false);
				await fetchCategories();
				setTimeout(() => setMessage({ type: "", text: "" }), 2000);
			} else {
				setMessage({ type: "error", text: data.error });
			}
		} catch (e) {
			setMessage({ type: "error", text: "Network error" });
		}
	};

	// ── Category detail ─────────────────────────
	const openDetail = async (cat) => {
		setProductSearch("");
		setProductSearchResults([]);
		await fetchCategoryDetail(cat.id);
		setView("detail");
	};

	// ── Add product to category ─────────────────
	const handleAddProduct = async (product) => {
		if (!selectedCategory) return;
		setAddingProduct(true);
		try {
			const res = await fetch(`${API_BASE_URL}/categories/${selectedCategory.id}/products`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ product_id: product.id }),
			});
			const data = await res.json();
			if (res.ok) {
				setProductSearch("");
				setProductSearchResults([]);
				await fetchCategoryDetail(selectedCategory.id);
				setMessage({ type: "success", text: `${product.product_name} added!` });
				setTimeout(() => setMessage({ type: "", text: "" }), 2000);
			} else {
				setMessage({ type: "error", text: data.error });
			}
		} catch (e) {
			setMessage({ type: "error", text: "Network error" });
		} finally {
			setAddingProduct(false);
		}
	};

	// ── Remove product from category ────────────
	const handleRemoveProduct = async (productId) => {
		if (!selectedCategory) return;
		try {
			const res = await fetch(
				`${API_BASE_URL}/categories/${selectedCategory.id}/products/${productId}`,
				{ method: "DELETE" },
			);
			if (res.ok) {
				await fetchCategoryDetail(selectedCategory.id);
				setMessage({ type: "success", text: "Product removed" });
				setTimeout(() => setMessage({ type: "", text: "" }), 2000);
			}
		} catch (e) {
			setMessage({ type: "error", text: "Network error" });
		}
	};

	const backToGrid = () => {
		setView("grid");
		setSelectedCategory(null);
		setFormName(""); setFormDesc(""); setFormColor("orange");
		setMessage({ type: "", text: "" });
	};

	// ════════════════════════════════════════════
	// RENDER: GRID VIEW
	// ════════════════════════════════════════════
	if (view === "grid") {
		return (
			<div className="manage-categories">
				<div className="mc-header">
					<div>
						<h2 className="mc-title">Product Categories</h2>
						<p className="mc-subtitle">Classify products to power smart search</p>
					</div>
					<div className="mc-header-actions">
						<button className="mc-btn-create" onClick={() => setView("create")}>
							+ New Category
						</button>
						<button className="mc-btn-back" onClick={() => navigate("/admin")}>
							← Back
						</button>
					</div>
				</div>

				{message.text && (
					<div className={`mc-message mc-message--${message.type}`}>{message.text}</div>
				)}

				{loading ? (
					<div className="mc-loading"><div className="mc-spinner" /><p>Loading categories...</p></div>
				) : categories.length === 0 ? (
					<div className="mc-empty">
						<div className="mc-empty__icon">🏷️</div>
						<h3>No categories yet</h3>
						<p>Create your first category to start classifying products</p>
						<button className="mc-btn-create" onClick={() => setView("create")}>
							+ Create Category
						</button>
					</div>
				) : (
					<div className="mc-grid">
						{categories.map((cat) => (
							<div
								key={cat.id}
								className="mc-card"
								style={{ "--cat-color": COLOR_MAP[cat.category_color] || COLOR_MAP.orange }}
								onClick={() => openDetail(cat)}
							>
								<div className="mc-card__color-bar" />
								<div className="mc-card__body">
									<h3 className="mc-card__name">{cat.category_name}</h3>
									{cat.category_description && (
										<p className="mc-card__desc">{cat.category_description}</p>
									)}
									<span className="mc-card__count">
										{cat.product_count} product{cat.product_count !== 1 ? "s" : ""}
									</span>
								</div>
								<div className="mc-card__actions" onClick={(e) => e.stopPropagation()}>
									<button
										className="mc-card__btn mc-card__btn--edit"
										onClick={() => openEdit(cat)}
									>
										Edit
									</button>
									<button
										className="mc-card__btn mc-card__btn--delete"
										onClick={() => openDelete(cat)}
									>
										Delete
									</button>
								</div>
							</div>
						))}
					</div>
				)}

				{/* Delete Modal */}
				{showDeleteModal && (
					<div className="mc-modal-overlay" onClick={() => setShowDeleteModal(false)}>
						<div className="mc-modal" onClick={(e) => e.stopPropagation()}>
							<div className="mc-modal__header">
								<h3>Delete Category</h3>
								<button className="mc-modal__close" onClick={() => setShowDeleteModal(false)}>✕</button>
							</div>
							<div className="mc-modal__body">
								<p>You are about to delete <strong>{categoryToDelete?.category_name}</strong>.</p>
								<p className="mc-modal__warning">Products will NOT be deleted — only the classification link is removed.</p>
								<label className="mc-form__label">Admin PIN</label>
								<input
									type="password"
									className="mc-form__input"
									value={deletePin}
									onChange={(e) => setDeletePin(e.target.value)}
									placeholder="Enter PIN"
									autoFocus
									onKeyDown={(e) => e.key === "Enter" && handleDelete()}
								/>
								{message.text && (
									<div className={`mc-message mc-message--${message.type}`}>{message.text}</div>
								)}
								<div className="mc-modal__actions">
									<button className="mc-btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
									<button className="mc-btn-danger" onClick={handleDelete}>Delete</button>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		);
	}

	// ════════════════════════════════════════════
	// RENDER: CREATE / EDIT FORM
	// ════════════════════════════════════════════
	if (view === "create" || view === "edit") {
		const isEdit = view === "edit";
		return (
			<div className="manage-categories">
				<div className="mc-header">
					<h2 className="mc-title">{isEdit ? "Edit Category" : "New Category"}</h2>
					<button className="mc-btn-back" onClick={backToGrid}>← Back</button>
				</div>

				<div className="mc-form-container">
					<form onSubmit={isEdit ? handleEdit : handleCreate} className="mc-form">
						<div className="mc-form__group">
							<label className="mc-form__label">Category Name *</label>
							<input
								type="text"
								className="mc-form__input"
								value={formName}
								onChange={(e) => setFormName(e.target.value)}
								placeholder="e.g. Spices, Oils, Snacks"
								required
							/>
						</div>

						<div className="mc-form__group">
							<label className="mc-form__label">Description (optional)</label>
							<textarea
								className="mc-form__textarea"
								value={formDesc}
								onChange={(e) => setFormDesc(e.target.value)}
								placeholder="Brief description of this category"
								rows={3}
							/>
						</div>

						<div className="mc-form__group">
							<label className="mc-form__label">Color</label>
							<div className="mc-color-palette">
								{COLOR_OPTIONS.map((c) => (
									<button
										key={c.value}
										type="button"
										className={`mc-color-swatch ${formColor === c.value ? "mc-color-swatch--selected" : ""}`}
										style={{ background: c.hex }}
										title={c.label}
										onClick={() => setFormColor(c.value)}
									/>
								))}
							</div>
							<p className="mc-form__hint">
								Selected: <strong>{COLOR_OPTIONS.find((c) => c.value === formColor)?.label}</strong>
							</p>
						</div>

						{/* Live preview */}
						<div className="mc-preview">
							<p className="mc-form__label">Preview</p>
							<div
								className="mc-card mc-card--preview"
								style={{ "--cat-color": COLOR_MAP[formColor] }}
							>
								<div className="mc-card__color-bar" />
								<div className="mc-card__body">
									<h3 className="mc-card__name">{formName || "Category Name"}</h3>
									{formDesc && <p className="mc-card__desc">{formDesc}</p>}
									<span className="mc-card__count">0 products</span>
								</div>
							</div>
						</div>

						{message.text && (
							<div className={`mc-message mc-message--${message.type}`}>{message.text}</div>
						)}

						<button type="submit" className="mc-btn-create" disabled={formLoading}>
							{formLoading ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Save Changes" : "Create Category")}
						</button>
					</form>
				</div>
			</div>
		);
	}

	// ════════════════════════════════════════════
	// RENDER: CATEGORY DETAIL (add/remove products)
	// ════════════════════════════════════════════
	if (view === "detail" && selectedCategory) {
		const products = (selectedCategory.product_categories || []).map(
			(pc) => pc.products,
		).filter(Boolean);

		return (
			<div className="manage-categories">
				<div className="mc-header">
					<div className="mc-header-left">
						<div
							className="mc-detail-badge"
							style={{ background: COLOR_MAP[selectedCategory.category_color] || COLOR_MAP.orange }}
						>
							{selectedCategory.category_name}
						</div>
						{selectedCategory.category_description && (
							<p className="mc-subtitle">{selectedCategory.category_description}</p>
						)}
					</div>
					<div className="mc-header-actions">
						<button className="mc-card__btn mc-card__btn--edit" onClick={() => openEdit(selectedCategory)}>
							Edit Category
						</button>
						<button className="mc-btn-back" onClick={backToGrid}>← Back</button>
					</div>
				</div>

				{message.text && (
					<div className={`mc-message mc-message--${message.type}`}>{message.text}</div>
				)}

				{/* Add product search */}
				<div className="mc-add-product">
					<h3 className="mc-section-title">Add Product to this Category</h3>
					<div className="mc-product-search-wrapper">
						<input
							type="text"
							className="mc-form__input"
							placeholder="Search product by name or company..."
							value={productSearch}
							onChange={(e) => setProductSearch(e.target.value)}
						/>
						{productSearchResults.length > 0 && (
							<div className="mc-product-dropdown">
								{productSearchResults.map((p) => (
									<div
										key={p.id}
										className="mc-product-dropdown__item"
										onClick={() => handleAddProduct(p)}
									>
										<div className="mc-product-dropdown__img">
											{p.product_images?.[0] ? (
												<img src={p.product_images[0]} alt={p.product_name} />
											) : (
												<div className="mc-product-dropdown__placeholder">
													{p.product_name.charAt(0)}
												</div>
											)}
										</div>
										<div className="mc-product-dropdown__info">
											<span className="mc-product-dropdown__name">{p.product_name}</span>
											<span className="mc-product-dropdown__company">{p.companies?.company_name}</span>
										</div>
										<span className="mc-product-dropdown__add">{addingProduct ? "..." : "+ Add"}</span>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Products in this category */}
				<div className="mc-detail-products">
					<h3 className="mc-section-title">
						Products in this category ({products.length})
					</h3>
					{products.length === 0 ? (
						<div className="mc-empty">
							<p>No products in this category yet. Search above to add some.</p>
						</div>
					) : (
						<div className="mc-product-list">
							{products.map((p) => (
								<div key={p.id} className="mc-product-row">
									<div className="mc-product-row__img">
										{p.product_images?.[0] ? (
											<img src={p.product_images[0]} alt={p.product_name} />
										) : (
											<div className="mc-product-row__placeholder">
												{p.product_name.charAt(0)}
											</div>
										)}
									</div>
									<div className="mc-product-row__info">
										<span className="mc-product-row__name">{p.product_name}</span>
										<span className="mc-product-row__company">{p.companies?.company_name}</span>
									</div>
									<div className="mc-product-row__meta">
										<span className="mc-product-row__price">₹{p.selling_price}</span>
										{p.weight && <span className="mc-product-row__weight">{p.weight}gm</span>}
									</div>
									<button
										className="mc-product-row__remove"
										onClick={() => handleRemoveProduct(p.id)}
									>
										✕ Remove
									</button>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		);
	}

	return null;
}
