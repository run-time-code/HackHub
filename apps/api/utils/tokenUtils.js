const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Fall back to JWT_SECRET so local dev and CI keep working; the
// authMiddleware verifies against both secrets (mirrors it here).
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
    REFRESH_TOKEN_TTL_MS,
    generateAccessToken,
    generateRefreshToken,
    generateEmailVerificationToken,
    hashToken
};