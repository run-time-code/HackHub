import { apiRequest } from "./client";

export function changePassword(payload) {
  return apiRequest("/auth/change-password", { method: "POST", body: payload });
}

export function saveNotificationPreferences(payload) {
  return apiRequest("/reminders/preferences", { method: "PUT", body: payload });
}

export function deleteAccount() {
  return apiRequest("/users/me", { method: "DELETE" });
}

export function exportAccountData() {
  return apiRequest("/users/me/export");
}
