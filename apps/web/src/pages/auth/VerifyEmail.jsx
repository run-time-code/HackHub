import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { verifyEmail } from "../../lib/api/auth";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const pending = searchParams.get("pending");

  const [verification, setVerification] = useState(null);
  const status = !token ? (pending ? "pending" : "error") :
    verification?.token === token ? verification.status : "verifying";

  useEffect(() => {
    if (!token) return undefined;
    let isCurrent = true;
    verifyEmail(token)
      .then(() => {
        if (isCurrent) setVerification({ token, status: "success", error: null });
      })
      .catch((error) => {
        if (isCurrent) setVerification({ token, status: "error", error: error.message });
      });
    return () => { isCurrent = false; };
  }, [token]);

  return (
    <div className="w-full max-w-sm text-center">
      {status === "pending" && (
        <>
          <h1 className="text-xl font-semibold text-gray-900">Check your inbox</h1>
          <p className="mt-2 text-sm text-gray-600">
            We've sent a verification link to your email. Click it to activate your account.
          </p>
        </>
      )}

      {status === "verifying" && <p className="text-sm text-gray-600" role="status">Verifying your email...</p>}

      {status === "success" && (
        <>
          <h1 className="text-xl font-semibold text-gray-900">Email verified 🎉</h1>
          <p className="mt-2 text-sm text-gray-600">You can now log in to your account.</p>
          <Link to="/auth?panel=login" className="mt-4 inline-flex min-h-11 items-center text-amber-800 hover:underline">
            Go to login
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <h1 className="text-xl font-semibold text-gray-900">Verification failed</h1>
          <p className="mt-2 text-sm text-gray-600">
            {verification?.token === token && verification.error
              ? verification.error
              : "This link may have expired. Please request a new one from the login page."}
          </p>
          <Link to="/auth?panel=login" className="mt-4 inline-flex min-h-11 items-center text-amber-800 hover:underline">
            Back to login
          </Link>
        </>
      )}
    </div>
  );
}
