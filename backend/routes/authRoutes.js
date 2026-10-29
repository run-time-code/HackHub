const express = require("express");
const { rateLimit } = require("express-rate-limit");
const {
    register,
    login,
    refresh,
    verifyEmail,
    resendVerificationEmail,
    requestPasswordReset,
    resetPassword,
    logout,
    getCurrentUser
} = require("../controllers/authController");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();
const authenticationRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        error: { message: "Too many authentication requests; try again later" }
    }
});

router.post("/register", authenticationRateLimit, register);
router.post("/login", authenticationRateLimit, login);
router.post("/refresh", authenticationRateLimit, refresh);
router.post("/verify-email", authenticationRateLimit, verifyEmail);
router.post("/resend-verification", authenticationRateLimit, resendVerificationEmail);
router.post("/password/forgot", authenticationRateLimit, requestPasswordReset);
router.post("/password/reset", authenticationRateLimit, resetPassword);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, getCurrentUser);

module.exports = router;
