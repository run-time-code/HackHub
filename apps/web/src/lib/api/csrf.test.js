import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCsrfToken } from "./csrf.js";

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

describe("getCsrfToken caching", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetches a token from the bootstrap endpoint", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ csrfToken: "abc" }));
    vi.stubGlobal("fetch", fetchMock);
    await getCsrfToken({ forceRefresh: true });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/csrf-token"),
      expect.anything()
    );
  });

  it("returns null when the bootstrap fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({}, 500)));
    expect(await getCsrfToken({ forceRefresh: true })).toBeNull();
  });

  it("getCsrfToken export is stable", () => {
    expect(typeof getCsrfToken).toBe("function");
  });
});
