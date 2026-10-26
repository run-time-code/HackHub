import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import clsx from "clsx";
import IconButton from "./IconButton";

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size,
  trigger,
  className,
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="overlay" />
        <DialogPrimitive.Content
          className={clsx("dialog", size && `dialog--${size}`, className)}
        >
          <span className="dialog__grain" aria-hidden="true" />
          <div className="dialog__header">
            <div>
              <DialogPrimitive.Title className="dialog__title">{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="dialog__description">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close asChild>
              <IconButton label="Close dialog" className="dialog__close">
                <X />
              </IconButton>
            </DialogPrimitive.Close>
          </div>
          {children}
          {footer && <div className="dialog__footer">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default Dialog;
