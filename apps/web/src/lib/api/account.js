import { apiRequest } from "./request";

export function changePassword(payload) {
  return apiRequest("/users/me/change-password", { method: "PUT", body: payload });
}

export function deleteAccount() {
  return apiRequest("/users/me", { method: "DELETE" });
}

export function exportAccountData() {
  return apiRequest("/users/me/export");
}
