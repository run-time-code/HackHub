const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logger = require("../src/utils/logger");

// Structured logger (avoids console.* which bypasses pino-http).
const logger = require("../../src/utils/logger");

// Accept the httpOnly accessToken cookie as well as an Authorization:
// Bearer header so API clients and tests can authenticate too.
const extractToken = (req) => {
    const header = req.headers.authorization;

    if (typeof header === "string" && header.startsWith("Bearer ")) {
        return header.slice("Bearer ".length).trim();
    }

    return req.cookies?.accessToken;
};

// Single canonical issuer secret. The legacy ACCESS_TOKEN_SECRET is
// deprecated: keeping both in the verification loop would let a token
// minted with one validate against a different secret.
const secrets = () => [process.env.JWT_SECRET];

const requireAuth = async (req, res, next) => {
    const token = extractToken(req);

    if (!token) {
        return res.status(401).json({
            message: "Authentication required"
        });
    }

    try {
        let decoded = null;
        let lastError = null;

        for (const secret of secrets()) {
            try {
                decoded = jwt.verify(token, secret);
                break;
            } catch (error) {
                lastError = error;
            }
        }

        if (!decoded) {
            throw lastError || new Error("Invalid token");
        }

        const user = await User.findById(decoded.id)
    .select("_id email role deletedAt tokenVersion banned");

if (!user || user.deletedAt) {
    return res.status(401).json({
        message: "Account not found or deactivated"
    });
}

if (user.banned === true) {
    return res.status(403).json({
        message: "Your account has been banned"
    });
}

        const tokenVersion = decoded.tokenVersion ?? 0;
        const currentTokenVersion = user.tokenVersion ?? 0;

        if (tokenVersion !== currentTokenVersion) {
            return res.status(401).json({
                message: "Session revoked. Please log in again."
            });
        }

        req.user = {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            tokenVersion: currentTokenVersion
        };

        next();
    } catch (error) {
        if (error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError") {
            return res.status(401).json({
                message: "Invalid or expired access token"
            });
        }

        
        logger.error({ err: error }, "Authentication error");

        return res.status(500).json({
            message: "Authentication error"
        });
    }
};

const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Access forbidden"
            });
        }

        next();
    };
};

module.exports = {
    requireAuth,
    requireRole
};