import { Link } from "react-router-dom";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import ContentHero from "./ContentHero";
import { useDocumentTitle } from "../../lib/hooks/useDocumentTitle";

export default function LegalPage({
  eyebrow,
  title,
  deck,
  updated = "26 October 2026",
  version = "1.0",
  sections,
  note,
  children,
}) {
  useDocumentTitle(title.split(".")[0]);

  return (
    <>
      <ContentHero
        eyebrow={eyebrow || "The fine print · Plain language"}
        title={title}
        deck={deck}
        meta={[`Effective ${updated}`, `Version ${version}`, "Plain-language edition"]}
        aside={
          <>
            <span className="legal-updated">
              <CheckCircle2 aria-hidden="true" /> Last updated {updated}
            </span>
            {note && <div className="legal-note">{note}</div>}
            <p>
              Questions about this page can go to{" "}
              <a
                href="mailto:legal@hackhub.build"
                style={{ color: "var(--signal-ink)", textDecoration: "underline" }}
              >
                legal@hackhub.build
              </a>
              . We would rather explain a rule than hide behind it.
            </p>
            <Link to="/contact" className="eyebrow eyebrow--plain">
              Talk to us <ArrowUpRight size={12} aria-hidden="true" />
            </Link>
          </>
        }
      />

      <div className="content-body">
        <div className="container content-layout">
          <nav className="content-toc" aria-label="On this page">
            <span className="content-toc__label">On this page</span>
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`}>
                {section.title}
              </a>
            ))}
          </nav>

          <article className="prose">
            {sections.map((section) => (
              <section key={section.id} id={section.id}>
                <h2>{section.title}</h2>
                {section.content}
              </section>
            ))}
            {children}
            <hr />
            <p>
              This page is part of the HackHub field guide. It is written to be
              read, not merely accepted. If something here is unclear,{" "}
              <Link to="/contact">tell us</Link> and we will make it clearer.
            </p>
          </article>
        </div>
      </div>
    </>
  );
}
