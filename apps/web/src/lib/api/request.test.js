import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiRequest } from "./request.js";

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    clone() {
      return jsonResponse(body, status);
    },
    json: async () => body,
  };
}

describe("apiRequest", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  });

  it("surfaces non-JSON errors with their status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        clone() {
          return this;
        },
        json: async () => {
          throw new Error("not json");
        },
      }))
    );
    await expect(apiRequest("/users/me", { method: "GET" })).rejects.toMatchObject({ status: 500 });
  });

  it("sends the CSRF header on mutations", async () => {
    const seen = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url, init) => {
        seen.push({ url: String(url), headers: init?.headers });
        if (String(url).endsWith("/auth/csrf-token")) return jsonResponse({ csrfToken: "csrf" });
        return jsonResponse({ ok: true });
      })
    );
    await apiRequest("/teams", { method: "POST", body: { name: "x" } });
    const mutation = seen.find((c) => c.url.endsWith("/teams"));
    expect(mutation.headers["X-CSRF-Token"]).toBeTruthy();
  });

  it("apiRequest is exported", () => {
    expect(typeof apiRequest).toBe("function");
  });
});
