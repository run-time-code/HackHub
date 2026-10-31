import { Link } from "react-router-dom";
import LogoMark from "../LogoMark";

export default function Brand({ to = "/", className = "" }) {
  return (
    <Link to={to} className={`brand ${className}`.trim()}>
      <LogoMark />
      <span className="brand__word">
        HackHub
        <small>Builder&apos;s field guide</small>
      </span>
    </Link>
  );
}
