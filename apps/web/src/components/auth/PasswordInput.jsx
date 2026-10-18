import { useState } from "react";

export default function PasswordInput({ label, error, registration, placeholder }) {
  const [visible, setVisible] = useState(false);
  const inputId = registration?.name;

  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-sm font-medium text-gray-700">{label}</label>}
      <div className="relative">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-amber-500 ${
            error ? "border-red-500" : "border-gray-300"
          }`}
          {...registration}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700"
          aria-label={`${visible ? "Hide" : "Show"} ${label?.toLowerCase() || "password"}`}
          aria-pressed={visible}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {error && <span id={`${inputId}-error`} className="text-xs text-red-600">{error.message}</span>}
    </div>
  );
}