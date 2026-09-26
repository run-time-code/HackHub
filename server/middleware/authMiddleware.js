const jwt = require("jsonwebtoken");

const requireAuth = (req, res, next) => {
    const token = req.cookies.accessToken;

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

        req.user = decoded;

        next();

    } catch (error) {
        console.log("Access token error:", error.message);

        return res.status(401).json({
            message: "Invalid or expired access token"
        });
    }
};

const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            console.log("Authentication required");
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            console.log("Access forbidden");
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