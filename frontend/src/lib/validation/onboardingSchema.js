import { z } from "zod";

export const onboardingSchema = z.object({
  skills: z.array(z.string()).min(1, "Pick at least one skill"),
  interests: z.array(z.string()).min(1, "Pick at least one interest/domain"),
  preferredMode: z.enum(["online", "offline", "hybrid"], {
    errorMap: () => ({ message: "Choose a preferred mode" }),
  }),
  location: z.string().min(2, "Enter your location"),
});