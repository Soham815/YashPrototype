import { createContext, useContext, useState, useEffect } from "react";
import { API_BASE_URL } from "../config/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
	const [customer,    setCustomer]    = useState(null);
	const [authLoading, setAuthLoading] = useState(true);

	useEffect(() => {
		try {
			const stored = sessionStorage.getItem("customer");
			if (stored) setCustomer(JSON.parse(stored));
		} catch (e) {}
		setAuthLoading(false);
	}, []);

	const login = async (contact_number, password) => {
		const res = await fetch(`${API_BASE_URL}/customers/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ contact_number, password }),
		});
		const data = await res.json();
		if (!res.ok) throw new Error(data.error || "Login failed");
		setCustomer(data.data);
		sessionStorage.setItem("customer", JSON.stringify(data.data));
		return data.data;
	};

	const logout = () => {
		setCustomer(null);
		sessionStorage.removeItem("customer");
	};

	const updateCustomer = (updated) => {
		setCustomer(updated);
		sessionStorage.setItem("customer", JSON.stringify(updated));
	};

	return (
		<AuthContext.Provider value={{ customer, authLoading, login, logout, updateCustomer }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
	return ctx;
}
