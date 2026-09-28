const express = require("express");
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
    requireAuth,
    requireRole
} = require("../middleware/authMiddleware");

const router = express.Router();
const {
    resendVerificationLimiter
} = require("../middleware/rateLimitMiddleware");

router.post("/register", register);
router.post("/login" , login);
router.post("/refresh", refreshToken);
router.post("/logout" , logout);
router.get("/verify-email", verifyEmail);
router.post(
    "/resend-verification",
    resendVerificationLimiter,
    resendVerification
);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password",resetPassword);

router.get("/protected", requireAuth, (req, res) => {
    res.json({
        message: "You accessed a protected route",
        user: req.user
    });
});

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
