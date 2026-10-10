const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

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
          return null;
        }

        const data = await res.json();
        return data?.csrfToken || null;
      } catch {
        return null;
      } finally {
        // Tokens are cheap to re-fetch; expire the cache after 10 minutes.
        setTimeout(() => {
          tokenPromise = null;
        }, 10 * 60 * 1000);
      }
    })();
  }

  return tokenPromise;
}