import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { loginSchema } from "../../lib/validation/authSchemas";
import { loginUser } from "../../lib/api/auth";
import { useAuthMutation } from "../../lib/hooks/useAuthMutation";
import { useAuth } from "../../context/AuthContext";
import PasswordInput from "./PasswordInput";
import AuthErrorBanner from "./AuthErrorBanner";

export default function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const { mutate, isLoading, error } = useAuthMutation(loginUser);

  async function onSubmit(values) {
    try {
      const result = await mutate(values);
      login(result.user);
      const redirectTo = location.state?.from?.pathname || "/dashboard";
      navigate(redirectTo, { replace: true });
    } catch {
      // error already captured by useAuthMutation
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">Log in to HackHub</h1>

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

      <PasswordInput
        label="Password"
        placeholder="••••••••"
        error={errors.password}
        registration={register("password")}
      />

      <div className="text-right text-sm">
        <Link to="/forgot-password" className="text-blue-600 hover:underline">
          Forgot password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? "Logging in..." : "Log in"}
      </button>

      <p className="text-center text-sm text-gray-600">
        Don't have an account?{" "}
        <Link to="/register" className="text-blue-600 hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}