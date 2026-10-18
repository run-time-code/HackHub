import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from "../validation/authSchemas.js";

describe("auth schemas", () => {
  it("login requires a valid email", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
  });

  it("register enforces the shared password policy", () => {
    const good = { name: "Al", email: "a@b.com", password: "Password1", confirmPassword: "Password1" };
    expect(registerSchema.safeParse(good).success).toBe(true);
    const weak = { ...good, password: "short", confirmPassword: "short" };
    expect(registerSchema.safeParse(weak).success).toBe(false);
    const mismatch = { ...good, confirmPassword: "other" };
    expect(registerSchema.safeParse(mismatch).success).toBe(false);
  });

  it("forgot/reset schemas validate", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "bad" }).success).toBe(false);
    const ok = { password: "Password1", confirmPassword: "Password1" };
    expect(resetPasswordSchema.safeParse(ok).success).toBe(true);
  });
});
