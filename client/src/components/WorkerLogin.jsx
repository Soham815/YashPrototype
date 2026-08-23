import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkerAuth } from "../context/WorkerAuthContext";
import "../styles/Login.css";

export default function WorkerLogin() {
	const navigate = useNavigate();
	const { workerLogin } = useWorkerAuth();
	const [contactNumber, setContactNumber] = useState("");
	const [password,      setPassword]      = useState("");
	const [error,         setError]         = useState("");
	const [loading,       setLoading]       = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setLoading(true);
		try {
			await workerLogin(contactNumber, password);
			navigate("/worker");
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<section className="auth-page">
			<nav className="auth-nav">
				<img src="/logo-white.png" alt="logo" className="nav__logo"
					onClick={() => navigate("/")} style={{ cursor: "pointer" }} />
			</nav>

			<div className="auth-container">
				<div className="auth-card">
					<div className="auth-card__badge">🚚 Worker Portal</div>
					<h2 className="auth-card__title">Worker Sign In</h2>
					<p className="auth-card__subtitle">Enter your credentials to continue</p>

					{error && <div className="auth-error">{error}</div>}

					<form className="auth-form" onSubmit={handleSubmit}>
						<div className="auth-form__group">
							<label className="auth-form__label">Contact Number</label>
							<input type="tel" className="auth-form__input"
								placeholder="Your registered contact number"
								value={contactNumber}
								onChange={(e) => setContactNumber(e.target.value)} required />
						</div>
						<div className="auth-form__group">
							<label className="auth-form__label">Password</label>
							<input type="password" className="auth-form__input"
								placeholder="Enter your password"
								value={password}
								onChange={(e) => setPassword(e.target.value)} required />
						</div>
						<button type="submit" className="auth-form__btn" disabled={loading}>
							{loading ? "Signing in…" : "Sign In"}
						</button>
					</form>

					<p className="auth-card__switch">
						Contact your admin if you have trouble logging in.
					</p>
				</div>
			</div>
		</section>
	);
}
