// Prevent scroll from changing number inputs globally
export const preventNumberInputScroll = () => {
	// Add event listener when component mounts
	const preventScroll = (e) => {
		// Check if target is a number input
		if (e.target.type === "number" && document.activeElement === e.target) {
			e.preventDefault();
		}
	};

	document.addEventListener("wheel", preventScroll, { passive: false });

	// Return cleanup function
	return () => {
		document.removeEventListener("wheel", preventScroll);
	};
};
