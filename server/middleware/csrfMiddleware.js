const { doubleCsrf } = require("csrf-csrf");

const isProduction = ["production", "staging"].includes(process.env.NODE_ENV);
const csrfSecret = process.env.CSRF_SECRET || (isProduction ? null : "hackhub-local-csrf-secret-change-before-deploy");

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
        process.env.NODE_ENV === "production"
            ? "__Host-psifi.x-csrf-token"
            : "psifi.x-csrf-token",

    cookieOptions: {
        httpOnly: true,
        sameSite: isProduction ? "none" : "strict",
        path: "/",
        secure: process.env.NODE_ENV === "production"
    },

    size: 32,

    getCsrfTokenFromRequest: (req) =>
        req.headers["x-csrf-token"]
});

module.exports = {
    generateCsrfToken,
    doubleCsrfProtection
};