export const BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5000/api";

let accessToken = null;

export function setAccessToken(token) {
  accessToken = token || null;
}

export async function apiRequest(path, { method = "GET", body, headers = {} } = {}) {
  const requestHeaders = { ...headers };
  if (body !== undefined) requestHeaders["Content-Type"] = "application/json";
  if (accessToken) requestHeaders.Authorization = `Bearer ${accessToken}`;

  const url = /^https?:\/\//i.test(path) ? path : `${BASE_URL}${path}`;
  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const responseText = await response.text();
  let payload = null;
  let invalidJson = false;
  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      invalidJson = true;
    }
  }

  if (response.status === 401) {
    setAccessToken(null);
    window.dispatchEvent(new CustomEvent("auth:unauthorized"));
  }

  if (!response.ok || payload?.success === false) {
    const error = new Error(
      payload?.message ||
        payload?.error ||
        (invalidJson ? responseText : "") ||
        `Request failed with status ${response.status}`
    );
    error.status = response.status;
    error.code = payload?.code;
    throw error;
  }
  if (invalidJson) {
    const error = new Error(`The API returned a non-JSON response (HTTP ${response.status}).`);
    error.status = response.status;
    throw error;
  }

  const data = payload?.data ?? payload;
  if (data?.accessToken || data?.token) {
    setAccessToken(data.accessToken || data.token);
  }
  if (Array.isArray(data) && payload?.pagination) {
    return { items: data, pagination: payload.pagination };
  }
  return data;
}
