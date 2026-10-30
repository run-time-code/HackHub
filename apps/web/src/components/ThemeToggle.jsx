import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../providers/ThemeProvider";
import Tooltip from "../ui/Tooltip";

export default function ThemeToggle({ compact = false }) {
  const { theme, setTheme } = useTheme();

  const option = ({ theme: next, Icon, label, pressed }) => (
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
          theme: next,
          Icon,
          label: `Switch to ${next} theme`,
          pressed: theme === next,
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
          theme: "light",
          Icon: Sun,
          label: "Light theme",
          pressed: theme === "light",
        })}
      </button>
      <button
        type="button"
        className="theme-toggle__option"
        onClick={() => setTheme("dark")}
        aria-pressed={theme === "dark"}
      >
        {option({
          theme: "dark",
          Icon: Moon,
          label: "Dark theme",
          pressed: theme === "dark",
        })}
      </button>
    </div>
  );
}