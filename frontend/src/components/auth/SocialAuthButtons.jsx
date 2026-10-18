import { useState } from "react";
import { startOAuth } from "../../lib/api/auth";

const PROVIDERS = [
  { id: "google", label: "Google", Mark: GoogleMark },
  { id: "github", label: "GitHub", Mark: GitHubMark },
];

function GoogleMark() {
  return (
    <svg className="provider-mark" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11c-.5 2.5-1.9 4.6-4.1 6v5h6.6c3.9-3.6 6.1-8.8 6.1-14.7Z" />
      <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2A20 20 0 0 0 24 44Z" />
      <path fill="#FBBC05" d="M12.6 27.8a12 12 0 0 1 0-7.6V15H5.8a20 20 0 0 0 0 18l6.8-5.2Z" />
      <path fill="#EA4335" d="M24 11.8c3 0 5.7 1 7.8 3.1l5.8-5.8A19.4 19.4 0 0 0 24 4 20 20 0 0 0 5.8 15l6.8 5.2c1.6-4.8 6.1-8.4 11.4-8.4Z" />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg className="provider-mark github-provider-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 .9a11.1 11.1 0 0 0-3.5 21.6c.6.1.8-.3.8-.6v-2.1c-3.1.7-3.8-1.3-3.8-1.3-.5-1.3-1.2-1.7-1.2-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 1.7 2.6 1.2 3.2.9.1-.7.4-1.2.7-1.5-2.5-.3-5.1-1.3-5.1-5.5 0-1.2.4-2.1 1.2-2.9-.1-.3-.5-1.4.1-2.9 0 0 1-.3 3 1.1a10.5 10.5 0 0 1 5.5 0c2.1-1.4 3-1.1 3-1.1.6 1.5.2 2.6.1 2.9.7.8 1.2 1.7 1.2 2.9 0 4.2-2.6 5.2-5.1 5.5.4.3.8 1 .8 2v3.2c0 .3.2.7.8.6A11.1 11.1 0 0 0 12 .9Z" />
    </svg>
  );
}

function getAuthorizationUrl(response) {
  const value = response?.authorizationUrl;
  if (typeof value !== "string") {
    throw new Error("The sign-in service did not return an authorization URL.");
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("The sign-in service returned an invalid authorization URL.");
  }
  const localHttpAllowed = url.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(url.hostname) &&
    window.location.protocol === "http:";
  if (url.protocol !== "https:" && !localHttpAllowed) {
    throw new Error("The sign-in service returned an insecure authorization URL.");
  }
  return url.href;
}

export default function SocialAuthButtons() {
  const [loadingProvider, setLoadingProvider] = useState("");
  const [error, setError] = useState("");

  async function continueWith(provider) {
    setLoadingProvider(provider);
    setError("");
    try {
      const response = await startOAuth(provider);
      window.location.assign(getAuthorizationUrl(response));
    } catch (requestError) {
      setError(`${provider === "google" ? "Google" : "GitHub"} sign-in could not start: ${requestError.message}`);
      setLoadingProvider("");
    }
  }

  return (
    <div className="social-auth">
      <div className="auth-divider"><span>OR USE YOUR DEVELOPER ID</span></div>
      <div className="grid grid-cols-2 gap-2">
        {PROVIDERS.map(({ id, label, Mark }) => (
          <button
            key={id}
            type="button"
            onClick={() => continueWith(id)}
            disabled={Boolean(loadingProvider)}
            className="social-auth-button"
          >
            <Mark />
            <span>{loadingProvider === id ? "Connecting…" : label}</span>
          </button>
        ))}
      </div>
      {loadingProvider && <p role="status" className="sr-only">Connecting to {loadingProvider} sign-in…</p>}
      {error && <p role="alert" className="mt-3 text-sm text-rose-800">{error}</p>}
      <p className="mt-2 text-center text-xs text-slate-500">Uses your provider account. HackHub never sees your password.</p>
    </div>
  );
}
