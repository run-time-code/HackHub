// Social-login entry points. These are plain same-window navigations (not
// fetch): the backend issues the OAuth `state` cookie on this request, the
// browser leaves for Google/GitHub, and the callback redirects back to the
// SPA where the session is picked up from the httpOnly cookies.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

function startOAuth(provider) {
  window.location.href = `${BASE_URL}/auth/${provider}`;
}

export default function SocialLoginButtons({ disabled = false }) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => startOAuth("google")}
        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
      >
        Continue with Google
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => startOAuth("github")}
        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
      >
        Continue with GitHub
      </button>
    </div>
  );
}
