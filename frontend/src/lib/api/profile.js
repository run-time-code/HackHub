import { getCsrfToken } from "./csrf";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export async function saveOnboarding(payload) {
  const csrfToken = await getCsrfToken();

  const headers = { "Content-Type": "application/json" };

  if (csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  let res = await fetch(`${BASE_URL}/users/me/onboarding`, {
    method: "PUT",
    headers,
    credentials: "include",
    body: JSON.stringify(payload),
  });

  // Refresh the CSRF token once if the cookie rotated.
  if (res.status === 403) {
    const freshToken = await getCsrfToken({ forceRefresh: true });

    if (freshToken) {
      res = await fetch(`${BASE_URL}/users/me/onboarding`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": freshToken },
        credentials: "include",
        body: JSON.stringify(payload),
      });
    }
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    const error = new Error(data?.message || "Something went wrong");
    error.status = res.status;
    error.code = data?.code;
    throw error;
  }

  return data;
}