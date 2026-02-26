import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import Navbar from "./Navbar";
import "../styles/ProductDetail.css";

function ProductDetail() {
	const { id } = useParams();
	const navigate = useNavigate();

	const [product, setProduct] = useState(null);
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState({ type: "", text: "" });
	const [quantity, setQuantity] = useState(1);
	const [selectedImage, setSelectedImage] = useState(0);
	const [searchQuery, setSearchQuery] = useState("");

	useEffect(() => {
		fetchProduct();
	}, [id]);

	const fetchProduct = async () => {
		try {
			setLoading(true);
			const response = await fetch(`${API_BASE_URL}/products/${id}`);
			const data = await response.json();

			if (data.success) {
				setProduct(data.data);
			} else {
				setMessage({ type: "error", text: "Product not found" });
			}
		} catch (error) {
			console.error("Error fetching product:", error);
			setMessage({ type: "error", text: "Failed to load product" });
		} finally {
			setLoading(false);
		}
	};

	const calculateDiscount = (mrp, sellingPrice) => {
		if (!mrp || !sellingPrice) return 0;
		return Math.round(((mrp - sellingPrice) / mrp) * 100);
	};

	const handleAddToCart = () => {
		// TODO: Implement cart functionality
		console.log("Add to cart:", { productId: id, quantity });
		setMessage({ type: "success", text: "Added to cart successfully!" });
		setTimeout(() => setMessage({ type: "", text: "" }), 3000);
	};

	const handleBuyNow = () => {
		// TODO: Implement buy now functionality
		console.log("Buy now:", { productId: id, quantity });
		navigate("/checkout");
	};

	if (loading) {
		return (
			<>
				<Navbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
				<div className="loading-state">
					<div className="spinner"></div>
					<p>Loading product...</p>
				</div>
			</>
		);
	}

	if (!product) {
		return (
			<>
				<Navbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
				<div className="error-state">
					<h2>Product not found</h2>
					<button onClick={() => navigate("/search")} className="btn">
						Back to Search
					</button>
				</div>
			</>
		);
	}

	return (
		<>
			<Navbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

			<section className="product-page">
				<main className="container container--orange">
					<div className="prod__page">
						<div className="prod__gallery">
							{product.product_images && product.product_images.length > 0 ? (
								<>
									<img
										src={product.product_images[selectedImage]}
										alt={product.product_name}
										className="prod__img"
									/>

									{product.product_images.length > 1 && (
										<div className="prod__gallery__thumbnails">
											{product.product_images.map((img, index) => (
												<img
													key={index}
													src={img}
													alt={`${product.product_name} ${index + 1}`}
													className={`prod__gallery__thumbnail ${
														selectedImage === index ? "active" : ""
													}`}
													onClick={() => setSelectedImage(index)}
												/>
											))}
										</div>
									)}
								</>
							) : (
								<div className="prod__img-placeholder">
									{product.product_name.charAt(0).toUpperCase()}
								</div>
							)}

							<div className="prod__btns">
								<button className="prod__cart btn" onClick={handleAddToCart}>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="prod__cart__icon"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
										/>
									</svg>
									<span>Add to cart</span>
								</button>

								<button className="prod__buy btn" onClick={handleBuyNow}>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="prod__buy__icon"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
										/>
									</svg>
									<span>Buy now</span>
								</button>
							</div>
						</div>

						<div className="prod__description">
							<h2 className="prod__company-name">
								{product.companies?.company_name || "Unknown"}
							</h2>
							<h3 className="prod__title">{product.product_name}</h3>

							<div className="prod__prices">
								<p className="prod__mrp">₹{product.mrp}</p>
								<p className="prod__rate">₹{product.selling_price}</p>
								<p className="prod__discount">
									{calculateDiscount(product.mrp, product.selling_price)}% off
								</p>
							</div>

							{product.product_desc && (
								<div className="prod__about">
									<h4 className="prod__about__title">About this product</h4>
									<p className="prod__about__text">{product.product_desc}</p>
								</div>
							)}

							<div className="prod__features">
								<div className="prod__feature">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="prod__feature__icon"
										viewBox="0 0 24 24"
									>
										<path d="M24,12c0-1.696-.86-3.191-2.168-4.073,.301-1.548-.148-3.213-1.347-4.413-1.199-1.199-2.864-1.648-4.413-1.347-.882-1.308-2.377-2.168-4.073-2.168s-3.191,.86-4.073,2.168c-1.548-.301-3.214,.148-4.413,1.347-1.199,1.199-1.648,2.864-1.347,4.413-1.308,.882-2.168,2.377-2.168,4.073s.86,3.191,2.168,4.073c-.301,1.548,.148,3.214,1.347,4.413,1.199,1.199,2.864,1.648,4.413,1.347,.882,1.308,2.377,2.168,4.073,2.168s3.191-.86,4.073-2.168c1.548,.301,3.214-.148,4.413-1.347,1.199-1.199,1.648-2.864,1.347-4.413,1.308-.882,2.168-2.377,2.168-4.073Zm-16-3c0-.552,.448-1,1-1s1,.448,1,1-.448,1-1,1-1-.448-1-1Zm2.766,7h-2.332l4.8-8h2.332l-4.8,8Zm4.234,0c-.552,0-1-.448-1-1s.448-1,1-1,1,.448,1,1-.448,1-1,1Z" />
									</svg>
									<p className="prod__feature__description">
										Big Savings Await: Enjoy Huge Discounts!
									</p>
								</div>

								<div className="prod__feature">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="prod__feature__icon"
										viewBox="0 0 24 24"
									>
										<path d="M20,22V5c0-1.654-1.346-3-3-3h-1.19c-.18-.507-.48-.968-.908-1.319C14.205,.109,13.298-.115,12.412,.059L6.411,1.259c-1.397,.28-2.411,1.518-2.411,2.941V22H0v2H24v-2h-4Zm-7.5-8.75c-.828,0-1.5-.672-1.5-1.5s.672-1.5,1.5-1.5,1.5,.672,1.5,1.5-.672,1.5-1.5,1.5Zm5.5,8.75h-2V4h1c.551,0,1,.448,1,1V22Z" />
									</svg>
									<p className="prod__feature__description">
										Get safe delivery at your doorstep
									</p>
								</div>

								<div className="prod__feature">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="prod__feature__icon"
										viewBox="0 0 24 24"
									>
										<path d="m14.181.207a1 1 0 0 0 -1.181.983v2.879a8.053 8.053 0 1 0 6.931 6.931h2.886a1 1 0 0 0 .983-1.181 12.047 12.047 0 0 0 -9.619-9.612zm1.819 12.793h-2.277a1.994 1.994 0 1 1 -2.723-2.723v-3.277a1 1 0 0 1 2 0v3.277a2 2 0 0 1 .723.723h2.277a1 1 0 0 1 0 2z" />
									</svg>
									<p className="prod__feature__description">
										Get Your Order Delivered in Just 3 Hours!
									</p>
								</div>
							</div>

							{message.text && (
								<div className={`message message--${message.type}`}>
									{message.text}
								</div>
							)}
						</div>
					</div>
				</main>
			</section>
		</>
	);
}

export default ProductDetail;
