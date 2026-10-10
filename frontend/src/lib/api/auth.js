const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

function emit401() {
  window.dispatchEvent(new CustomEvent("auth:unauthorized"));
}

async function request(path, { method = "POST", body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body
  }

  if (res.status === 401) emit401();

  if (!res.ok) {
    const error = new Error(data?.message || "Something went wrong");
    error.status = res.status;
    error.code = data?.code;
    throw error;
  }

  return data;
}

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
  return request("/auth/me", { method: "GET" });
}

export function logoutUser() {
  return request("/auth/logout", { method: "POST" });
}