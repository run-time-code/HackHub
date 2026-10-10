const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
let csrfToken;
let csrfRequest;

async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  if (!csrfRequest) {
    csrfRequest = fetch(`${BASE_URL}/auth/csrf-token`, { credentials: "include" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.csrfToken) {
          throw new Error(data.message || "Unable to initialize secure request");
        }
        csrfToken = data.csrfToken;
        return csrfToken;
      })
      .finally(() => {
        csrfRequest = null;
      });
  }
  return csrfRequest;
}

export async function apiRequest(path, { method = "GET", body } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (!["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
    headers["X-CSRF-Token"] = await getCsrfToken();
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

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