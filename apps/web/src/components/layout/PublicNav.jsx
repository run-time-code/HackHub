import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import Brand from "./Brand";
import ThemeToggle from "./ThemeToggle";
import MobileMenu from "./MobileMenu";
import IconButton from "../ui/IconButton";
import Button from "../ui/Button";
import { useAuth } from "../../context/auth-context";

const LINKS = [
  { label: "Discover", to: "/#find" },
  { label: "How it works", to: "/#how" },
  { label: "Builders", to: "/#builders" },
  { label: "FAQ", to: "/faq" },
];

export default function PublicNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleSignOut() {
    setMenuOpen(false);
    await logout();
    navigate("/auth?panel=login", { replace: true });
  }

  return (
    <header className={`public-nav ${scrolled ? "is-scrolled" : ""}`}>
      <div className="container public-nav__inner">
        <Brand />

        <nav className="public-nav__links" aria-label="Primary">
          {LINKS.map((link) => (
            <Link key={link.label} to={link.to} className="public-nav__link">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="public-nav__actions">
          <ThemeToggle />
          {user ? (
            <>
              <Button to="/dashboard" variant="secondary" size="sm">
                Dashboard
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button to="/auth?panel=login" variant="ghost" size="sm">
                Sign in
              </Button>
              <Button to="/auth?panel=register" variant="primary" size="sm" className="public-nav__cta">
                Start building — free
              </Button>
            </>
          )}
          <IconButton
            label="Open menu"
            className="public-nav__menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu />
          </IconButton>
        </div>
      </div>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={LINKS}
        eyebrow="Season 01 · The builder network"
        footLinks={[
          { label: "FAQ", to: "/faq" },
          { label: "Contact", to: "/contact" },
          { label: "Privacy", to: "/legal/privacy" },
        ]}
        user={user}
        onSignIn
        onSignOut={handleSignOut}
      />
    </header>
  );
}
