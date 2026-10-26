import { forwardRef } from "react";
import { AlertCircle } from "lucide-react";
import clsx from "clsx";

export function Field({ label, htmlFor, hint, error, optional, children, className }) {
  return (
    <div className={clsx("field", className)}>
      {label && (
        <label className="field__label" htmlFor={htmlFor}>
          {label}
          {optional && <span>optional</span>}
        </label>
      )}
      {children}
      {error ? (
        <span className="field__error" id={htmlFor ? `${htmlFor}-error` : undefined}>
          <AlertCircle aria-hidden="true" />
          {error}
        </span>
      ) : (
        hint && <span className="field__hint">{hint}</span>
      )}
    </div>
  );
}

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={clsx("input", className)} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={clsx("textarea", className)} {...props} />;
});

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={clsx("select", className)} {...props}>
      {children}
    </select>
  );
});
