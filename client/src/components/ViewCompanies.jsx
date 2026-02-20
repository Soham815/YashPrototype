import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ViewCompanies.css";

function ViewCompanies() {
	const navigate = useNavigate();
	const [companies, setCompanies] = useState([]);
	const [filteredCompanies, setFilteredCompanies] = useState([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState({ type: "", text: "" });
	const [expandedCompany, setExpandedCompany] = useState(null);
	const [companyProducts, setCompanyProducts] = useState({});
	const [deletingCompanyId, setDeletingCompanyId] = useState(null);
	const [showPinModal, setShowPinModal] = useState(false);
	const [pinInput, setPinInput] = useState("");
	const [companyToDelete, setCompanyToDelete] = useState(null);

	useEffect(() => {
		fetchCompanies();
	}, []);

	useEffect(() => {
		if (searchQuery.trim() === "") {
			setFilteredCompanies(companies);
		} else {
			const filtered = companies.filter((company) =>
				company.company_name.toLowerCase().includes(searchQuery.toLowerCase()),
			);
			setFilteredCompanies(filtered);
		}
	}, [searchQuery, companies]);

	const fetchCompanies = async () => {
		try {
			setLoading(true);
			const response = await fetch("http://localhost:5000/api/companies");
			const data = await response.json();

			if (data.success) {
				setCompanies(data.data);
				setFilteredCompanies(data.data);
			} else {
				setMessage({ type: "error", text: "Failed to load companies" });
			}
		} catch (error) {
			console.error("Error fetching companies:", error);
			setMessage({ type: "error", text: "Network error. Please try again." });
		} finally {
			setLoading(false);
		}
	};

	const fetchCompanyProducts = async (companyId) => {
		try {
			const response = await fetch("http://localhost:5000/api/products");
			const data = await response.json();

			if (data.success) {
				const products = data.data.filter((p) => p.company_id === companyId);
				setCompanyProducts((prev) => ({
					...prev,
					[companyId]: products,
				}));
			}
		} catch (error) {
			console.error("Error fetching products:", error);
		}
	};

	const toggleProductList = (companyId) => {
		if (expandedCompany === companyId) {
			setExpandedCompany(null);
		} else {
			setExpandedCompany(companyId);
			if (!companyProducts[companyId]) {
				fetchCompanyProducts(companyId);
			}
		}
	};

	const handleSearchChange = (e) => {
		setSearchQuery(e.target.value);
	};

	// ✅ Navigation handlers using React Router
	const handleEdit = (companyId) => {
		navigate(`/admin/companies/edit/${companyId}`);
	};

	const handleAddNew = () => {
		navigate("/admin/companies/add");
	};

	const handleAddProduct = (companyId) => {
		navigate(`/admin/products/add?company=${companyId}`);
	};

	// ✅ Delete handlers (unchanged)
	const handleDeleteClick = (companyId, companyName) => {
		setCompanyToDelete({ id: companyId, name: companyName });
		setShowPinModal(true);
		setPinInput("");
	};

	const handleDeleteConfirm = async () => {
		if (!pinInput) {
			setMessage({
				type: "error",
				text: "Please enter PIN",
			});
			return;
		}

		try {
			setDeletingCompanyId(companyToDelete.id);
			const response = await fetch(
				`http://localhost:5000/api/companies/${companyToDelete.id}`,
				{
					method: "DELETE",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ pin: pinInput }),
				},
			);

			const data = await response.json();

			if (response.ok) {
				setMessage({
					type: "success",
					text: data.message || "Company deleted successfully!",
				});
				setShowPinModal(false);
				setPinInput("");
				setCompanyToDelete(null);
				await fetchCompanies();
				setTimeout(() => setMessage({ type: "", text: "" }), 3000);
			} else {
				setMessage({
					type: "error",
					text: data.error || "Failed to delete company",
				});
				setTimeout(() => setMessage({ type: "", text: "" }), 5000);
			}
		} catch (error) {
			console.error("Error deleting company:", error);
			setMessage({
				type: "error",
				text: "Network error. Please try again.",
			});
			setTimeout(() => setMessage({ type: "", text: "" }), 5000);
		} finally {
			setDeletingCompanyId(null);
		}
	};

	const handleCancelDelete = () => {
		setShowPinModal(false);
		setPinInput("");
		setCompanyToDelete(null);
	};

	return (
		<div className="view-companies-page">
			{/* Header Row */}
			<div className="page-header">
				<h2 className="page-heading">Manage Companies</h2>
				<button className="add-company-header-btn" onClick={handleAddNew}>
					<span className="btn-icon">+</span>
					Add Company
				</button>
			</div>

			{/* Search Bar Row */}
			<div className="search-row">
				<div className="search-bar-wrapper">
					<input
						type="text"
						className="search-bar"
						placeholder="Search companies by name..."
						value={searchQuery}
						onChange={handleSearchChange}
					/>
					<span className="search-icon">🔍</span>
				</div>
			</div>

			{/* Message Display */}
			{message.text && (
				<div className={`message message--${message.type}`}>{message.text}</div>
			)}

			{/* Loading State */}
			{loading ? (
				<div className="loading-state">
					<div className="spinner"></div>
					<p>Loading companies...</p>
				</div>
			) : (
				<>
					{/* Companies List */}
					<div className="companies-list">
						{filteredCompanies.length > 0 ? (
							filteredCompanies.map((company) => (
								<div key={company.id} className="company-row">
									{/* Company Logo */}
									<div className="company-logo-cell">
										{company.company_logo ? (
											<img
												src={company.company_logo}
												alt={`${company.company_name} logo`}
												className="company-logo"
											/>
										) : (
											<div className="company-logo-placeholder">
												{company.company_name.charAt(0).toUpperCase()}
											</div>
										)}
									</div>

									{/* Company Name */}
									<div className="company-name-cell">
										<h3>{company.company_name}</h3>
									</div>

									{/* Products Dropdown */}
									<div className="company-products-cell">
										<button
											className="products-dropdown-btn"
											onClick={() => toggleProductList(company.id)}
										>
											<span>Products</span>
											<span
												className={`dropdown-arrow ${expandedCompany === company.id ? "expanded" : ""}`}
											>
												▼
											</span>
										</button>

										{/* Expanded Product List */}
										{expandedCompany === company.id && (
											<div className="products-dropdown-content">
												{companyProducts[company.id] ? (
													<>
														{companyProducts[company.id].length > 0 ? (
															<ul className="product-list">
																{companyProducts[company.id].map((product) => (
																	<li key={product.id} className="product-item">
																		{product.product_name}
																	</li>
																))}
															</ul>
														) : (
															<p className="no-products">No products yet</p>
														)}
														<button
															className="add-product-dropdown-btn"
															onClick={() => handleAddProduct(company.id)}
														>
															<span className="add-product-icon">+</span>
															Add Product
														</button>
													</>
												) : (
													<p className="loading-products">Loading...</p>
												)}
											</div>
										)}
									</div>

									{/* Added On */}
									<div className="company-date-cell">
										<span className="date-label">Added:</span>
										<span className="date-value">
											{new Date(company.created_at).toLocaleDateString(
												"en-US",
												{
													year: "numeric",
													month: "short",
													day: "numeric",
												},
											)}
										</span>
									</div>

									{/* Action Buttons */}
									<div className="company-action-cell">
										<button
											className="edit-btn"
											onClick={() => handleEdit(company.id)}
										>
											Edit
										</button>
										<button
											className="delete-btn"
											onClick={() =>
												handleDeleteClick(company.id, company.company_name)
											}
											disabled={deletingCompanyId === company.id}
										>
											{deletingCompanyId === company.id
												? "Deleting..."
												: "Delete"}
										</button>
									</div>
								</div>
							))
						) : (
							<div className="no-results">
								<p>No companies found</p>
								{searchQuery && (
									<p className="no-results-hint">Try a different search term</p>
								)}
							</div>
						)}
					</div>
				</>
			)}

			{/* PIN Modal */}
			{showPinModal && (
				<div className="modal-overlay" onClick={handleCancelDelete}>
					<div
						className="pin-modal-content"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="pin-modal-header">
							<h3>⚠️ Delete Company</h3>
							<button className="modal-close-btn" onClick={handleCancelDelete}>
								✕
							</button>
						</div>
						<div className="pin-modal-body">
							<p className="pin-warning">
								You are about to delete{" "}
								<strong>"{companyToDelete?.name}"</strong>
							</p>
							<p className="pin-cascade-warning">
								⚠️ This will also delete ALL products and offers associated with
								this company!
							</p>
							<label htmlFor="pin-input" className="pin-label">
								Enter Admin PIN to confirm:
							</label>
							<input
								type="password"
								id="pin-input"
								className="pin-input"
								value={pinInput}
								onChange={(e) => setPinInput(e.target.value)}
								placeholder="Enter PIN"
								autoFocus
								onKeyPress={(e) => {
									if (e.key === "Enter") {
										handleDeleteConfirm();
									}
								}}
							/>
							<div className="pin-modal-actions">
								<button className="cancel-btn" onClick={handleCancelDelete}>
									Cancel
								</button>
								<button
									className="confirm-delete-btn"
									onClick={handleDeleteConfirm}
									disabled={deletingCompanyId === companyToDelete?.id}
								>
									{deletingCompanyId === companyToDelete?.id
										? "Deleting..."
										: "Delete Company"}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default ViewCompanies;
