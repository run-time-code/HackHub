import {
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  isSameYear,
  isToday,
  isTomorrow,
  parseISO,
} from "date-fns";

export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  try {
    const parsed = typeof value === "string" ? parseISO(value) : new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

export function formatDate(value, pattern = "d MMM yyyy") {
  const date = toDate(value);
  return date ? format(date, pattern) : "—";
}

export function formatMonth(value) {
  const date = toDate(value);
  return date ? format(date, "MMM") : "—";
}

export function formatDay(value) {
  const date = toDate(value);
  return date ? format(date, "d") : "—";
}

export function formatRelative(value) {
  const date = toDate(value);
  if (!date) return "just now";
  try {
    return `${formatDistanceToNowStrict(date)} ago`;
  } catch {
    return "just now";
  }
}

export function formatFutureRelative(value) {
  const date = toDate(value);
  if (!date) return "";
  try {
    return `in ${formatDistanceToNowStrict(date)}`;
  } catch {
    return "";
  }
}

export function formatDeadline(value) {
  const date = toDate(value);
  if (!date) return "";
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, isSameYear(date, new Date()) ? "d MMM" : "d MMM yyyy");
}

export function daysUntil(value) {
  const date = toDate(value);
  if (!date) return null;
  return differenceInCalendarDays(date, new Date());
}

export function seasonLabel(value = new Date()) {
  const date = toDate(value) || new Date();
  return `${format(date, "MMMM")} ${format(date, "yyyy")}`;
}

export function availabilityLabel(value) {
  if (value === "limited") return "Limited availability";
  if (value === "unavailable") return "Not available";
  return "Available to build";
}

export function availabilityTone(value) {
  if (value === "limited") return "limited";
  if (value === "unavailable") return "unavailable";
  return "available";
}

export function firstName(name) {
  return String(name || "builder").trim().split(/\s+/)[0] || "builder";
}

export function titleCase(value) {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function pluralize(count, singular, plural) {
  return Number(count) === 1 ? singular : plural;
}

export function expiryLabel(expiresAt) {
  const days = daysUntil(expiresAt);
  if (days === null) return "";
  if (days < 0) return "Expired";
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `${days} days left`;
}

export function excerpt(text, length = 160) {
  const value = String(text || "").trim();
  if (value.length <= length) return value;
  return `${value.slice(0, length).trimEnd()}…`;
}

export async function copyText(text) {
  if (!text) throw new Error("Nothing to copy");
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(field);
  if (!copied) throw new Error("Copy is not available in this browser");
}
