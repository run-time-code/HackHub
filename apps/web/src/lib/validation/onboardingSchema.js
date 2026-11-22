import { z } from "zod";

export const onboardingSchema = z.object({
  skills: z
    .array(
      z.string().trim().min(1).max(80).refine(
        (value) => !/[\u0000-\u001f\u007f]/.test(value), // eslint-disable-line no-control-regex
      )
    )
    .min(1, "Pick at least one skill")
    .max(10, "Choose no more than 10 skills"),
  interests: z
    .array(
      z.string().trim().min(1).max(80).refine(
        (value) => !/[\u0000-\u001f\u007f]/.test(value), // eslint-disable-line no-control-regex
      )
    )
    .min(1, "Pick at least one interest/domain")
    .max(10, "Choose no more than 10 interests"),
  preferredMode: z.enum(["online", "offline", "hybrid"], {
    error: "Choose a preferred mode",
  }),
  location: z
    .string()
    .trim()
    .min(2, "Enter your location")
    .max(100, "Location must be 100 characters or fewer")
    .refine(
      (value) => !/[\u0000-\u001f\u007f]/.test(value), // eslint-disable-line no-control-regex
      "Location contains invalid characters"
    ),
});