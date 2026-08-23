import { createContext, useContext, useState, useEffect } from "react";
import { API_BASE_URL } from "../config/api";

const WorkerAuthContext = createContext(null);

export function WorkerAuthProvider({ children }) {
	const [worker,      setWorker]      = useState(null);
	const [workerLoading, setWorkerLoading] = useState(true);

	useEffect(() => {
		try {
			const stored = sessionStorage.getItem("worker");
			if (stored) setWorker(JSON.parse(stored));
		} catch (e) {}
		setWorkerLoading(false);
	}, []);

	const workerLogin = async (contact_number, password) => {
		const res  = await fetch(`${API_BASE_URL}/workers/login`, {
			method:  "POST",
			headers: { "Content-Type": "application/json" },
			body:    JSON.stringify({ contact_number, password }),
		});
		const data = await res.json();
		if (!res.ok) throw new Error(data.error || "Login failed");
		setWorker(data.data);
		sessionStorage.setItem("worker", JSON.stringify(data.data));
		return data.data;
	};

	const workerLogout = () => {
		setWorker(null);
		sessionStorage.removeItem("worker");
	};

	return (
		<WorkerAuthContext.Provider value={{ worker, workerLoading, workerLogin, workerLogout }}>
			{children}
		</WorkerAuthContext.Provider>
	);
}

export function useWorkerAuth() {
	const ctx = useContext(WorkerAuthContext);
	if (!ctx) throw new Error("useWorkerAuth must be used inside WorkerAuthProvider");
	return ctx;
}
