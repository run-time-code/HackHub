import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { registerSchema } from "../../lib/validation/authSchemas";
import { registerUser } from "../../lib/api/auth";
import { useAuthMutation } from "../../lib/hooks/useAuthMutation";
import PasswordInput from "./PasswordInput";
import AuthErrorBanner from "./AuthErrorBanner";
import SocialAuthButtons from "./SocialAuthButtons";

export default function RegisterForm() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(registerSchema) });

  const { mutate, isLoading, error } = useAuthMutation(registerUser);

  async function onSubmit(values) {
    try {
      await mutate(values);
      navigate("/auth?panel=verify&pending=true");
    } catch {
      // error already captured by useAuthMutation
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full max-w-sm flex-col gap-4">
      <div>
        <p className="field-label">YOUR FIRST ENTRY</p>
        <h2 className="auth-panel-title">Make an account.</h2>
      </div>

      <AuthErrorBanner error={error} />
      <SocialAuthButtons />
      <div className="auth-divider"><span>OR SIGN UP WITH EMAIL</span></div>

      <div className="flex flex-col gap-1">
        <label htmlFor="register-name" className="text-sm font-medium text-gray-700">Name</label>
        <input
          id="register-name"
          type="text"
          autoComplete="name"
          placeholder="Your full name"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "register-name-error" : undefined}
          className={`rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 ${
            errors.name ? "border-red-500" : "border-gray-300"
          }`}
          {...register("name")}
        />
        {errors.name && <span id="register-name-error" className="text-xs text-red-600">{errors.name.message}</span>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="register-email" className="text-sm font-medium text-gray-700">Email</label>
        <input
          id="register-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "register-email-error" : undefined}
          className={`rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 ${
            errors.email ? "border-red-500" : "border-gray-300"
          }`}
          {...register("email")}
        />
        {errors.email && <span id="register-email-error" className="text-xs text-red-600">{errors.email.message}</span>}
      </div>

      <PasswordInput
        label="Password"
        placeholder="At least 8 characters"
        error={errors.password}
        registration={register("password")}
      />

      <PasswordInput
        label="Confirm password"
        placeholder="Re-enter password"
        error={errors.confirmPassword}
        registration={register("confirmPassword")}
      />

      <button
        type="submit"
        disabled={isLoading}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
      >
        {isLoading ? "Creating account..." : "Sign up"}
      </button>

      <p className="text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link to="/auth?panel=login" className="font-semibold text-amber-800 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}