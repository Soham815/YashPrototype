import { useEffect } from "react";
import {
	BrowserRouter as Router, Routes, Route,
	useParams, useLocation, Navigate,
} from "react-router-dom";

import { preventNumberInputScroll } from "./utils/preventNumberScroll";
import { useAuth } from "./context/AuthContext";

import RootLanding         from "./components/RootLanding";
import LandingPage         from "./components/LandingPage";
import WorkerLogin         from "./components/WorkerLogin";
import WorkerPortal        from "./components/WorkerPortal";
import AdminWorkers        from "./components/AdminWorkers";
import AdminDeliveries     from "./components/AdminDeliveries";
import AdminDashboard      from "./components/AdminDashboard";
import Breadcrumb          from "./components/Breadcrumb";
import CustomerSignup      from "./components/CustomerSignup";
import Login               from "./components/Login";
import ViewCompanies       from "./components/ViewCompanies";
import AddCompany          from "./components/AddCompany";
import ViewProducts        from "./components/ViewProducts";
import AddProduct          from "./components/AddProduct";
import SearchResults       from "./components/SearchResults";
import ProductDetail       from "./components/ProductDetail";
import Cart                from "./components/Cart";
import ViewOffers          from "./components/ViewOffers";
import AddOffer            from "./components/AddOffer";
import UpdateStock         from "./components/UpdateStock";
import StockHistory        from "./components/StockHistory";
import ManageFreeStock     from "./components/ManageFreeStock";
import FreeStockHistory    from "./components/FreeStockHistory";
import OfferPoolDashboard  from "./components/OfferPoolDashboard";
import ManageExternalItems from "./components/ManageExternalItems";
import ManageCategories    from "./components/ManageCategories";
import VectoriseProducts   from "./components/VectoriseProducts";
import OrderConfirmation   from "./components/OrderConfirmation";
import CustomerOrders      from "./components/CustomerOrders";
import CustomerFinance     from "./components/CustomerFinance";
import AdminFinance        from "./components/AdminFinance";
import CustomerPreorders   from "./components/CustomerPreorders";
import AdminPreorders      from "./components/AdminPreorders";
import AdminOrders         from "./components/AdminOrders";

import "./App.css";
import "./styles/style.css";

// Guard — redirects to /login if not logged in
function RequireAuth({ children }) {
	const { customer, authLoading } = useAuth();
	if (authLoading) return null;
	if (!customer) return <Navigate to="/login" replace />;
	return children;
}

function CompanyEditWrapper()  { const { id } = useParams(); return <AddCompany companyId={parseInt(id)} />; }
function ProductEditWrapper()  { const { id } = useParams(); return <AddProduct productId={parseInt(id)} />; }
function ProductAddWrapper()   {
	const location = useLocation();
	const companyId = new URLSearchParams(location.search).get("company");
	return <AddProduct preSelectedCompanyId={companyId ? parseInt(companyId) : null} />;
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
					<Route path="/"            element={<RootLanding />} />
					<Route path="/client"         element={<LandingPage />} />
					<Route path="/login"       element={<Login />} />
					<Route path="/signup"      element={<CustomerSignup />} />
					<Route path="/search"      element={<SearchResults />} />
					<Route path="/product/:id" element={<ProductDetail />} />

					{/* Protected customer routes */}
					<Route path="/cart"   element={<RequireAuth><Cart /></RequireAuth>} />
					<Route path="/orders"  element={<RequireAuth><CustomerOrders /></RequireAuth>} />
					<Route path="/finance"    element={<RequireAuth><CustomerFinance /></RequireAuth>} />
					<Route path="/preorders" element={<RequireAuth><CustomerPreorders /></RequireAuth>} />
					<Route path="/order-confirmation" element={<RequireAuth><OrderConfirmation /></RequireAuth>} />

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
					<Route path="/admin/orders"             element={<AdminOrders />} />
					<Route path="/admin/finance"            element={<AdminFinance />} />
					<Route path="/admin/preorders"          element={<AdminPreorders />} />
				  <Route path="/worker/login"       element={<WorkerLogin />} />
					<Route path="/worker"              element={<WorkerPortal />} />
					<Route path="/admin/workers"       element={<AdminWorkers />} />
					<Route path="/admin/deliveries"    element={<AdminDeliveries />} />
				</Routes>
			</div>
		</Router>
	);
}

export default App;
