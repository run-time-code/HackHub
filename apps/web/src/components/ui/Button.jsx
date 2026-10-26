import { forwardRef } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";

const Button = forwardRef(function Button(
  {
    children,
    variant = "secondary",
    size,
    block = false,
    icon = null,
    iconRight = null,
    loading = false,
    disabled = false,
    className,
    to,
    href,
    type = "button",
    ...props
  },
  ref
) {
  const classes = clsx(
    "btn",
    variant && `btn--${variant}`,
    size && `btn--${size}`,
    block && "btn--block",
    loading && "is-loading",
    className
  );

  const content = (
    <>
      {loading ? <span className="btn__spinner" aria-hidden="true" /> : icon}
      {children}
      {iconRight}
    </>
  );

  const shared = {
    className: classes,
    ref,
    ...(loading ? { "aria-busy": "true" } : {}),
    ...props,
  };

  if (to) {
    return (
      <Link {...shared} to={to} aria-disabled={disabled || loading || undefined}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a
        {...shared}
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noreferrer noopener" : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <button {...shared} type={type} disabled={disabled || loading}>
      {content}
    </button>
  );
});

export default Button;
