import { Outlet } from "react-router-dom";
import PublicNav from "./PublicNav";
import Footer from "./Footer";

export default function PublicLayout() {
  return (
    <div className="public-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <PublicNav />
      <main id="main-content" tabIndex="-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
