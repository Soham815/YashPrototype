import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Login.css";

export default function Login() {
	const navigate = useNavigate();
	const { login } = useAuth();

	const [contactNumber, setContactNumber] = useState("");
	const [password,      setPassword]      = useState("");
	const [error,         setError]         = useState("");
	const [loading,       setLoading]       = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setLoading(true);
		try {
			await login(contactNumber, password);
			navigate("/client");
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<section className="auth-page">
			<nav className="nav">
				<img
					src="/logo-white.png"
					alt="shop logo"
					className="nav__logo"
					onClick={() => navigate("/")}
					style={{ cursor: "pointer" }}
				/>
			</nav>

			<div className="auth-container">
				<div className="auth-card">
					<h2 className="auth-card__title">Welcome Back</h2>
					<p className="auth-card__subtitle">Sign in to your account</p>

					{error && <div className="auth-error">{error}</div>}

					<form className="auth-form" onSubmit={handleSubmit}>
						<div className="auth-form__group">
							<label className="auth-form__label">Contact Number</label>
							<input
								type="tel"
								className="auth-form__input"
								placeholder="Enter your contact number"
								value={contactNumber}
								onChange={(e) => setContactNumber(e.target.value)}
								required
							/>
						</div>

						<div className="auth-form__group">
							<label className="auth-form__label">Password</label>
							<input
								type="password"
								className="auth-form__input"
								placeholder="Enter your password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
							/>
						</div>

						<button
							type="submit"
							className="auth-form__btn btn"
							disabled={loading}
						>
							{loading ? "Signing in..." : "Sign In"}
						</button>
					</form>

					<p className="auth-card__switch">
						Don't have an account?{" "}
						<Link to="/signup" className="auth-card__link">Create one</Link>
					</p>
				</div>
			</div>
		</section>
	);
}
