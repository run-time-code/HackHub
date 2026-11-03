import { describe, expect, it } from "vitest";
import { buildCsp } from "../../../../scripts/configure-vercel-csp.mjs";

const policy = "default-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'self';";

describe("Vercel Content Security Policy configuration", () => {
  it("allows only the configured API origin and Cloudinary avatars", () => {
    expect(buildCsp("https://api.example.com/api", policy)).toBe(
      "default-src 'self'; img-src 'self' data: https://res.cloudinary.com; " +
      "connect-src 'self' https://api.example.com; base-uri 'self';",
    );
  });

  it("allows localhost HTTP for development", () => {
    expect(buildCsp("http://localhost:5000/api", policy)).toContain(
      "connect-src 'self' http://localhost:5000",
    );
  });

  it.each([
    "http://api.example.com/api",
    "javascript:alert(1)",
    "https://user:password@api.example.com/api",
  ])("rejects an unsafe API URL: %s", (url) => {
    expect(() => buildCsp(url, policy)).toThrow();
  });
});
