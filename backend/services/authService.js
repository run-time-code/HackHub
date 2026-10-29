const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_LIFETIME = "15m";
const REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const TOKEN_ISSUER = "hackhub-api";
const TOKEN_AUDIENCE = "hackhub-client";

const getAccessTokenSecret = () => {
    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
        throw new Error(
            "JWT_ACCESS_SECRET must be set to a secret containing at least 32 bytes"
        );
    }

    return secret;
};

const createAccessToken = (user) =>
    jwt.sign(
        { role: user.role },
        getAccessTokenSecret(),
        {
            algorithm: "HS256",
            subject: String(user._id),
            issuer: TOKEN_ISSUER,
            audience: TOKEN_AUDIENCE,
            expiresIn: ACCESS_TOKEN_LIFETIME
        }
    );

const verifyAccessToken = (token) =>
    jwt.verify(token, getAccessTokenSecret(), {
        algorithms: ["HS256"],
        issuer: TOKEN_ISSUER,
        audience: TOKEN_AUDIENCE
    });

const createRefreshToken = () => {
    const token = crypto.randomBytes(48).toString("base64url");

    return {
        token,
        hash: crypto.createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS)
    };
};

const createActionToken = () => {
    const token = crypto.randomBytes(32).toString("base64url");

    return {
        token,
        hash: crypto.createHash("sha256").update(token).digest("hex")
    };
};

const hashRefreshToken = (token) =>
    crypto.createHash("sha256").update(token).digest("hex");

module.exports = {
    createAccessToken,
    verifyAccessToken,
    createRefreshToken,
    createActionToken,
    hashRefreshToken,
    getAccessTokenSecret
};
