// API Base URL - switches automatically based on environment
export const API_BASE_URL =
	import.meta.env.VITE_API_URL || "http://localhost:5000/api";

console.log("🌐 API URL:", API_BASE_URL);
