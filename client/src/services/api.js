const API_URL = "http://localhost:5000/api";

export const testBackend = async () => {
	const response = await fetch(`${API_URL}/test`);
	const data = await response.json();
	return data;
};
