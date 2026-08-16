/**
 * textUtils.js
 * Shared text formatting utilities used across the entire frontend.
 * Import from anywhere: import { toTitleCase } from "../utils/textUtils";
 */

/**
 * Convert a string to Title Case.
 * "suruchi classic haldi" → "Suruchi Classic Haldi"
 * Handles null/undefined safely.
 *
 * @param {string} str
 * @returns {string}
 */
export function toTitleCase(str) {
	if (!str) return "";
	return str
		.toLowerCase()
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}
