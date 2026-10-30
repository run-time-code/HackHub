import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../providers/ThemeProvider";
import Tooltip from "../ui/Tooltip";

export default function ThemeToggle({ compact = false }) {
  const { theme, setTheme } = useTheme();

  const option = ({ Icon, label }) => (
    <Tooltip trigger={<Icon aria-hidden="true" />}>{label}</Tooltip>
  );

  if (compact) {
    const next = theme === "dark" ? "light" : "dark";
    const Icon = theme === "dark" ? Sun : Moon;
    return (
      <button
        type="button"
        className="theme-toggle theme-toggle--single"
        onClick={() => setTheme(next)}
        aria-label={`Switch to ${next} theme`}
      >
        {option({
          Icon,
          label: `Switch to ${next} theme`,
        })}
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
      >
        {option({
          Icon: Sun,
          label: "Light theme",
        })}
      </button>
      <button
        type="button"
        className="theme-toggle__option"
        onClick={() => setTheme("dark")}
        aria-pressed={theme === "dark"}
      >
        {option({
          Icon: Moon,
          label: "Dark theme",
        })}
      </button>
    </div>
  );
}