import { useEffect } from "react";
import {
	BrowserRouter as Router,
	Routes,
	Route,
	useParams,
	useLocation,
} from "react-router-dom";
import LandingPage from "./components/LandingPage";
import AdminDashboard from "./components/AdminDashboard";
import ViewCompanies from "./components/ViewCompanies";
import AddCompany from "./components/AddCompany";
import ViewProducts from "./components/ViewProducts";
import AddProduct from "./components/AddProduct";
import ViewOffers from "./components/ViewOffers";
import AddOffer from "./components/AddOffer";
import Breadcrumb from "./components/Breadcrumb";
import CustomerSignup from "./components/CustomerSignup";
import SearchResults from "./components/SearchResults";
import ProductDetail from "./components/ProductDetail";
import UpdateStock from "./components/UpdateStock";
import { preventNumberInputScroll } from "./utils/preventNumberScroll";

import "./App.css";
import "./styles/style.css";

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
					{/* Landing Page */}
					<Route path="/" element={<LandingPage />} />

					{/* Admin Dashboard */}
					<Route path="/admin" element={<AdminDashboard />} />

					{/* Companies Routes */}
					<Route path="/admin/companies" element={<ViewCompanies />} />
					<Route path="/admin/companies/add" element={<AddCompany />} />
					<Route
						path="/admin/companies/edit/:id"
						element={<CompanyEditWrapper />}
					/>

					{/* Products Routes */}
					<Route path="/admin/products" element={<ViewProducts />} />
					<Route path="/admin/products/add" element={<ProductAddWrapper />} />
					<Route
						path="/admin/products/edit/:id"
						element={<ProductEditWrapper />}
					/>

					{/* Offers Routes */}
					<Route path="/admin/offers" element={<ViewOffers />} />
					<Route path="/admin/offers/add" element={<AddOffer />} />

					<Route path="/signup" element={<CustomerSignup />} />
					<Route path="/search" element={<SearchResults />} />
					<Route path="/product/:id" element={<ProductDetail />} />

					<Route path="/admin/stock" element={<UpdateStock />} />
				</Routes>
			</div>
		</Router>
	);
}

// Wrapper components to handle route params and query params
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

export default App;
