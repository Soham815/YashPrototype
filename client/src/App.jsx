import { useEffect } from "react";
import {
	BrowserRouter as Router,
	Routes,
	Route,
	useParams,
	useLocation,
} from "react-router-dom";

import { preventNumberInputScroll } from "./utils/preventNumberScroll";

import LandingPage        from "./components/LandingPage";
import AdminDashboard     from "./components/AdminDashboard";
import Breadcrumb         from "./components/Breadcrumb";
import CustomerSignup     from "./components/CustomerSignup";
import ViewCompanies      from "./components/ViewCompanies";
import AddCompany         from "./components/AddCompany";
import ViewProducts       from "./components/ViewProducts";
import AddProduct         from "./components/AddProduct";
import SearchResults      from "./components/SearchResults";
import ProductDetail      from "./components/ProductDetail";
import Cart               from "./components/Cart";
import ViewOffers         from "./components/ViewOffers";
import AddOffer           from "./components/AddOffer";
import UpdateStock        from "./components/UpdateStock";
import StockHistory       from "./components/StockHistory";
import ManageFreeStock    from "./components/ManageFreeStock";
import FreeStockHistory   from "./components/FreeStockHistory";
import OfferPoolDashboard from "./components/OfferPoolDashboard";
import ManageExternalItems from "./components/ManageExternalItems";
import ManageCategories   from "./components/ManageCategories";
import VectoriseProducts  from "./components/VectoriseProducts";

import "./App.css";
import "./styles/style.css";

function CompanyEditWrapper() {
	const { id } = useParams();
	return <AddCompany companyId={parseInt(id)} />;
}

function ProductAddWrapper() {
	const location = useLocation();
	const queryParams = new URLSearchParams(location.search);
	const companyId = queryParams.get("company");
	return <AddProduct preSelectedCompanyId={companyId ? parseInt(companyId) : null} />;
}

function ProductEditWrapper() {
	const { id } = useParams();
	return <AddProduct productId={parseInt(id)} />;
}

function App() {
	useEffect(() => {
		const cleanup = preventNumberInputScroll();
		return cleanup;
	}, []);

	return (
		<Router>
			<div className="app-container">
				<Breadcrumb />
				<Routes>
					{/* Public */}
					<Route path="/"             element={<LandingPage />} />
					<Route path="/signup"       element={<CustomerSignup />} />
					<Route path="/search"       element={<SearchResults />} />
					<Route path="/product/:id"  element={<ProductDetail />} />
					<Route path="/cart"         element={<Cart />} />

					{/* Admin */}
					<Route path="/admin"                    element={<AdminDashboard />} />
					<Route path="/admin/companies"          element={<ViewCompanies />} />
					<Route path="/admin/companies/add"      element={<AddCompany />} />
					<Route path="/admin/companies/edit/:id" element={<CompanyEditWrapper />} />
					<Route path="/admin/products"           element={<ViewProducts />} />
					<Route path="/admin/products/add"       element={<ProductAddWrapper />} />
					<Route path="/admin/products/edit/:id"  element={<ProductEditWrapper />} />
					<Route path="/admin/offers"             element={<ViewOffers />} />
					<Route path="/admin/offers/add"         element={<AddOffer />} />
					<Route path="/admin/stock"              element={<UpdateStock />} />
					<Route path="/admin/stock/history"      element={<StockHistory />} />
					<Route path="/admin/free-stock"         element={<ManageFreeStock />} />
					<Route path="/admin/free-stock/history" element={<FreeStockHistory />} />
					<Route path="/admin/offer-pool"         element={<OfferPoolDashboard />} />
					<Route path="/admin/external-items"     element={<ManageExternalItems />} />
					<Route path="/admin/categories"         element={<ManageCategories />} />
					<Route path="/admin/vectorise"          element={<VectoriseProducts />} />
				</Routes>
			</div>
		</Router>
	);
}

export default App;
