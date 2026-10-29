import { api, BASE_URL } from "./http";

export async function listNotifications({ limit = 10, unreadOnly = false } = {}, { signal } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (unreadOnly) params.set("unreadOnly", "true");
  const data = await api.get(`/notifications?${params.toString()}`, { signal });
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    unread: Number(data?.unread) || 0,
    total: Number(data?.total) || 0,
  };
}

export async function markNotificationRead(id) {
  return api.patch(`/notifications/${encodeURIComponent(id)}/read`);
}

export async function markAllNotificationsRead() {
  return api.patch("/notifications/read-all");
}

export function notificationStreamUrl() {
  return `${BASE_URL}/notifications/stream`;
}
