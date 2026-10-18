import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPasswordSchema } from "../../lib/validation/authSchemas";
import { forgotPassword } from "../../lib/api/auth";
import { useAuthMutation } from "../../lib/hooks/useAuthMutation";
import AuthErrorBanner from "./AuthErrorBanner";

export default function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(forgotPasswordSchema) });

  const { mutate, isLoading, error } = useAuthMutation(forgotPassword);

  async function onSubmit(values) {
    try {
      await mutate(values);
      setSent(true);
    } catch {
      // error already captured by useAuthMutation
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold text-gray-900">Check your email</h1>
        <p className="mt-2 text-sm text-gray-600">
          If an account exists for that email, we've sent a password reset link.
        </p>
        <Link to="/auth?panel=login" className="mt-4 inline-flex min-h-11 items-center text-amber-800 hover:underline">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full max-w-sm flex-col gap-4">
      <div>
        <p className="field-label">ACCOUNT RECOVERY</p>
        <h2 className="auth-panel-title">Find your way back.</h2>
      </div>
      <p className="text-sm text-gray-600">
        Enter your email and we'll send you a link to reset your password.
      </p>

      <AuthErrorBanner error={error} />

      <div className="flex flex-col gap-1">
        <label htmlFor="forgot-email" className="text-sm font-medium text-gray-700">Email</label>
        <input
          id="forgot-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "forgot-email-error" : undefined}
          className={`rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 ${
            errors.email ? "border-red-500" : "border-gray-300"
          }`}
          {...register("email")}
        />
        {errors.email && <span id="forgot-email-error" className="text-xs text-red-600">{errors.email.message}</span>}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
      >
        {isLoading ? "Sending..." : "Send reset link"}
      </button>

      <p className="text-center text-sm text-gray-600">
        Remembered your password?{" "}
        <Link to="/auth?panel=login" className="font-semibold text-amber-800 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}