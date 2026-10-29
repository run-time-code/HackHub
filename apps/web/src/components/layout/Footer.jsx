import { Link } from "react-router-dom";
import { Code2, Mail } from "lucide-react";
import Brand from "./Brand";
import { useConsent } from "../../providers/ConsentProvider";

const COLUMNS = [
  {
    title: "The network",
    links: [
      { label: "Find teammates", to: "/teammates" },
      { label: "Browse teams", to: "/teams" },
      { label: "Your requests", to: "/requests" },
      { label: "Dashboard", to: "/dashboard" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "FAQ", to: "/faq" },
      { label: "Contact", to: "/contact" },
      { label: "Feedback", to: "/contact#feedback" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", to: "/legal/privacy" },
      { label: "Terms", to: "/legal/terms" },
      { label: "Cookies", to: "/legal/cookies" },
      { label: "Community", to: "/legal/community" },
    ],
  },
];

export default function Footer() {
  const { openPreferences } = useConsent();

  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <Brand />
            <p>
              Hackathons, teammates and deadlines in one field guide for student
              builders. Show up with a crew, not a cold start.
            </p>
            <span className="site-footer__status">All systems open</span>
          </div>
          {COLUMNS.map((column) => (
            <div key={column.title} className="site-footer__col">
              <h3>{column.title}</h3>
              {column.links.map((link) => (
                <Link key={link.label} to={link.to}>
                  {link.label}
                </Link>
              ))}
              {column.title === "Legal" && (
                <button type="button" onClick={openPreferences}>
                  Cookie settings
                </button>
              )}
            </div>
          ))}
          <div className="site-footer__col">
            <h3>Elsewhere</h3>
            <a href="https://github.com/run-time-code/HackHub" target="_blank" rel="noreferrer">
              GitHub ↗
            </a>
            <a href="mailto:hello@hackhub.build">Email ↗</a>
            <span className="mono" style={{ color: "var(--faint)", fontSize: "0.6rem" }}>
              Built by builders
            </span>
          </div>
        </div>

        <div className="site-footer__wordmark" aria-hidden="true">
          HACKHUB
        </div>

        <div className="site-footer__bottom">
          <span>© 2026 HackHub · A field guide for student builders</span>
          <span>Made for the ones who start before they are ready</span>
          <div className="site-footer__socials">
            <a
              href="https://github.com/run-time-code/HackHub"
              target="_blank"
              rel="noreferrer"
              aria-label="HackHub on GitHub"
            >
              <Code2 />
            </a>
            <a href="mailto:hello@hackhub.build" aria-label="Email HackHub">
              <Mail />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
