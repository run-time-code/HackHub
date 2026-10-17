import { getCsrfToken } from "./csrf";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const MUTATING_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

// Auth endpoints that must never trigger a refresh loop.
const NO_REFRESH_PREFIXES = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];

async function fetchCsrfToken(forceRefresh = false) {
  const token = await getCsrfToken({ forceRefresh });

  if (!token) {
    throw new Error("Unable to initialize secure request");
  }

  return token;
}

export async function apiRequest(path, { method = "GET", body } = {}) {
  const isMutating = MUTATING_METHODS.includes(method.toUpperCase());

  const send = (csrfToken) => {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (csrfToken) headers["X-CSRF-Token"] = csrfToken;

    return fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };

  // Refresh the session once and replay the original request. Without this
  // the SPA logged users out every 15 minutes when the access token expired.
  const refreshSession = async () => {
    if (NO_REFRESH_PREFIXES.some((p) => path.startsWith(p))) return false;
    try {
      const csrfToken = await fetchCsrfToken(true);
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "X-CSRF-Token": csrfToken },
        credentials: "include",
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  let csrfToken = isMutating ? await fetchCsrfToken() : null;
  let response = await send(csrfToken);

  // F-04: expired session -> refresh once, replay once.
  if (response.status === 401 && !NO_REFRESH_PREFIXES.some((p) => path.startsWith(p))) {
    const refreshed = await refreshSession();
    if (refreshed) {
      if (isMutating) csrfToken = await fetchCsrfToken();
      response = await send(csrfToken);
    }
  }

  // F-09: only a CSRF 403 replays the mutation (ordinary 403s like
  // TEAM_FORBIDDEN must surface immediately).
  if (response.status === 403 && isMutating) {
    const peek = await response.clone().json().catch(() => null);
    const errCode = peek?.code || peek?.error?.code || null;
    // csrf-csrf answers with code EBADCSRFTOKEN; accept the app alias too.
    if (errCode === "EBADCSRFTOKEN" || errCode === "CSRF_ERROR") {
      csrfToken = await fetchCsrfToken(true);
      response = await send(csrfToken);
    }
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Non-JSON responses are still surfaced with their HTTP status.
  }

  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent("auth:unauthorized"));
  }

  if (!response.ok) {
    const error = new Error(data?.message || data?.error?.message || "Something went wrong");
    error.status = response.status;
    error.code = data?.code || data?.error?.code;
    throw error;
  }

  return data;
}
