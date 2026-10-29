import clsx from "clsx";

export default function MatchRing({ value = 0, size = "md", label, className }) {
  const normalized = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  const tone =
    normalized >= 75 ? "signal" : normalized >= 50 ? "moss" : "neutral";

  return (
    <div
      className={clsx(
        "match-ring",
        size !== "md" && `match-ring--${size}`,
        `match-ring--${tone}`,
        className
      )}
      style={{ "--pct": normalized }}
      aria-label={label || `Match ${normalized} percent`}
      role="img"
    >
      <span className="match-ring__value" aria-hidden="true">
        {normalized}
        <small>match</small>
      </span>
    </div>
  );
}
