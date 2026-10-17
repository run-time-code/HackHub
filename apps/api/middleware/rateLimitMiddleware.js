const crypto = require("crypto");

const rateLimit = require("express-rate-limit");

const isProduction = process.env.NODE_ENV === "production";

const OAUTH_STATE_COOKIE = "oauth_state";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

// OAuth login-CSRF protection (the `state` parameter, stateless edition):
// the browser gets an unguessable random value in a signed httpOnly cookie
// before leaving for Google/GitHub, and the callback only proceeds when the
// query-string value matches it. Without this, an attacker can complete the
// provider callback in the victim's browser with the attacker's own
// authorization code, linking the attacker's provider account to the
// victim's HackHub account — then log in as the victim.
const oauthStateCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/api/auth",
    maxAge: OAUTH_STATE_TTL_MS,
    signed: true
};

const issueOAuthState = (req, res, next) => {
    const state = crypto.randomBytes(32).toString("hex");

    res.cookie(OAUTH_STATE_COOKIE, state, oauthStateCookieOptions);

    // Hand the same value to passport so it is sent as the `state` query
    // parameter to the provider.
    req.oauthState = state;

    next();
};

const verifyOAuthState = (req, res, next) => {
    const fromCookie = req.signedCookies?.[OAUTH_STATE_COOKIE];
    const fromQuery =
        typeof req.query.state === "string" ? req.query.state : null;

    res.clearCookie(OAUTH_STATE_COOKIE, {
        ...oauthStateCookieOptions,
        maxAge: undefined
    });

    if (
        !fromCookie ||
        !fromQuery ||
        fromCookie.length !== fromQuery.length ||
        !crypto.timingSafeEqual(
            Buffer.from(fromCookie),
            Buffer.from(fromQuery)
        )
    ) {
        // Keep browser and API behavior consistent with /oauth-failed.
        if ((req.get("accept") || "").includes("text/html")) {
            const frontendUrl = (
                process.env.FRONTEND_URL || "http://localhost:5173"
            ).replace(/\/$/, "");

            return res.redirect(`${frontendUrl}/?oauth=failed`);
        }

        return res.status(403).json({
            message:
                "Social login verification failed. Please try again."
        });
    }

    next();
};

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

const oauthStartLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: {
        message: "Too many social login attempts. Please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false
});

const csrfTokenLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    message: {
        message: "Too many CSRF token requests. Please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    loginLimiter,
    registerLimiter,
    resendVerificationLimiter,
    passwordResetLimiter,
    refreshTokenLimiter,
    oauthStartLimiter,
    csrfTokenLimiter,
    issueOAuthState,
    verifyOAuthState
};