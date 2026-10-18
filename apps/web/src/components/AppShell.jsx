import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/auth-context";

const NAV_ITEMS = [
  { key: "dashboard", label: "My desk" },
  { key: "discover", label: "Find events" },
  { key: "calendar", label: "Deadlines" },
  { key: "preferences", label: "Your field notes" },
  { key: "settings", label: "Account" },
];

export default function AppShell({ activeSection, children }) {
  const { user, logout } = useAuth();
  const [, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  function selectSection(section) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("section", section);
      return next;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleLogout() {
    await logout();
    navigate("/auth?panel=login", { replace: true });
  }

  return (
    <div className="workbench">
      <header className="workbench-header">
        <div className="workbench-header-inner">
          <button type="button" onClick={() => selectSection("dashboard")} className="workbench-brand" aria-label="Go to my desk">
            <span className="brand-mark" aria-hidden="true"><span>H</span><i /></span>
            <span>HackHub <small>FIELD GUIDE</small></span>
          </button>
          <nav aria-label="Workspace sections" className="workbench-nav">
            {NAV_ITEMS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                aria-current={activeSection === key ? "page" : undefined}
                onClick={() => selectSection(key)}
                className={`workbench-nav-item ${activeSection === key ? "is-active" : ""}`}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="workbench-account">
            <span className="account-initial" aria-hidden="true">{(user?.name || user?.email || "H").charAt(0).toUpperCase()}</span>
            <span className="workbench-user">{user?.name || user?.email || "Builder"}</span>
            <button type="button" onClick={handleLogout} className="logout-button">Log out</button>
          </div>
        </div>
      </header>
      <main className="workbench-main">
        <div className="workbench-section-marker">
          <span>HACKHUB / STUDENT BUILDERS NETWORK</span>
          <span>{activeSection.replace("-", " ").toUpperCase()}</span>
        </div>
        {children}
        <footer className="workbench-footer">
          <span>MAKE SOMETHING THAT DIDN’T EXIST YESTERDAY.</span>
          <span>HACKHUB FIELD GUIDE · 2026</span>
        </footer>
      </main>
    </div>
  );
}
