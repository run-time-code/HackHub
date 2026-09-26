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
        <Link to="/login" className="mt-4 inline-block text-blue-600 hover:underline">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">Reset your password</h1>
      <p className="text-sm text-gray-600">
        Enter your email and we'll send you a link to reset your password.
      </p>

      <AuthErrorBanner error={error} />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          placeholder="you@example.com"
          className={`rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.email ? "border-red-500" : "border-gray-300"
          }`}
          {...register("email")}
        />
        {errors.email && <span className="text-xs text-red-600">{errors.email.message}</span>}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? "Sending..." : "Send reset link"}
      </button>

      <p className="text-center text-sm text-gray-600">
        Remembered your password?{" "}
        <Link to="/login" className="text-blue-600 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}