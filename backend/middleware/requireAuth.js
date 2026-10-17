const mongoose = require("mongoose");
const { verifyAccessToken } = require("../services/authService");

const requireAuth = (req, res, next) => {
    const authorization = req.get("authorization") || "";
    const match = authorization.match(/^Bearer\s+([^\s]+)$/i);

    if (!match) {
        return res.status(401).json({
            success: false,
            error: { message: "A valid bearer access token is required" }
        });
    }

    try {
        const payload = verifyAccessToken(match[1]);

        if (
            typeof payload === "string" ||
            typeof payload.sub !== "string" ||
            !mongoose.isValidObjectId(payload.sub)
        ) {
            return res.status(401).json({
                success: false,
                error: { message: "Invalid access token" }
            });
        }

        req.user = {
            id: payload.sub,
            role: payload.role
        };
        return next();
    } catch (error) {
        if (error.message.startsWith("JWT_ACCESS_SECRET")) {
            console.error("Authentication configuration error:", error.message);
            return res.status(500).json({
                success: false,
                error: { message: "Authentication is not configured correctly" }
            });
        }

        return res.status(401).json({
            success: false,
            error: {
                message: error.name === "TokenExpiredError"
                    ? "Access token has expired"
                    : "Invalid access token"
            }
        });
    }
};

module.exports = requireAuth;
