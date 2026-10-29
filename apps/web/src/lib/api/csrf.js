import { DEMO_MODE, demoApiBase } from "../demo";

const BASE_URL = DEMO_MODE
  ? demoApiBase()
  : import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

// The backend protects every state-changing request with double-submit
// CSRF: the browser must hold the httpOnly CSRF cookie (set by this call)
// and send the matching token in the X-CSRF-Token header. The token is
// cached in-memory and re-fetched whenever it may have rotated.

let tokenPromise = null;

export async function getCsrfToken({ forceRefresh = false } = {}) {
  if (forceRefresh) {
    tokenPromise = null;
  }

  if (!tokenPromise) {
    tokenPromise = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/auth/csrf-token`, {
          credentials: "include",
        });

        if (!res.ok) {
          // F-10: a failed fetch must not poison the cache for 10 minutes.
          tokenPromise = null;
          return null;
        }

        const data = await res.json();
        const token = data?.csrfToken || null;
        if (!token) {
          tokenPromise = null;
          return null;
        }
        return token;
      } catch {
        // Network failure: clear immediately so the next call retries.
        tokenPromise = null;
        return null;
      } finally {
        // Tokens are cheap to re-fetch; expire the cache after 10 minutes.
        // unref so the timer never keeps vitest/node alive.
        const t = setTimeout(() => {
          tokenPromise = null;
        }, 10 * 60 * 1000);
        if (t && typeof t.unref === "function") t.unref();
      }
    })();
  }

  return tokenPromise;
}