const jwt = require("jsonwebtoken");
const User = require("../models/User");

const requireAuth = async (req, res, next) => {
    const token = req.cookies?.accessToken;

    if (!token) {
        return res.status(401).json({
            message: "Authentication required"
        });
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET
        );

        const user = await User.findById(decoded.id)
            .select("_id email role deletedAt tokenVersion");

        if (!user || user.deletedAt) {
            return res.status(401).json({
                message: "Account not found or deactivated"
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

        console.error("Authentication error:", error);

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