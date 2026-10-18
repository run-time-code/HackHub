const express = require("express");
const passport = require("passport");

const {
    generateCsrfToken,
    doubleCsrfProtection
} = require("../middleware/csrfMiddleware");

const {
    register,
    login,
    refreshToken,
    logout,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword
} = require("../controllers/authController");

const {
    completeOAuthLogin
} = require("../controllers/oauthController");

const {
    requireAuth,
    requireRole
} = require("../middleware/authMiddleware");

const {
    getMyProfile
} = require("../controllers/userController");

const {
    loginLimiter,
    registerLimiter,
    resendVerificationLimiter,
    passwordResetLimiter,
    refreshTokenLimiter,
    oauthStartLimiter,
    csrfTokenLimiter,
    issueOAuthState,
    verifyOAuthState
} = require("../middleware/rateLimitMiddleware");

const router = express.Router();

// Social login start routes: respond with a clear 503 when the provider
// is not configured (deployed envs without OAuth credentials) instead of
// letting passport fail with a confusing 401.
function requireOAuthConfig(provider) {
    return (req, res, next) => {
        const prefix = provider === "google" ? "GOOGLE" : "GITHUB";

        if (
            !process.env[`${prefix}_CLIENT_ID`] ||
            !process.env[`${prefix}_CLIENT_SECRET`]
        ) {
            return res.status(503).json({
                message: `${provider} login is not configured`
            });
        }

        return next();
    };
}

// Generate CSRF token
router.get("/csrf-token", csrfTokenLimiter, (req, res) => {
    const csrfToken = generateCsrfToken(req, res);

    res.status(200).json({
        csrfToken
    });
});

// Google OAuth
router.get(
    "/google",
    oauthStartLimiter,
    issueOAuthState,
    requireOAuthConfig("google"),
    (req, res, next) =>
        passport.authenticate("google", {
            scope: ["profile", "email"],
            session: false,
            state: req.oauthState
        })(req, res, next)
);

router.get(
    "/google/callback",
    oauthStartLimiter,
    verifyOAuthState,
    passport.authenticate("google", {
        session: false,
        failureRedirect: "/api/auth/oauth-failed"
    }),
    completeOAuthLogin
);

// GitHub OAuth
router.get(
    "/github",
    oauthStartLimiter,
    issueOAuthState,
    requireOAuthConfig("github"),
    (req, res, next) =>
        passport.authenticate("github", {
            scope: ["user:email"],
            session: false,
            state: req.oauthState
        })(req, res, next)
);

router.get(
    "/github/callback",
    oauthStartLimiter,
    verifyOAuthState,
    passport.authenticate("github", {
        session: false,
        failureRedirect: "/api/auth/oauth-failed"
    }),
    completeOAuthLogin
);

// OAuth failure
router.get("/oauth-failed", (req, res) => {
    // Browser flows get sent back to the SPA; API clients get JSON.
    if ((req.get("accept") || "").includes("text/html")) {
        const frontendUrl = (
            process.env.FRONTEND_URL || "http://localhost:5173"
        ).replace(/\/$/, "");

        return res.redirect(`${frontendUrl}/?oauth=failed`);
    }

    return res.status(401).json({
        message:
            "Social login failed. Check your provider account and verified email."
    });
});

// Registration and login
router.post(
    "/register",
    registerLimiter,
    doubleCsrfProtection,
    register
);

router.post(
    "/login",
    loginLimiter,
    doubleCsrfProtection,
    login
);

// Token management
router.post(
    "/refresh",
    refreshTokenLimiter,
    doubleCsrfProtection,
    refreshToken
);

router.post(
    "/logout",
    doubleCsrfProtection,
    logout
);

// Email verification
router.get("/verify-email", verifyEmail);

// Resend verification email
router.post(
    "/resend-verification",
    resendVerificationLimiter,
    doubleCsrfProtection,
    resendVerification
);

// Password reset
router.post(
    "/forgot-password",
    passwordResetLimiter,
    doubleCsrfProtection,
    forgotPassword
);

router.post(
    "/reset-password",
    passwordResetLimiter,
    doubleCsrfProtection,
    resetPassword
);

// Session restore for the SPA (mirrors /users/me via the auth router).
router.get("/me", requireAuth, getMyProfile);

// Protected route
router.get(
    "/protected",
    requireAuth,
    (req, res) => {
        res.json({
            message: "You accessed a protected route",
            user: req.user
        });
    }
);

// Admin-only route
router.get(
    "/admin-test",
    requireAuth,
    requireRole("admin"),
    (req, res) => {
        res.json({
            message: "Admin access granted",
            user: req.user
        });
    }
);

module.exports = router;