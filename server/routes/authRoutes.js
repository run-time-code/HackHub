const express = require("express");
const passport = require("passport");

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
    resendVerificationLimiter
} = require("../middleware/rateLimitMiddleware");

const router = express.Router();

// Google OAuth
router.get(
    "/google",
    passport.authenticate("google", {
        scope: ["profile", "email"],
        session: false
    })
);

router.get(
    "/google/callback",
    passport.authenticate("google", {
        session: false,
        failureRedirect: "/api/auth/oauth-failed"
    }),
    completeOAuthLogin
);

// GitHub OAuth
router.get(
    "/github",
    passport.authenticate("github", {
        scope: ["user:email"],
        session: false
    })
);

router.get(
    "/github/callback",
    passport.authenticate("github", {
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

// Existing authentication routes
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);

router.get("/verify-email", verifyEmail);

router.post(
    "/resend-verification",
    resendVerificationLimiter,
    resendVerification
);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected route
router.get("/protected", requireAuth, (req, res) => {
    res.json({
        message: "You accessed a protected route",
        user: req.user
    });
});

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