const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Fall back to JWT_SECRET so local dev and CI keep working; the
// authMiddleware verifies against both secrets (mirrors it here).
const accessTokenSecret = () =>
    process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;

const generateAccessToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            email: user.email,
            role: user.role,
            tokenVersion: user.tokenVersion ?? 0
        },
        accessTokenSecret(),
        {
            expiresIn: "15m"
        }
    );
};

const generateRefreshToken = () => {
    return crypto.randomBytes(64).toString("hex");
};

const generateEmailVerificationToken = () => {
    return crypto.randomBytes(32).toString("hex");
};

const hashToken = (token) => {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    generateEmailVerificationToken,
    hashToken
};