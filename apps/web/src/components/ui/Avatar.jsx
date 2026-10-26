import clsx from "clsx";

function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function Avatar({
  src,
  name,
  size = "md",
  ring = false,
  className,
  label,
  ...props
}) {
  return (
    <span
      className={clsx("avatar", size && `avatar--${size}`, ring && "avatar--ring", className)}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      {...props}
    >
      {src ? <img src={src} alt="" loading="lazy" /> : initials(name)}
    </span>
  );
}
