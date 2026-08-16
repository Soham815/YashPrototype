import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import "../styles/VectoriseProducts.css";

export default function VectoriseProducts() {
	const navigate = useNavigate();

	const [status, setStatus] = useState(null);
	const [statusLoading, setStatusLoading] = useState(true);
	const [running, setRunning] = useState(false);
	const [progress, setProgress] = useState({ done: 0, total: 0, log: [] });
	const [done, setDone] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		fetchStatus();
	}, []);

	const fetchStatus = async () => {
		try {
			setStatusLoading(true);
			const res = await fetch(`${API_BASE_URL}/vectors/status`);
			const data = await res.json();
			if (data.success) setStatus(data.data);
		} catch (e) {
			setError("Could not load status. Is the server running?");
		} finally {
			setStatusLoading(false);
		}
	};

	const handleBatchVectorise = async () => {
		setRunning(true);
		setDone(false);
		setError("");
		setProgress({ done: 0, total: 0, log: [] });

		try {
			const res = await fetch(`${API_BASE_URL}/vectors/batch`, {
				method: "POST",
			});

			if (!res.ok) {
				const errData = await res.json();
				throw new Error(errData.error || "Batch failed");
			}

			// Read streaming NDJSON line by line
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";

			while (true) {
				const { done: streamDone, value } = await reader.read();
				if (streamDone) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop(); // keep incomplete line in buffer

				for (const line of lines) {
					if (!line.trim()) continue;
					try {
						const msg = JSON.parse(line);
						handleStreamMessage(msg);
					} catch (e) {
						console.warn("Could not parse line:", line);
					}
				}
			}
		} catch (e) {
			setError(e.message);
		} finally {
			setRunning(false);
			fetchStatus();
		}
	};

	const handleStreamMessage = (msg) => {
		switch (msg.type) {
			case "start":
				setProgress({ done: 0, total: msg.total, log: [] });
				break;

			case "progress":
				setProgress((prev) => ({
					...prev,
					done: msg.index,
					log: [
						{
							id: msg.productId,
							name: msg.productName,
							status: msg.status,
							message: msg.message,
						},
						...prev.log.slice(0, 49), // keep last 50 entries
					],
				}));
				break;

			case "done":
				setProgress((prev) => ({
					...prev,
					done: msg.total,
					total: msg.total,
					summary: msg.message,
				}));
				setDone(true);
				break;

			case "error":
				setError(msg.message);
				break;

			default:
				break;
		}
	};

	const pct =
		progress.total > 0
			? Math.round((progress.done / progress.total) * 100)
			: 0;

	return (
		<div className="vectorise-page">
			<div className="vp-header">
				<div>
					<h2 className="vp-title">AI Product Vectoriser</h2>
					<p className="vp-subtitle">
						Convert product data into semantic embeddings for AI-powered search
					</p>
				</div>
				<button className="vp-btn-back" onClick={() => navigate("/admin")}>
					← Back
				</button>
			</div>

			{/* Status card */}
			<div className="vp-status-grid">
				<div className="vp-stat-card">
					<span className="vp-stat-label">Total Products</span>
					<span className="vp-stat-value">
						{statusLoading ? "..." : status?.total ?? "—"}
					</span>
				</div>
				<div className="vp-stat-card vp-stat-card--green">
					<span className="vp-stat-label">Vectorised</span>
					<span className="vp-stat-value">
						{statusLoading ? "..." : status?.vectorised ?? "—"}
					</span>
				</div>
				<div className="vp-stat-card vp-stat-card--orange">
					<span className="vp-stat-label">Pending</span>
					<span className="vp-stat-value">
						{statusLoading ? "..." : status?.unvectorised ?? "—"}
					</span>
				</div>
			</div>

			{/* Coverage bar */}
			{status && status.total > 0 && (
				<div className="vp-coverage">
					<div className="vp-coverage__label">
						<span>Coverage</span>
						<span>
							{Math.round((status.vectorised / status.total) * 100)}%
						</span>
					</div>
					<div className="vp-coverage__bar">
						<div
							className="vp-coverage__fill"
							style={{
								width: `${Math.round((status.vectorised / status.total) * 100)}%`,
							}}
						/>
					</div>
				</div>
			)}

			{/* Info box */}
			<div className="vp-info">
				<h3 className="vp-info__title">How this works</h3>
				<p className="vp-info__text">
					Each product is converted into a 384-dimensional vector using the
					<strong> all-MiniLM-L6-v2</strong> model running directly on your
					server — no external API, no cost. These vectors power semantic
					search (finding "spicy condiment" even if no words match) and the
					"You may also need" cart suggestions. Run this once for your existing
					catalog. New products are auto-vectorised when saved.
				</p>
			</div>

			{error && <div className="vp-error">{error}</div>}

			{/* Action button */}
			{!running && !done && (
				<button
					className="vp-btn-start"
					onClick={handleBatchVectorise}
					disabled={statusLoading || status?.unvectorised === 0}
				>
					{status?.unvectorised === 0
						? "✅ All Products Vectorised"
						: `🚀 Vectorise ${status?.unvectorised ?? ""} Pending Products`}
				</button>
			)}

			{/* Live progress */}
			{(running || done) && progress.total > 0 && (
				<div className="vp-progress">
					<div className="vp-progress__header">
						<span className="vp-progress__label">
							{done ? "Complete" : "Vectorising..."}{" "}
							{progress.done}/{progress.total}
						</span>
						<span className="vp-progress__pct">{pct}%</span>
					</div>
					<div className="vp-progress__bar">
						<div
							className="vp-progress__fill"
							style={{ width: `${pct}%` }}
						/>
					</div>

					{done && progress.summary && (
						<p className="vp-progress__summary">{progress.summary}</p>
					)}

					{done && (
						<button
							className="vp-btn-start"
							onClick={() => {
								setDone(false);
								setProgress({ done: 0, total: 0, log: [] });
								fetchStatus();
							}}
						>
							Run Again
						</button>
					)}

					{/* Live log */}
					{progress.log.length > 0 && (
						<div className="vp-log">
							{progress.log.map((entry, i) => (
								<div
									key={`${entry.id}-${i}`}
									className={`vp-log__row ${entry.status === "error" ? "vp-log__row--error" : "vp-log__row--ok"}`}
								>
									<span className="vp-log__icon">
										{entry.status === "ok" ? "✅" : "❌"}
									</span>
									<span className="vp-log__name">{entry.name}</span>
									{entry.message && (
										<span className="vp-log__msg">{entry.message}</span>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
