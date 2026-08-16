import { createContext, useContext, useState } from "react";

const CartContext = createContext(null);

/**
 * Convert customer-selected quantity+unit to PIECES.
 * Stock is always stored in pieces.
 *
 * @param {number} quantity   - what customer entered
 * @param {string} unit       - "pieces" | "kilos" | "box/bag"
 * @param {object} product    - needs weight (g/piece) and items_per_box
 * @returns {number}          - pieces, always rounded UP (Math.ceil)
 */
export function convertToPieces(quantity, unit, product) {
	const qty = Number(quantity);
	if (!qty || qty <= 0) return 0;

	switch (unit) {
		case "pieces":
			return Math.ceil(qty);

		case "kilos": {
			// weight is grams per piece
			const weightPerPiece = Number(product.weight);
			if (!weightPerPiece || weightPerPiece <= 0) return Math.ceil(qty);
			// qty kg → grams → divide by grams per piece
			const raw = (qty * 1000) / weightPerPiece;
			return Math.ceil(raw);
		}

		case "box/bag": {
			const itemsPerBox = Number(product.items_per_box);
			if (!itemsPerBox || itemsPerBox <= 0) return Math.ceil(qty);
			return Math.ceil(qty * itemsPerBox);
		}

		default:
			return Math.ceil(qty);
	}
}

export function CartProvider({ children }) {
	const [cartItems, setCartItems] = useState([]);

	const addToCart = (product, quantity, unit) => {
		const pieces = convertToPieces(quantity, unit, product);
		if (pieces <= 0) return;

		setCartItems((prev) => {
			// Match by product id + unit so same product in different
			// units stays as separate line items
			const existing = prev.find(
				(i) => i.product.id === product.id && i.unit === unit,
			);
			if (existing) {
				return prev.map((i) =>
					i.product.id === product.id && i.unit === unit
						? {
								...i,
								quantity: Number(i.quantity) + Number(quantity),
								pieces: i.pieces + pieces,
							}
						: i,
				);
			}
			return [
				...prev,
				{
					product,
					quantity: Number(quantity), // display quantity (what customer typed)
					unit,                        // display unit
					pieces,                      // actual pieces for billing
				},
			];
		});
	};

	const removeFromCart = (productId, unit) => {
		setCartItems((prev) =>
			prev.filter((i) => !(i.product.id === productId && i.unit === unit)),
		);
	};

	const updateQuantity = (productId, unit, newQty) => {
		if (newQty <= 0) {
			removeFromCart(productId, unit);
			return;
		}
		setCartItems((prev) =>
			prev.map((i) => {
				if (i.product.id === productId && i.unit === unit) {
					const pieces = convertToPieces(newQty, unit, i.product);
					return { ...i, quantity: Number(newQty), pieces };
				}
				return i;
			}),
		);
	};

	const clearCart = () => setCartItems([]);

	// Total display units shown to customer
	const totalItems = cartItems.reduce((sum, i) => sum + i.pieces, 0);

	// Bill calculated on selling_price × pieces
	const totalAmount = cartItems.reduce(
		(sum, i) => sum + i.product.selling_price * i.pieces,
		0,
	);

	const totalMrp = cartItems.reduce(
		(sum, i) => sum + i.product.mrp * i.pieces,
		0,
	);

	return (
		<CartContext.Provider
			value={{
				cartItems,
				addToCart,
				removeFromCart,
				updateQuantity,
				clearCart,
				totalItems,
				totalAmount,
				totalMrp,
			}}
		>
			{children}
		</CartContext.Provider>
	);
}

export function useCart() {
	const ctx = useContext(CartContext);
	if (!ctx) throw new Error("useCart must be used inside CartProvider");
	return ctx;
}
