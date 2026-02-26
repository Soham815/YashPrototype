import { useEffect } from "react";
import {
	BrowserRouter as Router,
	Routes,
	Route,
	useParams,
	useLocation,
} from "react-router-dom";

// Utils
import { preventNumberInputScroll } from "./utils/preventNumberScroll";

// Components
import LandingPage from "./components/LandingPage";
import AdminDashboard from "./components/AdminDashboard";
import Breadcrumb from "./components/Breadcrumb";
import CustomerSignup from "./components/CustomerSignup";

// Company Components
import ViewCompanies from "./components/ViewCompanies";
import AddCompany from "./components/AddCompany";

// Product Components
import ViewProducts from "./components/ViewProducts";
import AddProduct from "./components/AddProduct";
import SearchResults from "./components/SearchResults";
import ProductDetail from "./components/ProductDetail";

// Offer Components
import ViewOffers from "./components/ViewOffers";
import AddOffer from "./components/AddOffer";

// Stock Components
import UpdateStock from "./components/UpdateStock";
import StockHistory from "./components/StockHistory";

// Free Stock Components
import ManageFreeStock from "./components/ManageFreeStock";
import FreeStockHistory from "./components/FreeStockHistory";

// Offer Pool Components
import OfferPoolDashboard from "./components/OfferPoolDashboard";

// External Items Components (NEW)
import ManageExternalItems from "./components/ManageExternalItems";

// Styles
import "./App.css";
import "./styles/style.css";

// Wrapper Components
function CompanyEditWrapper() {
	const { id } = useParams();
	return <AddCompany companyId={parseInt(id)} />;
}

function ProductAddWrapper() {
	const location = useLocation();
	const queryParams = new URLSearchParams(location.search);
	const companyId = queryParams.get("company");

	return (
		<AddProduct preSelectedCompanyId={companyId ? parseInt(companyId) : null} />
	);
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
					{/* Public Routes */}
					<Route path="/" element={<LandingPage />} />
					<Route path="/signup" element={<CustomerSignup />} />
					<Route path="/search" element={<SearchResults />} />
					<Route path="/product/:id" element={<ProductDetail />} />

					{/* Admin Dashboard */}
					<Route path="/admin" element={<AdminDashboard />} />

					{/* Admin - Companies */}
					<Route path="/admin/companies" element={<ViewCompanies />} />
					<Route path="/admin/companies/add" element={<AddCompany />} />
					<Route
						path="/admin/companies/edit/:id"
						element={<CompanyEditWrapper />}
					/>

					{/* Admin - Products */}
					<Route path="/admin/products" element={<ViewProducts />} />
					<Route path="/admin/products/add" element={<ProductAddWrapper />} />
					<Route
						path="/admin/products/edit/:id"
						element={<ProductEditWrapper />}
					/>

					{/* Admin - Offers */}
					<Route path="/admin/offers" element={<ViewOffers />} />
					<Route path="/admin/offers/add" element={<AddOffer />} />

					{/* Admin - Regular Stock Management */}
					<Route path="/admin/stock" element={<UpdateStock />} />
					<Route path="/admin/stock/history" element={<StockHistory />} />

					{/* Admin - Free Stock Management */}
					<Route path="/admin/free-stock" element={<ManageFreeStock />} />
					<Route
						path="/admin/free-stock/history"
						element={<FreeStockHistory />}
					/>

					{/* Admin - Offer Pool */}
					<Route path="/admin/offer-pool" element={<OfferPoolDashboard />} />

					{/* Admin - External Items (NEW) */}
					<Route
						path="/admin/external-items"
						element={<ManageExternalItems />}
					/>
				</Routes>
			</div>
		</Router>
	);
}

export default App;
