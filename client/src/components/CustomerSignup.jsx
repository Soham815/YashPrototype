import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";
import "../styles/CustomerSignup.css";

export default function CustomerSignup() {
	const navigate   = useNavigate();
	const { login }  = useAuth();
	const mapRef     = useRef(null);
	const leafletMap = useRef(null);
	const markerRef  = useRef(null);

	const [form, setForm] = useState({
		customer_name:       "",
		business_name:       "",
		contact_number:      "",
		email:               "",
		street_address:      "",
		city:                "",
		gst_number:          "",
		food_licence_number: "",
		latitude:            "",
		longitude:           "",
		password:            "",
		confirmPassword:     "",
	});

	const [error,          setError]          = useState("");
	const [loading,        setLoading]        = useState(false);
	const [mapReady,       setMapReady]       = useState(false);
	const [locationMsg,    setLocationMsg]    = useState("");
	const [landmarkQuery,  setLandmarkQuery]  = useState("");
	const [landmarkResults,setLandmarkResults]= useState([]);
	const [searchLoading,  setSearchLoading]  = useState(false);

	/* ── Load Leaflet from CDN ─────────────────────────────────── */
	useEffect(() => {
		if (!document.getElementById("leaflet-css")) {
			const link  = document.createElement("link");
			link.id     = "leaflet-css";
			link.rel    = "stylesheet";
			link.href   = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
			document.head.appendChild(link);
		}
		if (!window.L) {
			const script  = document.createElement("script");
			script.src    = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
			script.onload = () => setMapReady(true);
			document.head.appendChild(script);
		} else {
			setMapReady(true);
		}
	}, []);

	/* ── Build orange pin icon ─────────────────────────────────── */
	const buildIcon = (L) =>
		L.divIcon({
			className: "",
			html: `<div style="
				width:28px;height:28px;background:#e67e22;
				border:3px solid #fff;border-radius:50% 50% 50% 0;
				transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.35);
			"></div>`,
			iconSize:   [28, 28],
			iconAnchor: [14, 28],
		});

	/* ── Place / move marker and update state ──────────────────── */
	const placeMarker = (L, map, lat, lng) => {
		if (markerRef.current) {
			markerRef.current.setLatLng([lat, lng]);
		} else {
			markerRef.current = L.marker([lat, lng], {
				icon:      buildIcon(L),
				draggable: true,
			}).addTo(map);

			markerRef.current.on("dragend", (ev) => {
				const p = ev.target.getLatLng();
				setForm((prev) => ({
					...prev,
					latitude:  p.lat.toFixed(6),
					longitude: p.lng.toFixed(6),
				}));
				setLocationMsg("📍 Location updated.");
			});
		}

		setForm((prev) => ({
			...prev,
			latitude:  lat.toFixed(6),
			longitude: lng.toFixed(6),
		}));
	};

	/* ── Init map once Leaflet ready ───────────────────────────── */
	useEffect(() => {
		if (!mapReady || !mapRef.current || leafletMap.current) return;

		const L   = window.L;
		const map = L.map(mapRef.current).setView([18.5204, 73.8567], 13);

		L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution: "© OpenStreetMap contributors",
			maxZoom: 19,
		}).addTo(map);

		map.on("click", (e) => {
			placeMarker(L, map, e.latlng.lat, e.latlng.lng);
			setLocationMsg("📍 Location pinned! Drag the marker to fine-tune.");
		});

		leafletMap.current = map;
	}, [mapReady]);

	/* ── GPS button ────────────────────────────────────────────── */
	const handleUseMyLocation = () => {
		if (!navigator.geolocation)
			return setLocationMsg("❌ Geolocation not supported by your browser.");

		setLocationMsg("🔍 Getting your location...");
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				const { latitude: lat, longitude: lng } = pos.coords;
				const map = leafletMap.current;
				if (map && window.L) {
					map.setView([lat, lng], 17);
					placeMarker(window.L, map, lat, lng);
				}
				setLocationMsg("✅ Location found! Drag the marker to adjust.");
			},
			() => setLocationMsg("❌ Could not get location. Pin manually on the map."),
		);
	};

	/* ── Nominatim landmark search ─────────────────────────────── */
	const handleLandmarkSearch = async () => {
		if (!landmarkQuery.trim()) return;
		setSearchLoading(true);
		setLandmarkResults([]);
		try {
			const res  = await fetch(
				`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(landmarkQuery)}&format=json&limit=5`,
				{ headers: { "Accept-Language": "en" } },
			);
			const data = await res.json();
			setLandmarkResults(data);
		} catch {
			setLocationMsg("❌ Landmark search failed. Try pinning on the map.");
		} finally {
			setSearchLoading(false);
		}
	};

	const handleSelectLandmark = (result) => {
		const lat = parseFloat(result.lat);
		const lng = parseFloat(result.lon);
		const map = leafletMap.current;
		if (map && window.L) {
			map.setView([lat, lng], 17);
			placeMarker(window.L, map, lat, lng);
		}
		setLandmarkResults([]);
		setLandmarkQuery("");
		setLocationMsg(`📍 Pinned: ${result.display_name.split(",").slice(0, 3).join(", ")}`);
	};

	/* ── Form helpers ──────────────────────────────────────────── */
	const handleChange = (e) =>
		setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");

		if (form.password !== form.confirmPassword)
			return setError("Passwords do not match.");
		if (form.password.length < 6)
			return setError("Password must be at least 6 characters.");

		setLoading(true);
		try {
			const res = await fetch(`${API_BASE_URL}/customers/signup`, {
				method:  "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					customer_name:       form.customer_name,
					business_name:       form.business_name       || null,
					contact_number:      form.contact_number,
					email:               form.email               || null,
					street_address:      form.street_address      || null,
					city:                form.city                || null,
					gst_number:          form.gst_number          || null,
					food_licence_number: form.food_licence_number || null,
					latitude:            form.latitude            || null,
					longitude:           form.longitude           || null,
					password:            form.password,
				}),
			});
			const data = await res.json();
			if (!res.ok) return setError(data.error || "Signup failed.");

			await login(form.contact_number, form.password);
			navigate("/client");
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	/* ── Render ────────────────────────────────────────────────── */
	return (
		<section className="auth-page">
			<nav className="auth-nav">
				<img
					src="/logo-white.png"
					alt="logo"
					className="nav__logo"
					onClick={() => navigate("/")}
				/>
			</nav>

			<div className="auth-container">
				<div className="auth-card auth-card--wide">
					<h2 className="auth-card__title">Create Account</h2>
					<p className="auth-card__subtitle">Join us for wholesale prices</p>

					{error && <div className="auth-error">{error}</div>}

					<form className="auth-form" onSubmit={handleSubmit}>

						{/* Personal & Business */}
						<p className="auth-form__section-title">Personal &amp; Business Details</p>

						<div className="auth-form__row">
							<div className="auth-form__group">
								<label className="auth-form__label">Full Name *</label>
								<input name="customer_name" type="text" required
									className="auth-form__input" placeholder="Your full name"
									value={form.customer_name} onChange={handleChange} />
							</div>
							<div className="auth-form__group">
								<label className="auth-form__label">Business / Shop Name</label>
								<input name="business_name" type="text"
									className="auth-form__input" placeholder="Shop or business name"
									value={form.business_name} onChange={handleChange} />
							</div>
						</div>

						<div className="auth-form__row">
							<div className="auth-form__group">
								<label className="auth-form__label">Contact Number *</label>
								<input name="contact_number" type="tel" required
									className="auth-form__input" placeholder="Your mobile number"
									value={form.contact_number} onChange={handleChange} />
							</div>
							<div className="auth-form__group">
								<label className="auth-form__label">Email (optional)</label>
								<input name="email" type="email"
									className="auth-form__input" placeholder="Your email"
									value={form.email} onChange={handleChange} />
							</div>
						</div>

						{/* Licences */}
						<p className="auth-form__section-title">Business Licences</p>

						<div className="auth-form__row">
							<div className="auth-form__group">
								<label className="auth-form__label">GST Number</label>
								<input name="gst_number" type="text"
									className="auth-form__input" placeholder="e.g. 27AABCU9603R1ZX"
									value={form.gst_number} onChange={handleChange} />
							</div>
							<div className="auth-form__group">
								<label className="auth-form__label">FSSAI Licence Number</label>
								<input name="food_licence_number" type="text"
									className="auth-form__input" placeholder="Food licence number"
									value={form.food_licence_number} onChange={handleChange} />
							</div>
						</div>

						{/* Address */}
						<p className="auth-form__section-title">Address</p>

						<div className="auth-form__group">
							<label className="auth-form__label">Street Address</label>
							<input name="street_address" type="text"
								className="auth-form__input" placeholder="Shop no., street name"
								value={form.street_address} onChange={handleChange} />
						</div>

						<div className="auth-form__group auth-form__group--half">
							<label className="auth-form__label">City</label>
							<input name="city" type="text"
								className="auth-form__input" placeholder="City"
								value={form.city} onChange={handleChange} />
						</div>

						{/* Map */}
						<p className="auth-form__section-title">
							Shop Location
							<span className="auth-form__section-note"> — pin for delivery routing</span>
						</p>

						<div className="signup-map-wrapper">
							{/* Search bar */}
							<div className="signup-map__search">
								<input
									type="text"
									className="auth-form__input signup-map__search-input"
									placeholder="Search landmark, area or address…"
									value={landmarkQuery}
									onChange={(e) => setLandmarkQuery(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") { e.preventDefault(); handleLandmarkSearch(); }
									}}
								/>
								<button type="button" className="signup-map__search-btn"
									onClick={handleLandmarkSearch} disabled={searchLoading}>
									{searchLoading ? "…" : "Search"}
								</button>
								<button type="button" className="signup-map__gps-btn"
									onClick={handleUseMyLocation}>
									📍 My Location
								</button>
							</div>

							{/* Results dropdown */}
							{landmarkResults.length > 0 && (
								<div className="signup-map__results">
									{landmarkResults.map((r, i) => (
										<div key={i} className="signup-map__result-item"
											onClick={() => handleSelectLandmark(r)}>
											{r.display_name}
										</div>
									))}
								</div>
							)}

							{/* Leaflet canvas */}
							<div ref={mapRef} className="signup-map__canvas" />

							{locationMsg && <p className="signup-map__msg">{locationMsg}</p>}

							{form.latitude && form.longitude && (
								<div className="signup-map__coords">
									<span>Lat: <strong>{form.latitude}</strong></span>
									<span>Lng: <strong>{form.longitude}</strong></span>
								</div>
							)}

							<p className="signup-map__hint">
								Search for your area, use GPS, or click on the map to pin your shop.
								Drag the marker to fine-tune the location.
							</p>
						</div>

						{/* Password */}
						<p className="auth-form__section-title">Set Password</p>

						<div className="auth-form__row">
							<div className="auth-form__group">
								<label className="auth-form__label">Password *</label>
								<input name="password" type="password" required
									className="auth-form__input" placeholder="Min 6 characters"
									value={form.password} onChange={handleChange} />
							</div>
							<div className="auth-form__group">
								<label className="auth-form__label">Confirm Password *</label>
								<input name="confirmPassword" type="password" required
									className="auth-form__input" placeholder="Repeat password"
									value={form.confirmPassword} onChange={handleChange} />
							</div>
						</div>

						<button type="submit" className="auth-form__btn" disabled={loading}>
							{loading ? "Creating account…" : "Create Account"}
						</button>
					</form>

					<div className="auth-card__skip">
					<span className="auth-card__skip-text">Just browsing?</span>
					<button
						type="button"
						className="auth-card__skip-btn"
						onClick={() => navigate("/client")}
					>
						Skip, browse as guest →
					</button>
				</div>

				<p className="auth-card__switch">
						Already have an account?{" "}
						<Link to="/login" className="auth-card__link">Sign in</Link>
					</p>
				</div>
			</div>
		</section>
	);
}
