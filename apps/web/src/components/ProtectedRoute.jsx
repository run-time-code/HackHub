import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/auth-context";

export default function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="app-loading" role="status">
        <span className="field-label">CHECKING YOUR SESSION</span>
        <span className="field__hint">Opening the field guide…</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth?panel=login" state={{ from: location }} replace />;
  }

  return children;
}