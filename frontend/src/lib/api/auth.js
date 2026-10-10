import { apiRequest } from "./request";

const request = (path, options = {}) => apiRequest(path, { method: "POST", ...options });

export function loginUser(payload) {
  return request("/auth/login", { body: payload });
}

export function registerUser(payload) {
  return request("/auth/register", { body: payload });
}

export function forgotPassword(payload) {
  return request("/auth/forgot-password", { body: payload });
}

export function resetPassword(token, payload) {
  return request(`/auth/reset-password?token=${encodeURIComponent(token)}`, { body: payload });
}

export function verifyEmail(token) {
  return request(`/auth/verify-email?token=${encodeURIComponent(token)}`, { method: "GET" });
}

export function getCurrentUser() {
  return request("/users/me", { method: "GET" });
}

export function logoutUser() {
  return request("/auth/logout", { method: "POST" });
}