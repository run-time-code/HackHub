import { describe, expect, it } from "vitest";
import { onboardingSchema } from "./onboardingSchema.js";

const valid = {
  skills: ["React"],
  interests: ["AI/ML"],
  preferredMode: "online",
  location: "Chennai",
};

describe("onboarding schema", () => {
  it("accepts valid details and trims text values", () => {
    const result = onboardingSchema.safeParse({
      ...valid,
      skills: [" React "],
      location: " Chennai ",
    });

    expect(result.success).toBe(true);
    expect(result.data.skills).toEqual(["React"]);
    expect(result.data.location).toBe("Chennai");
  });

  it("matches server-side field count and length limits", () => {
    expect(onboardingSchema.safeParse({ ...valid, skills: Array(11).fill("React") }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...valid, interests: ["x".repeat(81)] }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...valid, location: "x".repeat(101) }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...valid, location: "bad\u0000location" }).success).toBe(false);
  });
});
