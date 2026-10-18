import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

const AuthPage = lazy(() => import("./pages/AuthPage"));
const Workspace = lazy(() => import("./components/Workspace"));

function LegacyAuthRedirect({ panel }) {
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  query.set("panel", panel);
  return <Navigate to={`/auth?${query.toString()}`} replace />;
}

function LegacyWorkspaceRedirect({ section }) {
  return <Navigate to={`/app?section=${section}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<div className="app-loading" role="status"><span className="field-label">OPENING HACKHUB</span></div>}>
          <Routes>
            <Route path="/" element={<LegacyWorkspaceRedirect section="dashboard" />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/login" element={<LegacyAuthRedirect panel="login" />} />
            <Route path="/register" element={<LegacyAuthRedirect panel="register" />} />
            <Route path="/forgot-password" element={<LegacyAuthRedirect panel="forgot" />} />
            <Route path="/reset-password" element={<LegacyAuthRedirect panel="reset" />} />
            <Route path="/verify-email" element={<LegacyAuthRedirect panel="verify" />} />
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <Workspace />
                </ProtectedRoute>
              }
            />
            <Route path="/dashboard" element={<LegacyWorkspaceRedirect section="dashboard" />} />
            <Route path="/discover" element={<LegacyWorkspaceRedirect section="discover" />} />
            <Route path="/calendar" element={<LegacyWorkspaceRedirect section="calendar" />} />
            <Route path="/onboarding" element={<LegacyWorkspaceRedirect section="preferences" />} />
            <Route path="/settings" element={<LegacyWorkspaceRedirect section="settings" />} />
            <Route path="*" element={<LegacyWorkspaceRedirect section="dashboard" />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}