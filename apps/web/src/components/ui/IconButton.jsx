import { forwardRef } from "react";
import clsx from "clsx";

const IconButton = forwardRef(function IconButton(
  { label, children, bordered = false, className, type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx("icon-btn", bordered && "icon-btn--bordered", className)}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
});

export default IconButton;
