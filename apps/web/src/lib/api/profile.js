import { apiRequest } from "./request";

export function saveOnboarding(payload) {
  return apiRequest("/users/me/onboarding", { method: "PUT", body: payload });
}