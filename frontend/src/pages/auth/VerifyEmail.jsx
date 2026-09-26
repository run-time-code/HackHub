import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { verifyEmail } from "../../lib/api/auth";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const pending = searchParams.get("pending");

  const [status, setStatus] = useState(pending ? "pending" : "verifying");

  useEffect(() => {
    if (!token) return;
    setStatus("verifying");
    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm text-center">
        {status === "pending" && (
          <>
            <h1 className="text-xl font-semibold text-gray-900">Check your inbox</h1>
            <p className="mt-2 text-sm text-gray-600">
              We've sent a verification link to your email. Click it to activate your account.
            </p>
          </>
        )}

        {status === "verifying" && <p className="text-sm text-gray-600">Verifying your email...</p>}

        {status === "success" && (
          <>
            <h1 className="text-xl font-semibold text-gray-900">Email verified 🎉</h1>
            <p className="mt-2 text-sm text-gray-600">You can now log in to your account.</p>
            <Link to="/login" className="mt-4 inline-block text-blue-600 hover:underline">
              Go to login
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-xl font-semibold text-gray-900">Verification failed</h1>
            <p className="mt-2 text-sm text-gray-600">
              This link may have expired. Please request a new one from the login page.
            </p>
            <Link to="/login" className="mt-4 inline-block text-blue-600 hover:underline">
              Back to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}