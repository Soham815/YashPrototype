import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/AddCompany.css";

function AddCompany({ companyId }) {
	const navigate = useNavigate();
	const [formData, setFormData] = useState({
		company_name: "",
	});
	const [logoFile, setLogoFile] = useState(null);
	const [logoPreview, setLogoPreview] = useState(null);
	const [existingLogoUrl, setExistingLogoUrl] = useState(null);
	const [loading, setLoading] = useState(false);
	const [fetchingData, setFetchingData] = useState(false);
	const [message, setMessage] = useState({ type: "", text: "" });

	const isEditMode = !!companyId;

	// Fetch company data if editing
	useEffect(() => {
		if (companyId) {
			fetchCompanyData(companyId);
		}
	}, [companyId]);

	const fetchCompanyData = async (id) => {
		try {
			setFetchingData(true);
			const response = await fetch(`http://localhost:5000/api/companies/${id}`);
			const data = await response.json();

			if (data.success) {
				setFormData({
					company_name: data.data.company_name,
				});
				if (data.data.company_logo) {
					setExistingLogoUrl(data.data.company_logo);
					setLogoPreview(data.data.company_logo);
				}
			} else {
				setMessage({ type: "error", text: "Failed to load company data" });
			}
		} catch (error) {
			console.error("Error fetching company:", error);
			setMessage({ type: "error", text: "Failed to load company data" });
		} finally {
			setFetchingData(false);
		}
	};

	const handleInputChange = (e) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value,
		});
	};

	const handleFileChange = (e) => {
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

			setLogoFile(file);

			const reader = new FileReader();
			reader.onloadend = () => {
				setLogoPreview(reader.result);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setMessage({ type: "", text: "" });

		try {
			const submitData = new FormData();
			submitData.append("company_name", formData.company_name);

			if (logoFile) {
				submitData.append("company_logo", logoFile);
			}

			const url = isEditMode
				? `http://localhost:5000/api/companies/${companyId}`
				: "http://localhost:5000/api/companies";

			const method = isEditMode ? "PUT" : "POST";

			const response = await fetch(url, {
				method: method,
				body: submitData,
			});

			const data = await response.json();

			if (response.ok) {
				setMessage({
					type: "success",
					text: isEditMode
						? "Company updated successfully!"
						: "Company added successfully!",
				});

				if (!isEditMode) {
					// Reset form only for add mode
					setFormData({ company_name: "" });
					setLogoFile(null);
					setLogoPreview(null);
				}
			} else {
				setMessage({ type: "error", text: data.error || "Operation failed" });
			}
		} catch (error) {
			console.error("Error:", error);
			setMessage({ type: "error", text: "Network error. Please try again." });
		} finally {
			setLoading(false);
		}
	};

	if (fetchingData) {
		return (
			<div className="add-company-container">
				<div className="loading-state">
					<div className="spinner"></div>
					<p>Loading company data...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="add-company-container">
			{/* Back Button */}
			<button className="back-btn" onClick={() => navigate("/admin/companies")}>
				← Back to Companies
			</button>

			<h2 className="form-title">
				{isEditMode ? "Edit Company" : "Add New Company"}
			</h2>

			<form onSubmit={handleSubmit} className="company-form">
				{/* Company Name Input */}
				<div className="form-group">
					<label htmlFor="company_name">Company Name *</label>
					<input
						type="text"
						id="company_name"
						name="company_name"
						value={formData.company_name}
						onChange={handleInputChange}
						placeholder="Enter company name"
						required
					/>
				</div>

				{/* Logo Upload Input */}
				<div className="form-group">
					<label htmlFor="company_logo">
						Company Logo{" "}
						{isEditMode
							? "(Optional - leave empty to keep current)"
							: "(Optional)"}
					</label>
					<input
						type="file"
						id="company_logo"
						name="company_logo"
						accept="image/*"
						onChange={handleFileChange}
					/>

					{/* Image Preview */}
					{logoPreview && (
						<div className="image-preview">
							<img src={logoPreview} alt="Logo preview" />
							{isEditMode && !logoFile && existingLogoUrl && (
								<p className="preview-note">
									Current logo (upload new to replace)
								</p>
							)}
						</div>
					)}
				</div>

				{/* Message Display */}
				{message.text && (
					<div className={`message message--${message.type}`}>
						{message.text}
					</div>
				)}

				{/* Submit Button */}
				<button type="submit" className="submit-btn" disabled={loading}>
					{loading
						? isEditMode
							? "Updating..."
							: "Adding..."
						: isEditMode
							? "Update Company"
							: "Add Company"}
				</button>
			</form>
		</div>
	);
}

export default AddCompany;
