import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { registerSchema } from "../../lib/validation/authSchemas";
import { registerUser } from "../../lib/api/auth";
import { useAuthMutation } from "../../lib/hooks/useAuthMutation";
import PasswordInput from "./PasswordInput";
import AuthErrorBanner from "./AuthErrorBanner";

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
      navigate("/verify-email?pending=true");
    } catch {
      // error already captured by useAuthMutation
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">Create your HackHub account</h1>

      <AuthErrorBanner error={error} />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          placeholder="Your full name"
          className={`rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? "border-red-500" : "border-gray-300"
          }`}
          {...register("name")}
        />
        {errors.name && <span className="text-xs text-red-600">{errors.name.message}</span>}
      </div>

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
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? "Creating account..." : "Sign up"}
      </button>

      <p className="text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link to="/login" className="text-blue-600 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}