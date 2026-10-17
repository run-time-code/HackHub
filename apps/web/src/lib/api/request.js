import { getCsrfToken } from "./csrf";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const MUTATING_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

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

  let csrfToken = isMutating ? await fetchCsrfToken() : null;
  let response = await send(csrfToken);

  // The CSRF cookie may have rotated since the token was cached;
  // refresh once and retry.
  if (response.status === 403 && isMutating) {
    csrfToken = await fetchCsrfToken(true);
    response = await send(csrfToken);
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
