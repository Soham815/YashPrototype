import { useState, useEffect } from "react";
import "../styles/AddProduct.css";

function AddProduct({ preSelectedCompanyId, productId }) {
	const isEditMode = !!productId;

	const [formData, setFormData] = useState({
		product_name: "",
		company_id: preSelectedCompanyId || "",
		weight: "",
		mrp: "",
		buying_price: "",
		selling_price: "",
		gst_percentage: "",
		has_offer: false,
		product_desc: "",
		items_per_box: "",
	});

	const [imageFiles, setImageFiles] = useState([]);
	const [imagePreviews, setImagePreviews] = useState([]);
	const [existingImages, setExistingImages] = useState([]);
	const [companies, setCompanies] = useState([]);
	const [loading, setLoading] = useState(false);
	const [fetchingData, setFetchingData] = useState(false);
	const [generatingDesc, setGeneratingDesc] = useState(false);
	const [message, setMessage] = useState({ type: "", text: "" });
	const [draggedIndex, setDraggedIndex] = useState(null);

	// Fetch companies for dropdown
	useEffect(() => {
		fetchCompanies();
	}, []);

	// Fetch product data if editing
	useEffect(() => {
		if (productId) {
			fetchProductData(productId);
		}
	}, [productId]);

	// Update formData when preSelectedCompanyId changes
	useEffect(() => {
		if (preSelectedCompanyId && !isEditMode) {
			setFormData((prev) => ({
				...prev,
				company_id: preSelectedCompanyId,
			}));
		}
	}, [preSelectedCompanyId, isEditMode]);

	const fetchCompanies = async () => {
		try {
			const response = await fetch("http://localhost:5000/api/companies");
			const data = await response.json();
			if (data.success) {
				setCompanies(data.data);
			}
		} catch (error) {
			console.error("Error fetching companies:", error);
		}
	};

	const fetchProductData = async (id) => {
		try {
			setFetchingData(true);
			const response = await fetch(`http://localhost:5000/api/products/${id}`);
			const data = await response.json();

			if (data.success) {
				const product = data.data;
				setFormData({
					product_name: product.product_name,
					company_id: product.company_id,
					weight: product.weight || "",
					mrp: product.mrp,
					buying_price: product.buying_price,
					selling_price: product.selling_price,
					gst_percentage: product.gst_percentage || "",
					has_offer: product.has_offer,
					product_desc: product.product_desc || "",
					items_per_box: product.items_per_box || "",
				});

				// Set existing images
				if (product.product_images && product.product_images.length > 0) {
					setExistingImages(product.product_images);
					setImagePreviews(product.product_images);
				}
			} else {
				setMessage({ type: "error", text: "Failed to load product data" });
			}
		} catch (error) {
			console.error("Error fetching product:", error);
			setMessage({ type: "error", text: "Failed to load product data" });
		} finally {
			setFetchingData(false);
		}
	};

	const handleInputChange = (e) => {
		const { name, value, type, checked } = e.target;
		setFormData({
			...formData,
			[name]: type === "checkbox" ? checked : value,
		});
	};

	const handleImageChange = (e) => {
		const files = Array.from(e.target.files);

		const validFiles = files.filter((file) => {
			if (!file.type.startsWith("image/")) {
				setMessage({ type: "error", text: "Only image files are allowed" });
				return false;
			}
			if (file.size > 5 * 1024 * 1024) {
				setMessage({ type: "error", text: `${file.name} is larger than 5MB` });
				return false;
			}
			return true;
		});

		if (validFiles.length === 0) return;

		// Clear existing images when new ones are added
		setExistingImages([]);

		const newImageFiles = [...imageFiles, ...validFiles];
		setImageFiles(newImageFiles);

		const newPreviews = [...imagePreviews];
		validFiles.forEach((file) => {
			const reader = new FileReader();
			reader.onloadend = () => {
				newPreviews.push(reader.result);
				setImagePreviews([...newPreviews]);
			};
			reader.readAsDataURL(file);
		});

		e.target.value = "";
	};

	const handleDeleteImage = (index) => {
		const newImageFiles = imageFiles.filter((_, i) => i !== index);
		const newPreviews = imagePreviews.filter((_, i) => i !== index);
		setImageFiles(newImageFiles);
		setImagePreviews(newPreviews);

		// If we deleted an existing image, mark it
		if (index < existingImages.length) {
			setExistingImages([]);
		}
	};

	const handleDragStart = (index) => {
		setDraggedIndex(index);
	};

	const handleDragOver = (e) => {
		e.preventDefault();
	};

	const handleDrop = (index) => {
		if (draggedIndex === null) return;

		const newImageFiles = [...imageFiles];
		const newPreviews = [...imagePreviews];

		[newImageFiles[draggedIndex], newImageFiles[index]] = [
			newImageFiles[index],
			newImageFiles[draggedIndex],
		];
		[newPreviews[draggedIndex], newPreviews[index]] = [
			newPreviews[index],
			newPreviews[draggedIndex],
		];

		setImageFiles(newImageFiles);
		setImagePreviews(newPreviews);
		setDraggedIndex(null);
	};

	const generateDescription = async () => {
		setGeneratingDesc(true);

		try {
			const { product_name, weight, mrp, selling_price } = formData;

			const desc = `${product_name} is a premium quality product${weight ? ` weighing ${weight}gm` : ""}. Available at an attractive price of ₹${selling_price}, down from MRP ₹${mrp}. Perfect for your daily needs.`;

			setFormData({ ...formData, product_desc: desc });
			setMessage({
				type: "success",
				text: "Description generated successfully!",
			});
		} catch (error) {
			setMessage({ type: "error", text: "Failed to generate description" });
		} finally {
			setGeneratingDesc(false);
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setMessage({ type: "", text: "" });

		// Validation
		if (!isEditMode && imageFiles.length === 0) {
			setMessage({
				type: "error",
				text: "At least one product image is required",
			});
			setLoading(false);
			return;
		}

		try {
			const submitData = new FormData();

			Object.keys(formData).forEach((key) => {
				submitData.append(key, formData[key]);
			});

			// If editing and no new images, keep existing ones
			if (isEditMode && imageFiles.length === 0 && existingImages.length > 0) {
				submitData.append("keep_existing_images", "true");
			}

			imageFiles.forEach((file) => {
				submitData.append("product_images", file);
			});

			const url = isEditMode
				? `http://localhost:5000/api/products/${productId}`
				: "http://localhost:5000/api/products";

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
						? "Product updated successfully!"
						: "Product added successfully!",
				});

				if (!isEditMode) {
					// Reset form only in add mode
					setFormData({
						product_name: "",
						company_id: "",
						weight: "",
						mrp: "",
						buying_price: "",
						selling_price: "",
						gst_percentage: "",
						has_offer: false,
						product_desc: "",
						items_per_box: "",
					});
					setImageFiles([]);
					setImagePreviews([]);
				}
			} else {
				setMessage({
					type: "error",
					text: data.error || "Failed to save product",
				});
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
			<div className="add-product-container">
				<div className="loading-state">
					<div className="spinner"></div>
					<p>Loading product data...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="add-product-container">
			<h2 className="form-title">
				{isEditMode ? "Edit Product" : "Add New Product"}
			</h2>

			<form onSubmit={handleSubmit} className="product-form">
				{/* Product Name */}
				<div className="form-group">
					<label htmlFor="product_name">Product Name *</label>
					<input
						type="text"
						id="product_name"
						name="product_name"
						value={formData.product_name}
						onChange={handleInputChange}
						placeholder="Enter product name"
						required
					/>
				</div>

				{/* Company Dropdown */}
				<div className="form-group">
					<label htmlFor="company_id">Company *</label>
					<select
						id="company_id"
						name="company_id"
						value={formData.company_id}
						onChange={handleInputChange}
						required
					>
						<option value="">Select a company</option>
						{companies.map((company) => (
							<option key={company.id} value={company.id}>
								{company.company_name}
							</option>
						))}
					</select>
				</div>

				{/* Product Images */}
				<div className="form-group">
					<label htmlFor="product_images">
						Product Images * (Min 1, Max 10)
						{isEditMode &&
							existingImages.length > 0 &&
							imageFiles.length === 0 && (
								<span className="image-note">
									{" "}
									- Upload new images to replace existing ones
								</span>
							)}
					</label>
					<input
						type="file"
						id="product_images"
						name="product_images"
						accept="image/*"
						multiple
						onChange={handleImageChange}
					/>

					{imagePreviews.length > 0 && (
						<div className="image-previews">
							<p className="preview-hint">
								{imageFiles.length > 0
									? "Drag images to reorder"
									: "Current product images"}
							</p>
							<div className="preview-grid">
								{imagePreviews.map((preview, index) => (
									<div
										key={index}
										className="preview-item"
										draggable={imageFiles.length > 0}
										onDragStart={() => handleDragStart(index)}
										onDragOver={handleDragOver}
										onDrop={() => handleDrop(index)}
									>
										<img src={preview} alt={`Preview ${index + 1}`} />
										<button
											type="button"
											className="delete-btn"
											onClick={() => handleDeleteImage(index)}
										>
											✕
										</button>
										<span className="image-number">{index + 1}</span>
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Pricing Section */}
				<div className="form-row">
					<div className="form-group">
						<label htmlFor="mrp">MRP (₹) *</label>
						<input
							type="number"
							id="mrp"
							name="mrp"
							value={formData.mrp}
							onChange={handleInputChange}
							placeholder="0.00"
							step="0.01"
							min="0"
							required
						/>
					</div>

					<div className="form-group">
						<label htmlFor="buying_price">Buying Price (₹) *</label>
						<input
							type="number"
							id="buying_price"
							name="buying_price"
							value={formData.buying_price}
							onChange={handleInputChange}
							placeholder="0.00"
							step="0.01"
							min="0"
							required
						/>
					</div>

					<div className="form-group">
						<label htmlFor="selling_price">Selling Price (₹) *</label>
						<input
							type="number"
							id="selling_price"
							name="selling_price"
							value={formData.selling_price}
							onChange={handleInputChange}
							placeholder="0.00"
							step="0.01"
							min="0"
							required
						/>
					</div>
				</div>

				{/* Weight and GST */}
				<div className="form-row">
					<div className="form-group">
						<label htmlFor="weight">Weight (gm)</label>
						<input
							type="number"
							id="weight"
							name="weight"
							value={formData.weight}
							onChange={handleInputChange}
							placeholder="0.00"
							step="0.01"
							min="0"
						/>
					</div>

					<div className="form-group">
						<label htmlFor="gst_percentage">GST (%)</label>
						<input
							type="number"
							id="gst_percentage"
							name="gst_percentage"
							value={formData.gst_percentage}
							onChange={handleInputChange}
							placeholder="0.00"
							step="0.01"
							min="0"
							max="100"
						/>
					</div>

					<div className="form-group">
						<label htmlFor="items_per_box">Items Per Box</label>
						<input
							type="number"
							id="items_per_box"
							name="items_per_box"
							value={formData.items_per_box}
							onChange={handleInputChange}
							placeholder="0"
							min="1"
						/>
					</div>
				</div>

				{/* Has Offer Toggle */}
				<div className="form-group toggle-group">
					<label className="toggle-wrapper">
						<input
							type="checkbox"
							name="has_offer"
							checked={formData.has_offer}
							onChange={handleInputChange}
						/>
						<span
							className={`toggle-slider ${formData.has_offer ? "checked" : ""}`}
						></span>
						<span className="toggle-text">Has Active Offer</span>
					</label>
				</div>

				{/* Product Description with AI */}
				<div className="form-group">
					<div className="desc-header">
						<label htmlFor="product_desc">Product Description</label>
						<button
							type="button"
							className="ai-btn"
							onClick={generateDescription}
							disabled={generatingDesc || !formData.product_name}
						>
							{generatingDesc ? "Generating..." : "✨ Generate with AI"}
						</button>
					</div>
					<textarea
						id="product_desc"
						name="product_desc"
						value={formData.product_desc}
						onChange={handleInputChange}
						placeholder="Enter product description or generate with AI"
						rows="4"
					/>
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
							? "Updating Product..."
							: "Adding Product..."
						: isEditMode
							? "Update Product"
							: "Add Product"}
				</button>
			</form>
		</div>
	);
}

export default AddProduct;
