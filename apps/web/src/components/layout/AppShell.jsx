import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  CalendarClock,
  Compass,
  Inbox,
  LayoutDashboard,
  Menu,
  Search,
  UserRound,
  Users,
  UsersRound,
} from "lucide-react";
import Brand from "./Brand";
import ThemeToggle from "./ThemeToggle";
import MobileMenu from "./MobileMenu";
import CommandPalette from "./CommandPalette";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";
import PageTransition from "./PageTransition";
import IconButton from "../ui/IconButton";
import { useAuth } from "../../context/auth-context";
import { DEMO_MODE } from "../../lib/demo";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, key: "dashboard" },
  { label: "Discover", to: "/discover", icon: Compass, key: "discover" },
  { label: "Calendar", to: "/calendar", icon: CalendarClock, key: "calendar" },
  { label: "Teammates", to: "/teammates", icon: Users, key: "teammates" },
  { label: "Teams", to: "/teams", icon: UsersRound, key: "teams" },
  { label: "Requests", to: "/requests", icon: Inbox, key: "requests" },
  { label: "Profile", to: "/profile", icon: UserRound, key: "profile" },
];

const PAGE_META = {
  dashboard: { label: "The desk", index: "01" },
  discover: { label: "Open calls", index: "02" },
  calendar: { label: "Deadline map", index: "03" },
  teammates: { label: "Teammate finder", index: "04" },
  teams: { label: "Team hub", index: "05" },
  requests: { label: "The wire", index: "06" },
  profile: { label: "Builder card", index: "07" },
  settings: { label: "Account", index: "08" },
  "public-profile": { label: "Builder card", index: "07" },
};

function metaForPath(pathname) {
  if (pathname.startsWith("/discover")) return PAGE_META.discover;
  if (pathname.startsWith("/calendar")) return PAGE_META.calendar;
  if (pathname.startsWith("/teammates")) return PAGE_META.teammates;
  if (pathname.startsWith("/teams")) return PAGE_META.teams;
  if (pathname.startsWith("/requests")) return PAGE_META.requests;
  if (pathname.startsWith("/settings")) return PAGE_META.settings;
  if (pathname.startsWith("/profile")) return PAGE_META.profile;
  if (pathname.startsWith("/u/")) return PAGE_META["public-profile"];
  return PAGE_META.dashboard;
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const menuTriggerRef = useRef(null);

  const meta = useMemo(() => metaForPath(location.pathname), [location.pathname]);

  useEffect(() => {
    function onKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function handleSignOut() {
    setMenuOpen(false);
    await logout();
    navigate("/auth?panel=login", { replace: true });
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className={clsx("app-nav", "shell__part shell__part--nav")}>
        <div className="container app-nav__inner">
          <Brand to="/dashboard" className="app-nav__brand" />

          <nav className="app-nav__links" aria-label="Primary">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `app-nav__link ${isActive ? "is-active" : ""}`}
                >
                  <Icon aria-hidden="true" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="app-nav__utilities">
            <button
              type="button"
              className="command-trigger"
              onClick={() => setCommandOpen(true)}
              aria-label="Open command palette"
            >
              <Search aria-hidden="true" />
              <span>Jump to</span>
              <kbd className="kbd">⌘K</kbd>
            </button>
            <ThemeToggle compact />
            <NotificationBell />
            <UserMenu />
            <IconButton
              ref={menuTriggerRef}
              label="Open menu"
              className="app-nav__mobile-trigger"
              onClick={() => setMenuOpen(true)}
            >
              <Menu />
            </IconButton>
          </div>
        </div>
      </header>

      <main className={clsx("app-main", "shell__part shell__part--content")} id="main-content" tabIndex="-1">
        <div className="container app-main__inner">
          <div className={clsx("app-context-bar", "shell__part shell__part--context")}>
            <span>
              Field guide / {meta.index} — {meta.label}
            </span>
            <div className="app-context-bar__right">
              <span className="app-context-bar__status">
                {DEMO_MODE ? "Demo data · resets on reload" : "Season 01 · Open"}
              </span>
              <span className="hide-sm">Signed in as {user?.name || "builder"}</span>
            </div>
          </div>

          <div className="app-content">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </div>
      </main>

      {/* WA3 design-elevation: shell entrance + route transitions active */}
      <footer className="app-footer">
        <div className="container app-footer__inner">
          <span className="app-footer__mark">HackHub · The builder&apos;s field guide</span>
          <span className="app-footer__note">
            Built for the ones who start before they are ready.
          </span>
          <div className="app-footer__links">
            <NavLink to="/faq">Help</NavLink>
            <NavLink to="/legal/privacy">Privacy</NavLink>
            <a href="https://github.com/run-time-code/HackHub" target="_blank" rel="noreferrer">
              GitHub <ArrowUpRight aria-hidden="true" />
            </a>
          </div>
        </div>
      </footer>

      <nav className="mobile-dock" aria-label="Mobile navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `mobile-dock__item ${isActive ? "is-active" : ""}`}
            >
              <Icon aria-hidden="true" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        triggerRef={menuTriggerRef}
        items={NAV_ITEMS}
        eyebrow={`Field guide / ${meta.index} · ${meta.label}`}
        footLinks={[
          { label: "Help & FAQ", to: "/faq" },
          { label: "Contact", to: "/contact" },
          { label: "Privacy", to: "/legal/privacy" },
        ]}
        user={user}
        onSignOut={handleSignOut}
      />

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
