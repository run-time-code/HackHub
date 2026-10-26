import { Link } from "react-router-dom";

export default function Brand({ to = "/", className = "" }) {
  return (
    <Link to={to} className={`brand ${className}`.trim()} aria-label="HackHub home">
      <span className="brand__mark" aria-hidden="true">
        H
      </span>
      <span className="brand__word">
        HackHub
        <small>Builder&apos;s field guide</small>
      </span>
    </Link>
  );
}
