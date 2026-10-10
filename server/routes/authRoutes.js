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
    loginLimiter,
    registerLimiter,
    resendVerificationLimiter,
    passwordResetLimiter,
    refreshTokenLimiter
} = require("../middleware/rateLimitMiddleware");

const router = express.Router();

function startOAuth(provider, options) {
    return (req, res, next) => {
        const prefix = provider === "google" ? "GOOGLE" : "GITHUB";
        if (
            !process.env[`${prefix}_CLIENT_ID`] ||
            !process.env[`${prefix}_CLIENT_SECRET`] ||
            !process.env[`${prefix}_CALLBACK_URL`]
        ) {
            return res.status(503).json({ message: `${provider} login is not configured` });
        }
        return passport.authenticate(provider, options)(req, res, next);
    };
}

// Generate CSRF token
router.get("/csrf-token", (req, res) => {
    const csrfToken = generateCsrfToken(req, res);

    res.status(200).json({
        csrfToken
    });
});

// Google OAuth
router.get(
    "/google",
    startOAuth("google", {
        scope: ["profile", "email"],
        session: false
    })
);

router.get(
    "/google/callback",
    startOAuth("google", {
        session: false,
        failureRedirect: "/api/auth/oauth-failed"
    }),
    completeOAuthLogin
);

// GitHub OAuth
router.get(
    "/github",
    startOAuth("github", {
        scope: ["user:email"],
        session: false
    })
);

router.get(
    "/github/callback",
    startOAuth("github", {
        session: false,
        failureRedirect: "/api/auth/oauth-failed"
    }),
    completeOAuthLogin
);

// OAuth failure
router.get("/oauth-failed", (req, res) => {
    res.status(401).json({
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