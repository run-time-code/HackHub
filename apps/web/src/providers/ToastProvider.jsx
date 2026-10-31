import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const DURATIONS = {
  success: 4000,
  info: 5000,
  error: 7000,
};

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    ({ title, description, variant = "success", duration, action }) => {
      const id = createId();
      const resolvedDuration = duration ?? DURATIONS[variant] ?? DURATIONS.success;
      const entry = {
        id,
        title,
        description,
        variant,
        duration: resolvedDuration,
        action,
      };
      setToasts((current) => [...current.slice(-2), entry]);
      if (resolvedDuration > 0) {
        const timer = window.setTimeout(() => {
          dismiss(id);
        }, resolvedDuration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss]
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      toast,
      dismiss,
      success: (title, description) => toast({ title, description, variant: "success" }),
      error: (title, description) => toast({ title, description, variant: "error" }),
      info: (title, description) => toast({ title, description, variant: "info" }),
    }),
    [toast, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map((entry) => {
          const Icon = ICONS[entry.variant] || CheckCircle2;
          return (
            <div
              key={entry.id}
              className={`toast toast--${entry.variant}`}
              role={entry.variant === "error" ? "alert" : "status"}
              style={{ "--toast-duration": `${entry.duration}ms` }}
            >
              <span className="toast__icon" aria-hidden="true">
                <Icon />
              </span>
              <div className="toast__body">
                <strong className="toast__title">{entry.title}</strong>
                {entry.description && (
                  <span className="toast__description">{entry.description}</span>
                )}
              </div>
              {entry.action && (
                <button
                  type="button"
                  className="toast__action"
                  onClick={() => {
                    entry.action.onClick?.();
                    dismiss(entry.id);
                  }}
                >
                  {entry.action.label}
                </button>
              )}
              <button
                type="button"
                className="toast__close"
                onClick={() => dismiss(entry.id)}
                aria-label="Dismiss notification"
              >
                <X size={13} />
              </button>
              {entry.duration > 0 && <span className="toast__progress" aria-hidden="true" />}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- context hook colocated with its provider
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
