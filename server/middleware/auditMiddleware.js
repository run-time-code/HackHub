const logAuditEvent = require("../utils/auditLogger");

const AUTH_EVENTS = [
    {
        method: "POST",
        path: "/api/auth/register",
        event: "auth.register"
    },
    {
        method: "POST",
        path: "/api/auth/login",
        event: "auth.login"
    },
    {
        method: "POST",
        path: "/api/auth/logout",
        event: "auth.logout"
    },
    {
        method: "POST",
        path: "/api/auth/refresh",
        event: "auth.refresh"
    },
    {
        method: "GET",
        path: "/api/auth/verify-email",
        event: "auth.email_verification"
    },
    {
        method: "POST",
        path: "/api/auth/resend-verification",
        event: "auth.resend_verification"
    },
    {
        method: "POST",
        path: "/api/auth/forgot-password",
        event: "auth.forgot_password"
    },
    {
        method: "POST",
        path: "/api/auth/reset-password",
        event: "auth.reset_password"
    }
];

const auditMiddleware = (req, res, next) => {
    const requestPath = req.path.replace(/\/+$/, "") || "/";

    let eventDefinition = AUTH_EVENTS.find(
        item =>
            item.method === req.method &&
            item.path === requestPath
    );

    // Record OAuth callback outcomes.
    if (
        req.method === "GET" &&
        /^\/api\/auth\/(google|github)\/callback$/.test(
            requestPath
        )
    ) {
        const provider = requestPath.includes("/google/")
            ? "google"
            : "github";

        eventDefinition = {
            event: `auth.oauth.${provider}`
        };
    }

    if (!eventDefinition) {
        return next();
    }

    res.on("finish", () => {
        const statusCode = res.statusCode;
        const success =
            statusCode >= 200 && statusCode < 400;

        const submittedEmail =
            typeof req.body?.email === "string"
                ? req.body.email.trim().toLowerCase().slice(0, 254)
                : null;

        const authenticatedUserId =
            req.user?._id || req.user?.id || null;

        // Record only a generic outcome, never tokens or passwords.
        let details = null;

        if (!success) {
            if (statusCode === 401) {
                details = "Authentication failed";
            } else if (statusCode === 403) {
                details = "Request forbidden";
            } else if (statusCode === 429) {
                details = "Rate limit exceeded";
            } else if (statusCode >= 500) {
                details = "Server error";
            } else {
                details = "Request unsuccessful";
            }
        }

        void logAuditEvent({
            event: eventDefinition.event,
            userId: authenticatedUserId,
            email: submittedEmail,
            success,
            statusCode,
            ip: req.ip,
            userAgent: req.get("user-agent") || null,
            details
        });
    });

    next();
};

module.exports = auditMiddleware;