import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";
import Avatar from "../ui/Avatar";
import { useAuth } from "../../context/auth-context";

export default function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  async function handleLogout() {
    await logout();
    navigate("/auth?panel=login", { replace: true });
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="user-menu__trigger" aria-label="Open account menu">
        <Avatar src={user.avatarUrl} name={user.name} size="sm" />
        <span className="user-menu__name">{user.name || "Builder"}</span>
        <ChevronDown aria-hidden="true" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="menu user-menu" sideOffset={8} align="end">
          <div className="user-menu__header">
            <Avatar src={user.avatarUrl} name={user.name} size="md" />
            <div className="user-menu__identity">
              <strong>{user.name || "Builder"}</strong>
              <span>{user.email || "Signed in"}</span>
            </div>
          </div>
          <DropdownMenu.Label className="menu__label">Your desk</DropdownMenu.Label>
          <DropdownMenu.Item className="menu__item" asChild>
            <Link to="/dashboard">
              <LayoutDashboard /> Dashboard
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item className="menu__item" asChild>
            <Link to={`/u/${user.id}`}>
              <UserRound /> Public profile
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item className="menu__item" asChild>
            <Link to="/profile">
              <UserRound /> Edit profile
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="menu__separator" />
          <DropdownMenu.Item className="menu__item" asChild>
            <Link to="/settings">
              <Settings /> Account settings
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item className="menu__item menu__item--danger" onSelect={handleLogout}>
            <LogOut /> Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
