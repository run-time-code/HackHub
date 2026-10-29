export default function ContentHero({
  eyebrow,
  title,
  deck,
  meta = [],
  aside,
  children,
}) {
  return (
    <section className="content-hero">
      <div className="container content-hero__inner">
        <div className="content-hero__copy">
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h1 className="content-hero__title">{title}</h1>
          {deck && <p className="content-hero__deck">{deck}</p>}
          {meta.length > 0 && (
            <div className="content-hero__meta">
              {meta.map((entry) => (
                <span key={entry}>{entry}</span>
              ))}
            </div>
          )}
          {children}
        </div>
        {aside && <div className="content-hero__aside">{aside}</div>}
      </div>
    </section>
  );
}
