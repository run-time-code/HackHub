export default function PageLoading({ label = "Opening the field guide", rows = 3 }) {
  return (
    <div className="stack" role="status" aria-live="polite" style={{ gap: 24 }}>
      <span className="sr-only">{label}…</span>
      <div className="skeleton skeleton--title" style={{ width: "46%", height: 44 }} />
      <div className="skeleton skeleton--text" style={{ width: "70%" }} />
      <div className="split" style={{ marginTop: 12 }}>
        {Array.from({ length: rows }).map((_, index) => (
          <div className="skeleton skeleton--card" key={index} />
        ))}
      </div>
    </div>
  );
}
