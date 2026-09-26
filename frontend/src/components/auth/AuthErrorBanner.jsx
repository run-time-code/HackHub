const MESSAGES = {
  EMAIL_UNVERIFIED: "Please verify your email before logging in.",
  RATE_LIMITED: "Too many attempts. Please wait a moment and try again.",
  INVALID_CREDENTIALS: "Incorrect email or password.",
};

export default function AuthErrorBanner({ error }) {
  if (!error) return null;
  const message = MESSAGES[error.code] || error.message || "Something went wrong.";

  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </div>
  );
}