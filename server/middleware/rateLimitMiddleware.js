const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        message: "Too many login attempts. Please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: {
        message: "Too many registration attempts. Please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false
});

const resendVerificationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: {
        message: "Too many verification email requests. Please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false
});

const passwordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        message: "Too many password reset requests. Please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false
});

const refreshTokenLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: {
        message: "Too many token refresh requests. Please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    loginLimiter,
    registerLimiter,
    resendVerificationLimiter,
    passwordResetLimiter,
    refreshTokenLimiter
};