const express = require("express");
const cors    = require("cors");
require("dotenv").config();

const app  = express();
const PORT = process.env.PORT || 5000;

const companiesRouter     = require("./routes/companies");
const productsRouter      = require("./routes/products");
const offersRouter        = require("./routes/offers");
const customersRouter     = require("./routes/customers");
const stockRouter         = require("./routes/stock");
const freeStockRouter     = require("./routes/freeStock");
const offerPoolRouter     = require("./routes/offerPool");
const externalItemsRouter = require("./routes/externalItems");
const categoriesRouter    = require("./routes/categories");
const vectorsRouter       = require("./routes/vectors");
const ordersRouter        = require("./routes/orders");
const { router: preordersRouter } = require("./routes/preorders");
const financeRouter       = require('./routes/finance');
const workersRouter       = require('./routes/workers');
const deliveriesRouter    = require('./routes/deliveries');

app.use(cors({
	origin: [
		"http://localhost:5173",
		"http://localhost:5174",
		"https://simplywebdev.io",
		"https://www.simplywebdev.io",
		"http://simplywebdev.io",
		"http://www.simplywebdev.io",
	],
	credentials: true,
	methods: ["GET","POST","PUT","DELETE","OPTIONS"],
}));

app.use(express.json());

app.use("/api/companies",      companiesRouter);
app.use("/api/products",       productsRouter);
app.use("/api/offers",         offersRouter);
app.use("/api/customers",      customersRouter);
app.use("/api/stock",          stockRouter);
app.use("/api/free-stock",     freeStockRouter);
app.use("/api/offer-pool",     offerPoolRouter);
app.use("/api/external-items", externalItemsRouter);
app.use("/api/categories",     categoriesRouter);
app.use("/api/vectors",        vectorsRouter);
app.use("/api/orders",         ordersRouter);
app.use("/api/preorders",      preordersRouter);
app.use('/api/finance',        financeRouter);
app.use('/api/workers',       workersRouter);
app.use('/api/deliveries',    deliveriesRouter);

app.get("/api/test", (req, res) => res.json({ message: "Backend is working!" }));
app.get("/health",   (req, res) => res.json({ status: "OK", timestamp: new Date().toISOString() }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
