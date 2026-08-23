import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import { toTitleCase } from "../utils/textUtils";
import Breadcrumb from "./Breadcrumb";
// import "../styles/AdminWorkers.css";

const ROLES = ["delivery", "packaging", "collections"];

export default function AdminWorkers() {
	const navigate = useNavigate();
	const [workers, setWorkers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [showForm, setShowForm] = useState(false);
	const [editWorker, setEditWorker] = useState(null);
	const [msg, setMsg] = useState("");

	const blankForm = {
		worker_name: "",
		contact_number: "",
		role: "delivery",
		password: "",
	};
	const [form, setForm] = useState(blankForm);

	const fetchWorkers = async () => {
		setLoading(true);
		try {
			const res = await fetch(`${API_BASE_URL}/workers`);
			const data = await res.json();
			if (data.success) setWorkers(data.data);
		} catch (e) {}
		setLoading(false);
	};

	useEffect(() => {
		fetchWorkers();
	}, []);

	const handleChange = (e) =>
		setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

	const handleSubmit = async (e) => {
		e.preventDefault();
		const url = editWorker
			? `${API_BASE_URL}/workers/${editWorker.id}`
			: `${API_BASE_URL}/workers`;
		const method = editWorker ? "PUT" : "POST";
		try {
			const res = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(form),
			});
			const data = await res.json();
			if (!data.success) {
				setMsg(`❌ ${data.error}`);
				return;
			}
			setMsg(editWorker ? "✅ Worker updated" : "✅ Worker created");
			setShowForm(false);
			setEditWorker(null);
			setForm(blankForm);
			fetchWorkers();
		} catch (e) {
			setMsg("❌ Network error");
		}
		setTimeout(() => setMsg(""), 3000);
	};

	const handleToggleActive = async (worker) => {
		try {
			await fetch(`${API_BASE_URL}/workers/${worker.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ is_active: !worker.is_active }),
			});
			fetchWorkers();
		} catch (e) {}
	};

	const openEdit = (worker) => {
		setEditWorker(worker);
		setForm({
			worker_name: worker.worker_name,
			contact_number: worker.contact_number,
			role: worker.role,
			password: "",
		});
		setShowForm(true);
	};

	return (
		<section className="admin-workers">
			<Breadcrumb
				items={[{ label: "Admin", href: "/admin" }, { label: "Workers" }]}
			/>

			<div className="admin-workers__header">
				<div>
					<h1 className="admin-workers__title">Workers</h1>
					<p className="admin-workers__subtitle">
						{workers.length} registered worker{workers.length !== 1 ? "s" : ""}
					</p>
				</div>
				<div className="admin-workers__actions">
					<button
						className="admin-workers__assign-btn"
						onClick={() => navigate("/admin/deliveries")}
					>
						Manage Deliveries
					</button>
					<button
						className="admin-workers__add-btn"
						onClick={() => {
							setShowForm(true);
							setEditWorker(null);
							setForm(blankForm);
						}}
					>
						+ Add Worker
					</button>
				</div>
			</div>

			{msg && <div className="admin-workers__msg">{msg}</div>}

			{/* Add / Edit Form */}
			{showForm && (
				<div className="admin-workers__form-wrap">
					<div className="admin-workers__form-card">
						<h3 className="admin-workers__form-title">
							{editWorker ? "Edit Worker" : "Add New Worker"}
						</h3>
						<form className="admin-workers__form" onSubmit={handleSubmit}>
							<div className="aw-form__row">
								<div className="aw-form__group">
									<label>Full Name *</label>
									<input
										name="worker_name"
										value={form.worker_name}
										onChange={handleChange}
										placeholder="Worker name"
										required
									/>
								</div>
								<div className="aw-form__group">
									<label>Contact Number *</label>
									<input
										name="contact_number"
										value={form.contact_number}
										onChange={handleChange}
										placeholder="Mobile number"
										required
									/>
								</div>
							</div>
							<div className="aw-form__row">
								<div className="aw-form__group">
									<label>Role</label>
									<select name="role" value={form.role} onChange={handleChange}>
										{ROLES.map((r) => (
											<option key={r} value={r}>
												{toTitleCase(r)}
											</option>
										))}
									</select>
								</div>
								<div className="aw-form__group">
									<label>
										{editWorker
											? "New Password (leave blank to keep)"
											: "Password *"}
									</label>
									<input
										type="password"
										name="password"
										value={form.password}
										onChange={handleChange}
										placeholder="Set password"
										required={!editWorker}
									/>
								</div>
							</div>
							<div className="aw-form__btns">
								<button type="submit" className="aw-form__submit">
									{editWorker ? "Save Changes" : "Create Worker"}
								</button>
								<button
									type="button"
									className="aw-form__cancel"
									onClick={() => {
										setShowForm(false);
										setEditWorker(null);
									}}
								>
									Cancel
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Workers list */}
			{loading ? (
				<div className="admin-workers__loading">Loading…</div>
			) : workers.length === 0 ? (
				<div className="admin-workers__empty">
					No workers yet. Add your first worker above.
				</div>
			) : (
				<div className="admin-workers__grid">
					{workers.map((w) => (
						<div
							key={w.id}
							className={`aw-card${!w.is_active ? " aw-card--inactive" : ""}`}
						>
							<div className="aw-card__top">
								<div className="aw-card__avatar">
									{w.worker_name?.charAt(0).toUpperCase()}
								</div>
								<div>
									<div className="aw-card__name">
										{toTitleCase(w.worker_name)}
									</div>
									<div className="aw-card__role">{w.role}</div>
								</div>
								<span
									className={`aw-card__badge ${w.is_active ? "aw-card__badge--active" : "aw-card__badge--inactive"}`}
								>
									{w.is_active ? "Active" : "Inactive"}
								</span>
							</div>
							<div className="aw-card__info">
								<span>📞 {w.contact_number}</span>
								<span>
									Joined {new Date(w.created_at).toLocaleDateString()}
								</span>
							</div>
							<div className="aw-card__actions">
								<button
									className="aw-card__edit-btn"
									onClick={() => openEdit(w)}
								>
									Edit
								</button>
								<button
									className={`aw-card__toggle-btn ${w.is_active ? "aw-card__toggle-btn--deactivate" : "aw-card__toggle-btn--activate"}`}
									onClick={() => handleToggleActive(w)}
								>
									{w.is_active ? "Deactivate" : "Activate"}
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</section>
	);
}
