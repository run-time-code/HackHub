const TILE =
  "M16 4H46L60 18V48C60 54.627 54.627 60 48 60H16C9.373 60 4 54.627 4 48V16C4 9.373 9.373 4 16 4Z";

export default function LogoMark({ className = "" }) {
  return (
    <svg
      className={`logo-mark ${className}`.trim()}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <path className="logo-mark__tile" d={TILE} />
      <rect className="logo-mark__letter" x="18" y="19" width="5.5" height="26" rx="1" />
      <rect className="logo-mark__letter" x="40.5" y="19" width="5.5" height="26" rx="1" />
      <rect className="logo-mark__letter" x="23.5" y="30.25" width="17" height="5.5" />
      <circle className="logo-mark__hub" cx="32" cy="33" r="4.2" />
    </svg>
  );
}
