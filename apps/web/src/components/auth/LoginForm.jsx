import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { loginSchema } from "../../lib/validation/authSchemas";
import { loginUser, getCurrentUser } from "../../lib/api/auth";
import { useAuthMutation } from "../../lib/hooks/useAuthMutation";
import { useAuth } from "../../context/auth-context";
import PasswordInput from "./PasswordInput";
import AuthErrorBanner from "./AuthErrorBanner";
import SocialAuthButtons from "./SocialAuthButtons";

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

  // The OAuth outcome is handed to the render phase via navigation state
  // (see the effect below), so no setState calls are needed here.
  const oauthError = location.state?.oauthError
    ? { message: location.state.oauthError }
    : null;
  const oauthPending = Boolean(location.state?.oauthPending);

  // The OAuth callback redirects back here: pick the session up from the
  // httpOnly cookies and route to the dashboard (or surface the failure).
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const outcome = params.get("oauth");

    if (!outcome) return;

    // Strip the query param so refreshes/bookmarks don't replay it.
    if (outcome === "failed") {
      navigate(location.pathname, {
        replace: true,
        state: { oauthError: "Social login failed. Please try again." },
      });
      return;
    }

    if (outcome.endsWith("_success")) {
      navigate(location.pathname, {
        replace: true,
        state: { oauthPending: true },
      });

      getCurrentUser()
        .then((data) => {
          login(data.user);
          navigate("/app?section=dashboard", { replace: true });
        })
        .catch(() => {
          navigate(location.pathname, {
            replace: true,
            state: { oauthError: "Social login failed. Please try again." },
          });
        });

      return;
    }

    navigate(location.pathname, { replace: true });
  }, [location.search, location.pathname, navigate, login]);

  async function onSubmit(values) {
    try {
      const result = await mutate(values);
      login(result.user);
      const redirectTo = location.state?.from
        ? `${location.state.from.pathname}${location.state.from.search || ""}`
        : "/app?section=dashboard";
      navigate(redirectTo, { replace: true });
    } catch {
      // error already captured by useAuthMutation
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full max-w-sm flex-col gap-4">
      <div>
        <p className="field-label">YOUR WORKBENCH</p>
        <h2 className="auth-panel-title">Welcome back.</h2>
        <p className="mt-1 text-sm text-slate-600">Sign in to pick up where you left off.</p>
      </div>

      <AuthErrorBanner error={error || oauthError} />
      <SocialAuthButtons disabled={isLoading || oauthPending} />
      <div className="auth-divider"><span>OR EMAIL AND PASSWORD</span></div>

      <div className="flex flex-col gap-1">
        <label htmlFor="login-email" className="text-sm font-medium text-gray-700">Email</label>
        <input
          id="login-email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "login-email-error" : undefined}
          className={`rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 ${
            errors.email ? "border-red-500" : "border-gray-300"
          }`}
          {...register("email")}
        />
        {errors.email && <span id="login-email-error" className="text-xs text-red-600">{errors.email.message}</span>}
      </div>

      <PasswordInput
        label="Password"
        placeholder="••••••••"
        error={errors.password}
        registration={register("password")}
      />

      <div className="text-right text-sm">
        <Link to="/auth?panel=forgot" className="text-amber-800 hover:underline">
          Forgot password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={isLoading || oauthPending}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
      >
        {isLoading ? "Logging in..." : oauthPending ? "Finishing social login..." : "Log in"}
      </button>

      <p className="text-center text-sm text-gray-600">
        Don't have an account?{" "}
        <Link to="/auth?panel=register" className="font-semibold text-amber-800 hover:underline">
          Make an account
        </Link>
      </p>
    </form>
  );
}
