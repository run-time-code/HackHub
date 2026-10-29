import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  CalendarClock,
  Compass,
  Cookie,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  Mail,
  Moon,
  Search,
  Settings,
  UserRound,
  Users,
  UsersRound,
} from "lucide-react";
import { useTheme } from "../../providers/ThemeProvider";
import { useConsent } from "../../providers/ConsentProvider";

const ROUTE_ITEMS = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, group: "Go to" },
  { label: "Discover hackathons", to: "/discover", icon: Compass, group: "Go to" },
  { label: "Deadline calendar", to: "/calendar", icon: CalendarClock, group: "Go to" },
  { label: "Find teammates", to: "/teammates", icon: Users, group: "Go to" },
  { label: "Teams", to: "/teams", icon: UsersRound, group: "Go to" },
  { label: "Requests", to: "/requests", icon: Inbox, group: "Go to" },
  { label: "Your profile", to: "/profile", icon: UserRound, group: "Go to" },
  { label: "Account settings", to: "/settings", icon: Settings, group: "Go to" },
  { label: "Landing page", to: "/", icon: Compass, group: "Go to" },
  { label: "FAQ", to: "/faq", icon: HelpCircle, group: "Help" },
  { label: "Contact", to: "/contact", icon: Mail, group: "Help" },
];

export default function CommandPalette({ open, onOpenChange }) {
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();
  const { openPreferences } = useConsent();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const items = useMemo(() => {
    const actions = [
      {
        label: "Toggle light / dark theme",
        icon: Moon,
        group: "Actions",
        run: toggleTheme,
      },
      {
        label: "Cookie preferences",
        icon: Cookie,
        group: "Actions",
        run: openPreferences,
      },
    ];
    const all = [...ROUTE_ITEMS, ...actions];
    const term = query.trim().toLowerCase();
    if (!term) return all;
    return all.filter((item) => item.label.toLowerCase().includes(term));
  }, [query, toggleTheme, openPreferences]);

  function handleOpenChange(next) {
    if (!next) {
      setQuery("");
      setActiveIndex(0);
    }
    onOpenChange(next);
  }

  function run(item) {
    if (!item) return;
    handleOpenChange(false);
    if (item.run) item.run();
    else navigate(item.to);
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % Math.max(items.length, 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      run(items[activeIndex]);
    }
  }

  let lastGroup = null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="overlay" />
        <DialogPrimitive.Content className="command-dialog" onKeyDown={handleKeyDown}>
          <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Jump to any part of HackHub or run a quick action.
          </DialogPrimitive.Description>

          <div className="command-dialog__search">
            <Search aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              placeholder="Jump to a page or action…"
              aria-label="Search commands"
            />
            <kbd className="kbd">ESC</kbd>
          </div>

          <div className="command-dialog__body">
            {items.length === 0 && (
              <div className="command-dialog__empty">No matching command. Try “teams” or “profile”.</div>
            )}
            {items.map((item, index) => {
              const Icon = item.icon;
              const showGroup = item.group !== lastGroup;
              lastGroup = item.group;
              return (
                <div key={item.label}>
                  {showGroup && <div className="command-dialog__group-label">{item.group}</div>}
                  <button
                    type="button"
                    className={`command-dialog__item ${index === activeIndex ? "is-active" : ""}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => run(item)}
                  >
                    <Icon aria-hidden="true" />
                    <span>{item.label}</span>
                    {item.to && <kbd className="kbd">↵</kbd>}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="command-dialog__foot">
            <span>
              <kbd className="kbd">↑</kbd>
              <kbd className="kbd">↓</kbd> to move
            </span>
            <span>
              <kbd className="kbd">↵</kbd> to open
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
