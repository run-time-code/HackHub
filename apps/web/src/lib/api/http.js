import { getCsrfToken } from "./csrf";
import { DEMO_MODE, demoApiBase } from "../demo";

// Keep demo traffic same-origin so the service worker can answer it without
// any CORS setup, and so a built demo can be hosted as a static site.
export const BASE_URL = DEMO_MODE
  ? demoApiBase()
  : import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/api";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const NO_REFRESH_PREFIXES = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
];

export class ApiError extends Error {
  constructor(message, { status = 0, code = null, details = null, requestId = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

function isAuthPath(path) {
  return NO_REFRESH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function messageFromPayload(payload) {
  return (
    payload?.error?.message ||
    payload?.message ||
    payload?.error ||
    null
  );
}

async function parsePayload(response) {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function refreshSession() {
  try {
    const csrfToken = await getCsrfToken({ forceRefresh: true });
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
      credentials: "include",
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * The one HTTP client for all WA3 code.
 *
 * - unwraps `{ success: true, data }` envelopes and passes legacy payloads through
 * - refreshes an expired session once and replays the request
 * - retries a mutation once when the CSRF token rotated
 * - supports JSON bodies and FormData uploads
 */
export async function apiRequest(path, options = {}) {
  const {
    method = "GET",
    body,
    headers: extraHeaders = {},
    signal,
    raw = false,
    retryOnUnauthorized = true,
  } = options;

  const upperMethod = method.toUpperCase();
  const mutating = MUTATING_METHODS.has(upperMethod);
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const send = async (csrfToken) => {
    const headers = { ...extraHeaders };
    if (body !== undefined && !isFormData) headers["Content-Type"] = "application/json";
    if (csrfToken) headers["X-CSRF-Token"] = csrfToken;

    return fetch(`${BASE_URL}${path}`, {
      method: upperMethod,
      headers,
      credentials: "include",
      signal,
      body:
        body === undefined || body === null
          ? undefined
          : isFormData
            ? body
            : JSON.stringify(body),
    });
  };

  let csrfToken = mutating ? await getCsrfToken() : null;
  let response = await send(csrfToken);
  let payload = await parsePayload(response);

  if (
    response.status === 401 &&
    retryOnUnauthorized &&
    !isAuthPath(path) &&
    !path.startsWith("/users/me")
  ) {
    const refreshed = await refreshSession();
    if (refreshed) {
      if (mutating) csrfToken = await getCsrfToken({ forceRefresh: true });
      response = await send(csrfToken);
      payload = await parsePayload(response);
    }
  }

  if (response.status === 403 && mutating) {
    const code = payload?.error?.code || payload?.code;
    if (code === "EBADCSRFTOKEN" || code === "CSRF_ERROR") {
      csrfToken = await getCsrfToken({ forceRefresh: true });
      response = await send(csrfToken);
      payload = await parsePayload(response);
    }
  }

  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent("auth:unauthorized"));
  }

  if (!response.ok) {
    throw new ApiError(messageFromPayload(payload) || `Request failed (${response.status})`, {
      status: response.status,
      code: payload?.error?.code || payload?.code || null,
      details: payload?.errors || payload?.error?.details || null,
      requestId: payload?.requestId || null,
    });
  }

  if (raw) return payload;

  // WA3 routes use the envelope; legacy routes return `{ message, user }`.
  if (payload && payload.success === true && Object.prototype.hasOwnProperty.call(payload, "data")) {
    return payload.data;
  }
  return payload;
}

export const api = {
  get: (path, options) => apiRequest(path, { ...options, method: "GET" }),
  post: (path, body, options) => apiRequest(path, { ...options, method: "POST", body }),
  put: (path, body, options) => apiRequest(path, { ...options, method: "PUT", body }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: "PATCH", body }),
  delete: (path, options) => apiRequest(path, { ...options, method: "DELETE" }),
};

export function errorMessage(error, fallback = "Something went wrong. Try again.") {
  if (error?.status === 429) {
    return "You are moving fast. Try again in a little while.";
  }
  if (error?.status === 404) {
    return error.message || "We could not find that page or record.";
  }
  if (error?.status === 403) {
    return error.message || "You do not have permission to do that.";
  }
  if (error?.status === 0) {
    return "The network dropped the request. Check your connection and retry.";
  }
  return error?.message || fallback;
}
