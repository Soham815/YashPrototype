const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Import routes
const companiesRouter = require("./routes/companies");
const productsRouter = require("./routes/products");
const offersRouter = require("./routes/offers");
const customersRouter = require("./routes/customers");
const stockRouter = require("./routes/stock");

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/companies", companiesRouter);
app.use("/api/products", productsRouter);
app.use("/api/offers", offersRouter);
app.use("/api/customers", customersRouter);
app.use("/api/stock", stockRouter);

// Test route
app.get("/api/test", (req, res) => {
	res.json({ message: "Backend is working!" });
});

app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});
