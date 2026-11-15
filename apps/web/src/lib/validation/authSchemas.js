import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).email("Enter a valid email address"),
  password: z.string().min(1, "Password is required").max(1024, "Password is too long"),
});

const passwordRule = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "Password must be 72 bytes or fewer"
  )
  .regex(/[A-Z]/, "Must include at least one uppercase letter")
  .regex(/[0-9]/, "Must include at least one number")
  .regex(/[^A-Za-z0-9]/, "Must include at least one special character");

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(80, "Name must be 80 characters or fewer")
      .refine(
        (value) => !/[\u0000-\u001f\u007f]/.test(value), // eslint-disable-line no-control-regex
        "Name contains invalid characters"
      ),
    email: z.string().trim().toLowerCase().max(254).email("Enter a valid email address"),
    password: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).email("Enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    password: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });