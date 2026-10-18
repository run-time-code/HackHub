import { apiRequest, setAccessToken } from "./client";

export function loginUser(payload) {
  return apiRequest("/auth/login", { method: "POST", body: payload }).then((data) => {
    if (!data?.user || typeof data.user !== "object") {
      throw new Error("The login API response did not include a user.");
    }
    return data;
  });
}

export function registerUser(payload) {
  const { name, email, password } = payload;
  return apiRequest("/auth/register", { method: "POST", body: { name, email, password } });
}

export function forgotPassword(payload) {
  return apiRequest("/auth/forgot-password", { method: "POST", body: payload });
}

export function resetPassword(token, payload) {
  const { password } = payload;
  return apiRequest(`/auth/reset-password?token=${encodeURIComponent(token)}`, {
    method: "POST",
    body: { password },
  });
}

export function verifyEmail(token) {
  return apiRequest(`/auth/verify-email?token=${encodeURIComponent(token)}`);
}

export function getCurrentUser() {
  return apiRequest("/auth/me").then((data) => {
    if (!data?.user || typeof data.user !== "object") {
      throw new Error("The current-user API response did not include a user.");
    }
    return data;
  });
}

export function logoutUser() {
  return apiRequest("/auth/logout", { method: "POST" }).finally(() => setAccessToken(null));
}

export function startOAuth(provider) {
  if (!["google", "github"].includes(provider)) {
    throw new Error("Unsupported sign-in provider.");
  }
  const configuredUrl = provider === "google"
    ? import.meta.env.VITE_GOOGLE_OAUTH_START_URL
    : import.meta.env.VITE_GITHUB_OAUTH_START_URL;
  return apiRequest(configuredUrl || `/auth/oauth/${provider}`, { method: "POST" });
}