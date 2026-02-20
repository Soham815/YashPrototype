import { Link, useLocation } from "react-router-dom";
import "../styles/Breadcrumb.css";

function Breadcrumb() {
	const location = useLocation();
	const pathnames = location.pathname.split("/").filter((x) => x);

	// Don't show breadcrumb on landing page
	if (location.pathname === "/") {
		return null;
	}

	// Create breadcrumb items
	const breadcrumbItems = [{ name: "Home", path: "/" }];

	let currentPath = "";
	pathnames.forEach((segment, index) => {
		currentPath += `/${segment}`;

		// Format segment name
		let name = segment
			.split("-")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");

		// Handle special cases
		if (segment === "admin") {
			name = "Admin Dashboard";
		} else if (segment === "companies") {
			name = "Companies";
		} else if (segment === "products") {
			name = "Products";
		} else if (segment === "offers") {
			name = "Offers";
		} else if (segment === "add") {
			const parentSegment = pathnames[index - 1];
			name = `Add ${parentSegment.charAt(0).toUpperCase() + parentSegment.slice(1, -1)}`;
		} else if (segment === "edit") {
			const parentSegment = pathnames[index - 1];
			name = `Edit ${parentSegment.charAt(0).toUpperCase() + parentSegment.slice(1, -1)}`;
		}

		breadcrumbItems.push({ name, path: currentPath });
	});

	return (
		<div className="breadcrumb-container">
			<nav className="breadcrumb">
				{breadcrumbItems.map((item, index) => (
					<span key={item.path} className="breadcrumb-item">
						{index < breadcrumbItems.length - 1 ? (
							<>
								<Link to={item.path} className="breadcrumb-link">
									{item.name}
								</Link>
								<span className="breadcrumb-separator">›</span>
							</>
						) : (
							<span className="breadcrumb-current">{item.name}</span>
						)}
					</span>
				))}
			</nav>
		</div>
	);
}

export default Breadcrumb;
