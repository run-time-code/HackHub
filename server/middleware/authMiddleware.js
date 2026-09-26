const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    const token = req.cookies.accessToken;

    if (!token) {
        console.log("Authentication required");
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

module.exports = authMiddleware;