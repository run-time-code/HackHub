import { apiRequest } from "./client";

export async function saveOnboarding(payload) {
  return apiRequest("/users/me/onboarding", { method: "PUT", body: payload });
}