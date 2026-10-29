import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicLayout from "./components/layout/PublicLayout";
import AppShell from "./components/layout/AppShell";
import ScrollManager from "./components/layout/ScrollManager";
import FeedbackWidget from "./components/layout/FeedbackWidget";
import AppProviders from "./providers/AppProviders";
import { useAuth } from "./context/auth-context";

const Landing = lazy(() => import("./pages/Landing"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Dashboard = lazy(() => import("./pages/app/Dashboard"));
const Discover = lazy(() => import("./pages/Discover"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Settings = lazy(() => import("./pages/Settings"));
const Teammates = lazy(() => import("./pages/app/Teammates"));
const Teams = lazy(() => import("./pages/app/Teams"));
const TeamDetail = lazy(() => import("./pages/app/TeamDetail"));
const Requests = lazy(() => import("./pages/app/Requests"));
const Profile = lazy(() => import("./pages/app/Profile"));
const PublicProfile = lazy(() => import("./pages/app/PublicProfile"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Contact = lazy(() => import("./pages/Contact"));
const Privacy = lazy(() => import("./pages/legal/Privacy"));
const Terms = lazy(() => import("./pages/legal/Terms"));
const Cookies = lazy(() => import("./pages/legal/Cookies"));
const Community = lazy(() => import("./pages/legal/Community"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Workspace = lazy(() => import("./components/Workspace"));

function RouteFallback() {
  return (
    <div className="app-loading" role="status">
      <span className="field-label">OPENING HACKHUB</span>
      <span className="field__hint">The field guide is turning to your page.</span>
    </div>
  );
}

function LegacyAuthRedirect({ panel }) {
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  query.set("panel", panel);
  return <Navigate to={`/auth?${query.toString()}`} replace />;
}

// The OAuth callback redirects to /?oauth=... — forward the outcome to the
// login panel so the form can finish the session (or surface the failure).
// Everyone else sees the public landing page.
function HomeRoute() {
  const location = useLocation();
  const outcome = new URLSearchParams(location.search).get("oauth");
  if (outcome) {
    return (
      <Navigate
        to={`/auth?panel=login&oauth=${encodeURIComponent(outcome)}`}
        replace
      />
    );
  }
  return <Landing />;
}

// A public builder card is part of the public guide, but signed-in builders
// should keep the app navigation so they can invite from the card without
// losing their place.
function ProfileLayout() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <RouteFallback />;
  return user ? <AppShell /> : <PublicLayout />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <ScrollManager />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/login" element={<LegacyAuthRedirect panel="login" />} />
            <Route path="/register" element={<LegacyAuthRedirect panel="register" />} />
            <Route path="/forgot-password" element={<LegacyAuthRedirect panel="forgot" />} />
            <Route path="/reset-password" element={<LegacyAuthRedirect panel="reset" />} />
            <Route path="/verify-email" element={<LegacyAuthRedirect panel="verify" />} />

            <Route element={<PublicLayout />}>
              <Route index element={<HomeRoute />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/help" element={<Navigate to="/faq" replace />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/support" element={<Navigate to="/contact" replace />} />
              <Route path="/legal" element={<Navigate to="/legal/privacy" replace />} />
              <Route path="/legal/privacy" element={<Privacy />} />
              <Route path="/legal/terms" element={<Terms />} />
              <Route path="/legal/cookies" element={<Cookies />} />
              <Route path="/legal/community" element={<Community />} />
              <Route path="/community" element={<Navigate to="/legal/community" replace />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            <Route element={<ProfileLayout />}>
              <Route path="/u/:id" element={<PublicProfile />} />
            </Route>

            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />

            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/teammates" element={<Teammates />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/teams/:id" element={<TeamDetail />} />
              <Route path="/requests" element={<Requests />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            <Route
              path="/app/*"
              element={
                <ProtectedRoute>
                  <Workspace />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
        <FeedbackWidget />
      </AppProviders>
    </BrowserRouter>
  );
}
