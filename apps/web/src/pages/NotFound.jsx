import { Link } from "react-router-dom";
import { ArrowLeft, Compass, DoorOpen, Search, UsersRound } from "lucide-react";
import Button from "../components/ui/Button";
import { useAuth } from "../context/auth-context";
import { useDocumentTitle } from "../lib/hooks/useDocumentTitle";

export default function NotFound() {
  useDocumentTitle("Page not found");
  const { user } = useAuth();

  return (
    <div className="not-found">
      <div className="container not-found__inner">
        <span className="eyebrow eyebrow--muted">A page that never made the notebook</span>
        <div className="not-found__code" aria-hidden="true">
          404
        </div>
        <h1 className="not-found__title">This page is not on the shelf.</h1>
        <p className="not-found__copy">
          The link may be old, the crew may have disbanded, or someone wrote the address from
          memory. The room is still open — pick a door below.
        </p>
        <div className="not-found__actions">
          <Button to={user ? "/dashboard" : "/"} variant="primary" icon={<DoorOpen />}>
            {user ? "Open your desk" : "Back to the field guide"}
          </Button>
          <Button to="/teammates" variant="secondary" icon={<UsersRound />}>
            Meet builders
          </Button>
          <Button to="/faq" variant="ghost" icon={<Search />}>
            Search the FAQ
          </Button>
        </div>
        <div className="cluster" style={{ marginTop: 4 }}>
          <Link to="/teams" className="eyebrow eyebrow--plain">
            <Compass size={12} aria-hidden="true" /> Browse open teams
          </Link>
          <Link to="/contact" className="eyebrow eyebrow--plain">
            <ArrowLeft size={12} aria-hidden="true" /> Report a broken link
          </Link>
        </div>
        <span className="field__hint" style={{ marginTop: 10 }}>
          Error 404 · The field guide is still being written.
        </span>
      </div>
    </div>
  );
}
