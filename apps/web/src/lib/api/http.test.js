import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiRequest } from "./http.js";

function textResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  };
}

describe("http apiRequest session refresh", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  });

  it("refreshes and replays GET /users/me after the access cookie expires", async () => {
    const calls = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url, init = {}) => {
        const target = String(url);
        calls.push({ target, method: init.method || "GET" });

        if (target.endsWith("/auth/csrf-token")) {
          return textResponse(200, { csrfToken: "csrf" });
        }
        if (target.endsWith("/auth/refresh")) {
          return textResponse(200, { message: "Token refreshed successfully" });
        }
        if (target.endsWith("/users/me")) {
          const attempts = calls.filter((call) => call.target.endsWith("/users/me"));
          if (attempts.length === 1) {
            return textResponse(401, { message: "Authentication required" });
          }
          return textResponse(200, { success: true, data: { user: { id: "1" } } });
        }
        return textResponse(200, {});
      })
    );

    const data = await apiRequest("/users/me");

    expect(data).toEqual({ user: { id: "1" } });
    expect(calls.some((call) => call.target.endsWith("/auth/refresh"))).toBe(true);
    expect(calls.filter((call) => call.target.endsWith("/users/me"))).toHaveLength(2);
  });
});
