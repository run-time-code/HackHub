const { doubleCsrf } = require("csrf-csrf");

const isProduction = process.env.NODE_ENV === "production";

const isStrictEnv =
    isProduction || process.env.NODE_ENV === "staging";

// Fail fast on real deployments that forgot the secret, but fall back to a
// deterministic value for local dev and CI so `npm start` / `npm test` boot.
const csrfSecret =
    process.env.CSRF_SECRET ||
    (isStrictEnv
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
        isProduction
            ? "__Host-psifi.x-csrf-token"
            : "psifi.x-csrf-token",

    cookieOptions: {
        httpOnly: true,

        // The SPA runs on a different origin than the API in production, so
        // a SameSite=Strict cookie would never be sent on cross-site XHR and
        // every protected request would fail CSRF validation.
        sameSite: isProduction ? "none" : "lax",
        path: "/",
        secure: isProduction
    },

    size: 32,

    getCsrfTokenFromRequest: (req) =>
        req.headers["x-csrf-token"]
});

module.exports = {
    generateCsrfToken,
    doubleCsrfProtection
};