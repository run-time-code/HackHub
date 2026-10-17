import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { loginSchema } from "../../lib/validation/authSchemas";
import { loginUser, getCurrentUser } from "../../lib/api/auth";
import { useAuthMutation } from "../../lib/hooks/useAuthMutation";
import { useAuth } from "../../context/AuthContext";
import PasswordInput from "./PasswordInput";
import AuthErrorBanner from "./AuthErrorBanner";
import SocialLoginButtons from "./SocialLoginButtons";

export default function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [oauthError, setOauthError] = useState(null);
  const [oauthPending, setOauthPending] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const { mutate, isLoading, error } = useAuthMutation(loginUser);

  // The OAuth callback redirects back here: pick the session up from the
  // httpOnly cookies and route to the dashboard (or surface the failure).
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const outcome = params.get("oauth");

    if (!outcome) return;

    // Strip the query param so refreshes/bookmarks don't replay it.
    navigate(location.pathname, { replace: true });

    if (outcome === "failed") {
      setOauthError({ message: "Social login failed. Please try again." });
      return;
    }

    if (outcome.endsWith("_success")) {
      setOauthPending(true);
      setOauthError(null);
      getCurrentUser()
        .then((data) => {
          login(data.user);
          navigate("/dashboard", { replace: true });
        })
        .catch(() => {
          setOauthError({ message: "Social login failed. Please try again." });
        })
        .finally(() => setOauthPending(false));
    }
  }, [location.search, location.pathname, navigate, login]);

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

      <AuthErrorBanner error={error || oauthError} />

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
        disabled={isLoading || oauthPending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? "Logging in..." : oauthPending ? "Finishing social login..." : "Log in"}
      </button>

      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-200" />
        or
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <SocialLoginButtons disabled={isLoading || oauthPending} />

      <p className="text-center text-sm text-gray-600">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="text-blue-600 hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
