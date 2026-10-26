import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "hackhub:theme";
const ThemeContext = createContext(null);

function systemTheme() {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

function storedTheme() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark") return value;
  } catch {
    // Fall through to the system preference.
  }
  return null;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => storedTheme() || systemTheme());

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0b0e0b" : "#f3f0e7");
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme: theme,
      isDark: theme === "dark",
      setTheme(next) {
        if (next !== "light" && next !== "dark") return;
        setThemeState(next);
        try {
          window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // Persisting is a convenience, not a requirement.
        }
      },
      toggleTheme() {
        const next = theme === "dark" ? "light" : "dark";
        setThemeState(next);
        try {
          window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // no-op
        }
      },
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- context hook colocated with its provider
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
