import { useEffect } from "react";
import { Link } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowRight, X } from "lucide-react";
import Brand from "./Brand";
import ThemeToggle from "./ThemeToggle";
import IconButton from "../ui/IconButton";

export default function MobileMenu({
  open,
  onClose,
  triggerRef,
  items,
  footLinks = [],
  eyebrow,
  user,
  onSignIn,
  onSignOut,
}) {
  useEffect(() => {
    if (!open) return undefined;
    document.body.classList.add("no-scroll");
    return () => {
      document.body.classList.remove("no-scroll");
    };
  }, [open]);

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          className="mobile-menu"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef?.current?.focus();
          }}
        >
          <DialogPrimitive.Title className="sr-only">Main menu</DialogPrimitive.Title>
          <div className="mobile-menu__head">
            <Brand />
            <DialogPrimitive.Close asChild>
              <IconButton label="Close menu">
                <X />
              </IconButton>
            </DialogPrimitive.Close>
          </div>

          <nav className="mobile-menu__body" aria-label="Main navigation">
            <span className="eyebrow eyebrow--plain mobile-menu__eyebrow">
              {eyebrow || "The field guide"}
            </span>
            {items.map((item, index) => (
              <Link key={item.label} to={item.to} className="mobile-menu__link" onClick={onClose}>
                {item.label}
                <span>{String(index + 1).padStart(2, "0")}</span>
              </Link>
            ))}
            {onSignIn && !user && (
              <Link to="/auth?panel=login" className="mobile-menu__link" onClick={onClose}>
                Sign in
                <span>05</span>
              </Link>
            )}
          </nav>

          <div className="mobile-menu__foot">
            <div className="mobile-menu__foot-links">
              {footLinks.map((link) =>
                link.to ? (
                  <Link key={link.label} to={link.to} onClick={onClose}>
                    {link.label}
                  </Link>
                ) : (
                  <button
                    key={link.label}
                    type="button"
                    onClick={() => {
                      onClose();
                      link.onClick?.();
                    }}
                  >
                    {link.label}
                  </button>
                )
              )}
            </div>
            <div className="cluster">
              <ThemeToggle compact />
              {user ? (
                <button type="button" className="btn btn--secondary btn--sm" onClick={onSignOut}>
                  Sign out
                  <ArrowRight aria-hidden="true" />
                </button>
              ) : (
                <Link to="/auth?panel=register" className="btn btn--primary btn--sm" onClick={onClose}>
                  Start building
                </Link>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
