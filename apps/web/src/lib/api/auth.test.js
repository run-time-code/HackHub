import { describe, it, expect, vi, beforeEach } from "vitest";
import { resetPassword } from "./auth.js";

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

describe("resetPassword", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  });

  it("sends the token in the request body, not the query string", async () => {
    const calls = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url, init) => {
        calls.push({ url: String(url), init });

        if (String(url).endsWith("/auth/csrf-token")) {
          return jsonResponse({ csrfToken: "csrf" });
        }

        return jsonResponse({ message: "Password updated" });
      })
    );

    await resetPassword("reset-token", { password: "new-password" });

    const call = calls.find((entry) => entry.url.endsWith("/auth/reset-password"));

    expect(call).toBeTruthy();
    expect(call.url).not.toContain("token=");
    expect(JSON.parse(call.init.body)).toEqual({
      password: "new-password",
      token: "reset-token",
    });
  });
});
