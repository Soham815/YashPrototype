import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../config/api";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { OpenStreetMapProvider } from "leaflet-geosearch";
import "leaflet/dist/leaflet.css";
import "leaflet-geosearch/dist/geosearch.css";
import L from "leaflet";
import "../styles/CustomerSignup.css";

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl:
		"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
	iconUrl:
		"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
	shadowUrl:
		"https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Component to handle map clicks
function LocationMarker({ position, setPosition }) {
	const map = useMap();

	useEffect(() => {
		if (position) {
			map.flyTo(position, 16);
		}
	}, [position, map]);

	useEffect(() => {
		const onClick = (e) => {
			setPosition(e.latlng);
		};

		map.on("click", onClick);

		return () => {
			map.off("click", onClick);
		};
	}, [map, setPosition]);

	return position === null ? null : <Marker position={position} />;
}

function CustomerSignup() {
	const [formData, setFormData] = useState({
		customer_name: "",
		business_name: "",
		contact_number: "",
		street_address: "",
		gst_number: "",
		food_licence_number: "",
		email: "",
	});

	const [mapPosition, setMapPosition] = useState(null);
	const [mapCenter, setMapCenter] = useState([18.5204, 73.8567]); // Default: Pune
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState({ type: "", text: "" });
	const [showMap, setShowMap] = useState(false);

	// Search functionality
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState([]);
	const [searching, setSearching] = useState(false);
	const [showResults, setShowResults] = useState(false);

	const searchProvider = useRef(new OpenStreetMapProvider());

	// Get user's current location
	useEffect(() => {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					const { latitude, longitude } = position.coords;
					setMapCenter([latitude, longitude]);
					setMapPosition({ lat: latitude, lng: longitude });
				},
				(error) => {
					console.log("Location access denied, using default location");
				},
			);
		}
	}, []);

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setFormData({
			...formData,
			[name]: value,
		});
	};

	const handleContactChange = (e) => {
		const value = e.target.value.replace(/[^0-9]/g, "");
		if (value.length <= 10) {
			setFormData({
				...formData,
				contact_number: value,
			});
		}
	};

	const handleGSTChange = (e) => {
		const value = e.target.value.toUpperCase();
		if (value.length <= 15) {
			setFormData({
				...formData,
				gst_number: value,
			});
		}
	};

	// Handle search input
	const handleSearchChange = (e) => {
		setSearchQuery(e.target.value);
	};

	// Perform search - FIXED: No form submission
	const handleSearch = async () => {
		if (!searchQuery.trim()) return;

		setSearching(true);
		setShowResults(false);

		try {
			const results = await searchProvider.current.search({
				query: searchQuery,
			});

			setSearchResults(results);
			setShowResults(true);

			// If only one result, auto-select it
			if (results.length === 1) {
				handleSelectResult(results[0]);
			}
		} catch (error) {
			console.error("Search error:", error);
			setMessage({
				type: "error",
				text: "Search failed. Please try again.",
			});
			setTimeout(() => setMessage({ type: "", text: "" }), 3000);
		} finally {
			setSearching(false);
		}
	};

	// Handle Enter key in search input
	const handleSearchKeyPress = (e) => {
		if (e.key === "Enter") {
			e.preventDefault(); // Prevent form submission
			handleSearch();
		}
	};

	// Handle result selection - FIXED: Auto-fill address
	const handleSelectResult = (result) => {
		const { y, x, label } = result; // y = latitude, x = longitude
		const newPosition = { lat: y, lng: x };

		setMapPosition(newPosition);
		setMapCenter([y, x]);
		setShowResults(false);
		setSearchQuery(label);

		// FIXED: Auto-fill street address
		setFormData((prev) => ({
			...prev,
			street_address: label,
		}));

		setMessage({
			type: "success",
			text: "Location selected! Address auto-filled.",
		});
		setTimeout(() => setMessage({ type: "", text: "" }), 3000);
	};

	// Use current location
	const handleUseCurrentLocation = () => {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					const { latitude, longitude } = position.coords;
					const newPosition = { lat: latitude, lng: longitude };
					setMapPosition(newPosition);
					setMapCenter([latitude, longitude]);
					setMessage({
						type: "success",
						text: "Current location set successfully!",
					});
					setTimeout(() => setMessage({ type: "", text: "" }), 3000);
				},
				(error) => {
					setMessage({
						type: "error",
						text: "Unable to get your location. Please enable location services.",
					});
					setTimeout(() => setMessage({ type: "", text: "" }), 5000);
				},
			);
		} else {
			setMessage({
				type: "error",
				text: "Geolocation is not supported by your browser.",
			});
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setMessage({ type: "", text: "" });

		if (!mapPosition) {
			setMessage({
				type: "error",
				text: "Please select your location on the map",
			});
			setLoading(false);
			return;
		}

		try {
			const submitData = {
				...formData,
				latitude: mapPosition.lat,
				longitude: mapPosition.lng,
			};

			const response = await fetch(`${API_BASE_URL}/customers`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(submitData),
			});

			const data = await response.json();

			if (response.ok) {
				setMessage({
					type: "success",
					text: "Registration successful! Welcome aboard! 🎉",
				});

				setFormData({
					customer_name: "",
					business_name: "",
					contact_number: "",
					street_address: "",
					gst_number: "",
					food_licence_number: "",
					email: "",
				});
				setMapPosition(null);
				setShowMap(false);
				setSearchQuery("");
				setSearchResults([]);
			} else {
				setMessage({
					type: "error",
					text: data.error || "Registration failed",
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
		<div className="customer-signup-container">
			<div className="signup-header">
				<h1 className="signup-title">Customer Registration</h1>
				<p className="signup-subtitle">Join us and start ordering today!</p>
			</div>

			<form onSubmit={handleSubmit} className="signup-form">
				{/* Personal Information */}
				<div className="form-section">
					<h3 className="section-title">Personal Information</h3>

					<div className="form-row">
						<div className="form-group">
							<label htmlFor="customer_name">Full Name *</label>
							<input
								type="text"
								id="customer_name"
								name="customer_name"
								value={formData.customer_name}
								onChange={handleInputChange}
								placeholder="Enter your full name"
								required
							/>
						</div>

						<div className="form-group">
							<label htmlFor="contact_number">Contact Number *</label>
							<input
								type="tel"
								id="contact_number"
								name="contact_number"
								value={formData.contact_number}
								onChange={handleContactChange}
								placeholder="10-digit mobile number"
								pattern="[6-9][0-9]{9}"
								required
							/>
							<span className="input-hint">
								{formData.contact_number.length}/10
							</span>
						</div>
					</div>

					<div className="form-group">
						<label htmlFor="email">Email (Optional)</label>
						<input
							type="email"
							id="email"
							name="email"
							value={formData.email}
							onChange={handleInputChange}
							placeholder="your.email@example.com"
						/>
					</div>
				</div>

				{/* Business Information */}
				<div className="form-section">
					<h3 className="section-title">Business Information</h3>

					<div className="form-group">
						<label htmlFor="business_name">Business Name *</label>
						<input
							type="text"
							id="business_name"
							name="business_name"
							value={formData.business_name}
							onChange={handleInputChange}
							placeholder="Enter your business/shop name"
							required
						/>
					</div>

					<div className="form-row">
						<div className="form-group">
							<label htmlFor="gst_number">GST Number *</label>
							<input
								type="text"
								id="gst_number"
								name="gst_number"
								value={formData.gst_number}
								onChange={handleGSTChange}
								placeholder="22AAAAA0000A1Z5"
								pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}"
								maxLength="15"
								required
							/>
							<span className="input-hint">
								{formData.gst_number.length}/15
							</span>
						</div>

						<div className="form-group">
							<label htmlFor="food_licence_number">Food Licence Number *</label>
							<input
								type="text"
								id="food_licence_number"
								name="food_licence_number"
								value={formData.food_licence_number}
								onChange={handleInputChange}
								placeholder="Enter FSSAI licence number"
								required
							/>
						</div>
					</div>
				</div>

				{/* Location Information */}
				<div className="form-section">
					<h3 className="section-title">Location Information</h3>

					<div className="form-group">
						<label htmlFor="street_address">Street Address *</label>
						<textarea
							id="street_address"
							name="street_address"
							value={formData.street_address}
							onChange={handleInputChange}
							placeholder="Shop No., Building, Street, Landmark, City, Pincode"
							rows="3"
							required
						/>
					</div>

					<div className="map-section">
						<div className="map-header">
							<label>Pin Your Location on Map *</label>
							<button
								type="button"
								className="toggle-map-btn"
								onClick={() => setShowMap(!showMap)}
							>
								{showMap ? "Hide Map" : "Show Map"}
							</button>
						</div>

						{showMap && (
							<div className="map-container">
								{/* Search Bar - FIXED: Changed from form to div */}
								<div className="map-search-container">
									<div className="search-form">
										<input
											type="text"
											className="map-search-input"
											placeholder="Search for landmarks, addresses, or places..."
											value={searchQuery}
											onChange={handleSearchChange}
											onKeyPress={handleSearchKeyPress}
										/>
										<button
											type="button"
											className="search-btn"
											onClick={handleSearch}
											disabled={searching}
										>
											{searching ? "🔍 Searching..." : "🔍 Search"}
										</button>
										<button
											type="button"
											className="current-location-btn"
											onClick={handleUseCurrentLocation}
											title="Use current location"
										>
											📍 My Location
										</button>
									</div>

									{/* Search Results Dropdown */}
									{showResults && searchResults.length > 0 && (
										<div className="search-results-dropdown">
											{searchResults.map((result, index) => (
												<div
													key={index}
													className="search-result-item"
													onClick={() => handleSelectResult(result)}
												>
													<span className="result-icon">📍</span>
													<div className="result-details">
														<p className="result-label">{result.label}</p>
													</div>
												</div>
											))}
										</div>
									)}

									{showResults && searchResults.length === 0 && (
										<div className="search-results-dropdown">
											<div className="no-results">
												No results found. Try a different search term.
											</div>
										</div>
									)}
								</div>

								<p className="map-instruction">
									📍 Click on the map to set your exact location
								</p>

								<MapContainer
									center={mapCenter}
									zoom={13}
									className="leaflet-map"
								>
									<TileLayer
										attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
										url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
									/>
									<LocationMarker
										position={mapPosition}
										setPosition={setMapPosition}
									/>
								</MapContainer>

								{mapPosition && (
									<div className="location-display">
										<p>
											<strong>Selected Location:</strong>
										</p>
										<p>Latitude: {mapPosition.lat.toFixed(6)}</p>
										<p>Longitude: {mapPosition.lng.toFixed(6)}</p>
									</div>
								)}
							</div>
						)}

						{!showMap && mapPosition && (
							<div className="location-confirmed">
								✅ Location selected: {mapPosition.lat.toFixed(4)},{" "}
								{mapPosition.lng.toFixed(4)}
							</div>
						)}
					</div>
				</div>

				{/* Message Display */}
				{message.text && (
					<div className={`message message--${message.type}`}>
						{message.text}
					</div>
				)}

				{/* Submit Button */}
				<button type="submit" className="submit-btn" disabled={loading}>
					{loading ? "Registering..." : "Register Now"}
				</button>
			</form>
		</div>
	);
}

export default CustomerSignup;
