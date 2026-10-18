const { doubleCsrf } = require("csrf-csrf");

const isProduction = process.env.NODE_ENV === "production";
const isStaging = process.env.NODE_ENV === "staging";

// The SPA runs on a different origin than the API on every deployed
// environment (production + staging), so the CSRF cookie must be
// `SameSite=None; Secure` there. Local dev/CI keep Lax + non-secure so
// `npm start` / `npm test` work over plain http://localhost.
const isDeployed = isProduction || isStaging;

// Fail fast on real deployments that forgot the secret, but fall back to a
// deterministic value for local dev and CI so `npm start` / `npm test` boot.
const csrfSecret =
    process.env.CSRF_SECRET ||
    (isDeployed
        ? null
        : "dev-only-insecure-csrf-secret");

if (!csrfSecret) {
    throw new Error("CSRF_SECRET is missing from environment variables");
}

const {
    generateCsrfToken,
    doubleCsrfProtection
} = doubleCsrf({
    getSecret: () => csrfSecret,

    // Keep the identifier stable between token generation
    // and validation, including before and after login.
    getSessionIdentifier: (req) => req.ip,

    cookieName:
        isDeployed
            ? "__Host-psifi.x-csrf-token"
            : "psifi.x-csrf-token",

    cookieOptions: {
        httpOnly: true,

        // The SPA runs on a different origin than the API when deployed, so
        // a SameSite=Lax cookie would never be sent on cross-site XHR and
        // every protected request would fail CSRF validation.
        sameSite: isDeployed ? "none" : "lax",
        path: "/",
        secure: isDeployed
    },

    size: 32,

    getCsrfTokenFromRequest: (req) =>
        req.headers["x-csrf-token"]
});

module.exports = {
    generateCsrfToken,
    doubleCsrfProtection
};