import { lazy, Suspense, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import AppShell from "./AppShell";

const Dashboard = lazy(() => import("../pages/Dashboard"));
const Discover = lazy(() => import("../pages/Discover"));
const Calendar = lazy(() => import("../pages/Calendar"));
const Onboarding = lazy(() => import("../pages/Onboarding"));
const Settings = lazy(() => import("../pages/Settings"));

const SECTIONS = {
  dashboard: { label: "My desk", component: Dashboard },
  discover: { label: "Find events", component: Discover },
  calendar: { label: "Deadlines", component: Calendar },
  preferences: { label: "Your field notes", component: Onboarding },
  settings: { label: "Account", component: Settings },
};

export default function Workspace() {
  const [searchParams] = useSearchParams();
  const sectionKey = searchParams.get("section") || "dashboard";
  const section = SECTIONS[sectionKey] || SECTIONS.dashboard;
  const Section = section.component;

  const fallback = useMemo(() => (
    <div className="workspace-loading" role="status">
      <span className="field-label">OPENING YOUR FIELD GUIDE</span>
      <span className="loading-rule" />
    </div>
  ), []);

  return (
    <AppShell activeSection={sectionKey}>
      <Suspense fallback={fallback}>
        <Section />
      </Suspense>
    </AppShell>
  );
}
