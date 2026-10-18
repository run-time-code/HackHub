import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { resetPasswordSchema } from "../../lib/validation/authSchemas";
import { resetPassword } from "../../lib/api/auth";
import { useAuthMutation } from "../../lib/hooks/useAuthMutation";
import PasswordInput from "./PasswordInput";
import AuthErrorBanner from "./AuthErrorBanner";

export default function ResetPasswordForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(resetPasswordSchema) });

  const { mutate, isLoading, error } = useAuthMutation((values) => resetPassword(token, values));

  async function onSubmit(values) {
    try {
      await mutate(values);
      navigate("/auth?panel=login");
    } catch {
      // error already captured by useAuthMutation
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold text-gray-900">Invalid or expired link</h1>
        <p className="mt-2 text-sm text-gray-600">Please request a new password reset link.</p>
        <Link to="/auth?panel=forgot" className="mt-4 inline-flex min-h-11 items-center text-amber-800 hover:underline">
          Request new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full max-w-sm flex-col gap-4">
      <div>
        <p className="field-label">SECURE YOUR WORK</p>
        <h2 className="auth-panel-title">Set a new password.</h2>
      </div>

      <AuthErrorBanner error={error} />

      <PasswordInput
        label="New password"
        placeholder="At least 8 characters"
        error={errors.password}
        registration={register("password")}
      />

      <PasswordInput
        label="Confirm new password"
        placeholder="Re-enter password"
        error={errors.confirmPassword}
        registration={register("confirmPassword")}
      />

      <button
        type="submit"
        disabled={isLoading}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
      >
        {isLoading ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}