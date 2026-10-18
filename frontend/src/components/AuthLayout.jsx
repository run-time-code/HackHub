import { Link } from "react-router-dom";

const PANEL_COPY = {
  login: ["BACK TO THE BUILD", "Pick up where your next idea begins."],
  register: ["FIRST ENTRY", "Make space for what you want to build."],
  forgot: ["ACCOUNT RECOVERY", "A missed password should not end the project."],
  reset: ["SECURE YOUR WORK", "Set a new key and get back to building."],
  verify: ["ONE LAST CHECK", "Confirm your address. Then find your people."],
};

export default function AuthLayout({ children, panel = "login" }) {
  const [eyebrow, headline] = PANEL_COPY[panel] || PANEL_COPY.login;

  return (
    <main className="auth-page">
      <div className="auth-frame">
        <section className="auth-story" aria-label="About HackHub">
          <Link to="/auth?panel=login" className="auth-brand">
            <span className="brand-mark" aria-hidden="true"><span>H</span><i /></span>
            <span>HackHub <small>FIELD GUIDE</small></span>
          </Link>
          <div className="auth-story-copy">
            <p className="field-label">{eyebrow}</p>
            <h1>{headline}</h1>
            <p className="auth-deck">Find the right room, the right teammates, and a deadline worth showing up for.</p>
          </div>
        </section>
        <section className="auth-form-side">
          <div className="mobile-brand">
            <span className="brand-mark" aria-hidden="true"><span>H</span><i /></span>
            <strong>HackHub</strong>
          </div>
          <div className="auth-card">{children}</div>
        </section>
      </div>
    </main>
  );
}
