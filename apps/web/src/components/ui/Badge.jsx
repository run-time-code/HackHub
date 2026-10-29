import clsx from "clsx";

export function Badge({ children, variant, dot = false, pulse = false, className }) {
  return (
    <span className={clsx("badge", variant && `badge--${variant}`, className)}>
      {dot && <span className={clsx("badge__dot", pulse && "badge__dot--pulse")} aria-hidden="true" />}
      {children}
    </span>
  );
}

export function Chip({
  children,
  variant,
  dot,
  selected = false,
  onClick,
  className,
  title,
  ...props
}) {
  const classes = clsx(
    "chip",
    variant && `chip--${variant}`,
    selected && "chip--selected",
    onClick && "chip--button",
    className
  );

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick} title={title} aria-pressed={selected || undefined} {...props}>
        {dot && <span className={clsx("chip__dot", `chip__dot--${dot}`)} aria-hidden="true" />}
        {children}
      </button>
    );
  }

  return (
    <span className={classes} title={title} {...props}>
      {dot && <span className={clsx("chip__dot", `chip__dot--${dot}`)} aria-hidden="true" />}
      {children}
    </span>
  );
}

export default Badge;
