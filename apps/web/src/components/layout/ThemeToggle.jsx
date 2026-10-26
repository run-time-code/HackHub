import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../providers/ThemeProvider";

export default function ThemeToggle({ compact = false }) {
  const { theme, setTheme } = useTheme();

  if (compact) {
    const next = theme === "dark" ? "light" : "dark";
    const Icon = theme === "dark" ? Sun : Moon;
    return (
      <button
        type="button"
        className="theme-toggle theme-toggle--single"
        onClick={() => setTheme(next)}
        aria-label={`Switch to ${next} theme`}
        title={`Switch to ${next} theme`}
      >
        <Icon aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="theme-toggle" role="group" aria-label="Colour theme">
      <button
        type="button"
        className="theme-toggle__option"
        onClick={() => setTheme("light")}
        aria-pressed={theme === "light"}
        aria-label="Light theme"
        title="Light theme"
      >
        <Sun aria-hidden="true" />
      </button>
      <button
        type="button"
        className="theme-toggle__option"
        onClick={() => setTheme("dark")}
        aria-pressed={theme === "dark"}
        aria-label="Dark theme"
        title="Dark theme"
      >
        <Moon aria-hidden="true" />
      </button>
    </div>
  );
}
