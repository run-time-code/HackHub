const bcrypt = require("bcryptjs");
const validator = require("validator");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("../models/User");
const config = require("../src/config");
const logger = require("../src/utils/logger");

const {
    sendVerificationEmail,
    sendPasswordResetEmail
} = require("../utils/emailUtils");

const {
    REFRESH_TOKEN_TTL_MS,
    generateAccessToken,
    generateRefreshToken,
    generateEmailVerificationToken,
    hashToken
} = require("../utils/tokenUtils");

const {
    accessCookieOptions,
    refreshCookieOptions
} = require("../utils/cookieUtils");

function logAuthFailure(operation, error) {
    logger.error(
        { operation, errorType: error?.name || "Error" },
        "Authentication operation failed"
    );
}

function hasControlCharacters(value) {
    return [...value].some((character) => {
        const code = character.charCodeAt(0);
        return code <= 31 || code === 127;
    });
}

// ==============================
// REGISTER
// ==============================

const register = async (req, res) => {
    try {
        const body = req.body && typeof req.body === "object" && !Array.isArray(req.body)
            ? req.body
            : {};
        const { name, email, password } = body;

        const normalizedEmail =
            typeof email === "string"
                ? email.trim().toLowerCase()
                : "";
        const normalizedName =
            typeof name === "string"
                ? name.trim()
                : "";

        if (!normalizedName || !normalizedEmail || typeof password !== "string") {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        if (
            normalizedName.length < 2 ||
            normalizedName.length > 80 ||
            hasControlCharacters(normalizedName)
        ) {
            return res.status(400).json({
                message: "Name must be 2 to 80 characters and contain no control characters"
            });
        }

        if (normalizedEmail.length > 254) {
            return res.status(400).json({
                message: "Email address is too long"
            });
        }

        const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/;

        if (
            Buffer.byteLength(password, "utf8") > 72 ||
            !passwordRegex.test(password)
        ) {
            return res.status(400).json({
                message:
                    "Password must be 8 to 72 bytes and contain an uppercase letter, a number, and a special character"
            });
        }

        if (normalizedEmail.length > 254 || !validator.isEmail(normalizedEmail)) {
            return res.status(400).json({
                message: "Invalid email format"
            });
        }

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                message: "User already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate email verification token
        const verificationToken =
            generateEmailVerificationToken();

        const verificationTokenHash =
            hashToken(verificationToken);

        const verificationTokenExpiresAt =
            new Date(Date.now() + 15 * 60 * 1000);

        // Create user as UNVERIFIED
        let user;

        try {
            user = await User.create({
                name: normalizedName,
                email: normalizedEmail,
                password: hashedPassword,
                emailVerified: false,
                emailVerificationTokenHash:
                    verificationTokenHash,
                emailVerificationTokenExpiresAt:
                    verificationTokenExpiresAt
            });
        } catch (createError) {
            // Concurrent registration with the same email.
            if (createError && createError.code === 11000) {
                return res.status(409).json({
                    message: "User already exists"
                });
            }

            throw createError;
        }

        // Local development can skip email verification when transactional
        // email is unavailable. Production still requires a verified inbox.
        if (config.devAutoVerify) {
            user.emailVerified = true;
            user.emailVerificationTokenHash = null;
            user.emailVerificationTokenExpiresAt = null;
            await user.save();

            return res.status(200).json({
                message:
                    "Account created. Email verification is disabled in development; you can log in now.",
                autoVerified: true
            });
        }

        // Send verification email
        try {
            await sendVerificationEmail(
                user.email,
                verificationToken
            );
        } catch (emailError) {
            logAuthFailure("registration_verification_email", emailError);

            // Remove account if verification email could not be sent
            await User.findByIdAndDelete(user._id);

            return res.status(500).json({
                message:
                    "Unable to send verification email. Please try again."
            });
        }

        // Registration is NOT completed yet
        return res.status(200).json({
            message:
                "Verification email sent. Please verify your email to complete registration.",
            autoVerified: false
        });

    } catch (error) {
        logAuthFailure("registration", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};


// ==============================
// VERIFY EMAIL
// ==============================
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token || typeof token !== "string") {
            return res.status(400).json({
                message: "Verification token is required"
            });
        }

        const tokenHash = hashToken(token);

        const user = await User.findOneAndUpdate(
            {
                emailVerificationTokenHash: tokenHash,
                emailVerificationTokenExpiresAt: {
                    $gt: new Date()
                }
            },
            {
                $set: {
                    emailVerified: true,
                    emailVerificationTokenHash: null,
                    emailVerificationTokenExpiresAt: null
                }
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!user) {
            return res.status(400).json({
                message: "Invalid or expired verification token"
            });
        }

        return res.status(200).json({
            message:
                "Email verified successfully. Registration completed. You can now log in."
        });

    } catch (error) {
        logAuthFailure("email_verification", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

// ==============================
// RESEND VERIFICATION
// ==============================

const resendVerification = async (req, res) => {
    try {
        const { email } = req.body || {};

        const normalizedEmail =
            typeof email === "string"
                ? email.trim().toLowerCase()
                : "";

        if (!normalizedEmail) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        if (normalizedEmail.length > 254 || !validator.isEmail(normalizedEmail)) {
            return res.status(400).json({
                message: "Invalid email format"
            });
        }

        const user = await User.findOne({ email: normalizedEmail });

        // Don't reveal whether an account exists, and don't reveal whether
        // an existing account is already verified. Both cases return the
        // same response as the "email sent" path.
        if (!user || user.emailVerified) {
            return res.status(200).json({
                message:
                    "If the account exists, a verification email has been sent"
            });
        }

        const verificationToken =
            generateEmailVerificationToken();

        const verificationTokenHash =
            hashToken(verificationToken);

        const verificationTokenExpiresAt =
            new Date(Date.now() + 15 * 60 * 1000);

        user.emailVerificationTokenHash =
            verificationTokenHash;

        user.emailVerificationTokenExpiresAt =
            verificationTokenExpiresAt;

        await user.save();

        try {
            await sendVerificationEmail(
                user.email,
                verificationToken
            );
        } catch (emailError) {
            logAuthFailure("resend_verification_email", emailError);

            return res.status(500).json({
                message:
                    "Unable to send verification email. Please try again."
            });
        }

        return res.status(200).json({
            message:
                "If the account exists, a verification email has been sent"
        });

    } catch (error) {
        logAuthFailure("resend_verification", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};


// ==============================
// LOGIN
// ==============================


const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

const lockoutResponse = (res, lockUntil) => {
    const retryAfterSeconds = Math.max(
        1,
        Math.ceil((lockUntil.getTime() - Date.now()) / 1000)
    );

    res.set("Retry-After", String(retryAfterSeconds));

    return res.status(423).json({
        message:
            "Account temporarily locked due to failed login attempts. Please try again later.",
        retryAfterSeconds
    });
};

const login = async (req, res) => {
    try {
        const body = req.body && typeof req.body === "object" && !Array.isArray(req.body)
            ? req.body
            : {};
        const email =
            typeof body.email === "string"
                ? body.email.trim().toLowerCase()
                : "";

        const { password } = body;

        if (!email || typeof password !== "string" || password.length > 1024) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        if (email.length > 254) {
            return res.status(400).json({
                message: "Invalid email format"
            });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({
                message: "Invalid email format"
            });
        }

        const user = await User.findOne({ email })
            .select("+password");

        // Use a generic response for unknown accounts.
        if (!user || !user.password) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Soft-deleted accounts must not be able to sign in again.
        if (user.deletedAt) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const now = new Date();

        // Enforce an active account lockout.
        if (user.lockUntil && user.lockUntil > now) {
            return lockoutResponse(res, user.lockUntil);
        }

        // Reset expired lockout state before checking the password.
        // This is a best-effort reset only: failed attempts below come from
        // atomic $inc updates, so a stale in-memory value here cannot
        // under-count concurrent failures.
        if (user.lockUntil && user.lockUntil <= now) {
            await User.updateOne(
                { _id: user._id, lockUntil: { $lte: new Date() } },
                { $set: { failedLoginAttempts: 0, lockUntil: null } }
            );

            user.failedLoginAttempts = 0;
            user.lockUntil = null;
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            // Atomic increment: read-modify-write via user.save() under-counts
            // concurrent failures, letting distributed guessing evade lockout.
            const updated = await User.findOneAndUpdate(
                { _id: user._id },
                {
                    $inc: { failedLoginAttempts: 1 }
                },
                { returnDocument: "after" }
            ).select("failedLoginAttempts lockUntil");

            if (
                updated &&
                (updated.failedLoginAttempts || 0) >= MAX_FAILED_ATTEMPTS
            ) {
                const lockUntil = new Date(
                    Date.now() + LOCKOUT_DURATION_MS
                );

                await User.updateOne(
                    { _id: user._id },
                    { $set: { lockUntil } }
                );

                // Do not disclose the remaining attempts.
                return lockoutResponse(res, lockUntil);
            }

            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Banned accounts must not be able to mint new sessions. Check after
        // the password comparison so a wrong password still gets the generic
        // 401 response and does not disclose the ban state.
        if (user.banned) {
            return res.status(403).json({
                message: "Your account has been banned"
            });
        }

        // Local development can bypass verification for pre-existing accounts
        // created while transactional email was unavailable.
        if (!user.emailVerified && config.devAutoVerify) {
            user.emailVerified = true;
            user.emailVerificationTokenHash = null;
            user.emailVerificationTokenExpiresAt = null;

        }

        // Require verified email before completing login.
        if (!user.emailVerified) {
            return res.status(403).json({
                message:
                    "Please verify your email before logging in"
            });
        }

        // Clear lockout state after a successful password check.
        user.failedLoginAttempts = 0;
        user.lockUntil = null;

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken();

        const refreshTokenHash = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        user.refreshTokenHash = refreshTokenHash;
        user.refreshTokenExpiresAt = new Date(
            Date.now() + REFRESH_TOKEN_TTL_MS
        );

        await user.save();

        res.cookie(
            "accessToken",
            accessToken,
            accessCookieOptions
        );

        res.cookie(
            "refreshToken",
            refreshToken,
            refreshCookieOptions
        );

        return res.status(200).json({
            message: "Login successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        logAuthFailure("login", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};


// ==============================
// REFRESH TOKEN
// ==============================

const refreshToken = async (req, res) => {
    try {
        const token = req.cookies.refreshToken;

        if (!token) {
            return res.status(401).json({
                message:
                    "Refresh token not provided"
            });
        }

        // Hash incoming refresh token
        const refreshTokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        // Find user with this refresh-token hash
        const user = await User.findOne({
            refreshTokenHash
        });

        if (!user) {
            return res.status(401).json({
                message:
                    "Invalid refresh token"
            });
        }

        if (user.deletedAt) {
            return res.status(401).json({
                message: "Invalid refresh token"
            });
        }

        if (user.banned) {
            return res.status(403).json({
                message: "Your account has been banned"
            });
        }

        if (!user.emailVerified) {
            return res.status(403).json({
                message:
                    "Please verify your email before logging in"
            });
        }

        const now = new Date();

        // The cookie has a 7-day max-age, but that is client-enforced only.
        // Enforce the same lifetime server-side so a leaked token cannot be
        // replayed forever.
        if (
            !user.refreshTokenExpiresAt ||
            user.refreshTokenExpiresAt <= now
        ) {
            return res.status(401).json({
                message: "Refresh token expired"
            });
        }

        // Generate new tokens
        const newAccessToken =
            generateAccessToken(user);

        const newRefreshToken =
            generateRefreshToken();

        // Hash new refresh token
        const newRefreshTokenHash = crypto
            .createHash("sha256")
            .update(newRefreshToken)
            .digest("hex");

        const newRefreshTokenExpiresAt = new Date(
            now.getTime() + REFRESH_TOKEN_TTL_MS
        );

        // Rotate atomically. If two requests race with the same token, only
        // the first can replace the stored hash; the loser gets a 401 instead
        // of both requests believing they own the session.
        const rotated = await User.findOneAndUpdate(
            {
                _id: user._id,
                refreshTokenHash,
                deletedAt: null,
                banned: { $ne: true },
                emailVerified: true,
                refreshTokenExpiresAt: { $gt: now }
            },
            {
                $set: {
                    refreshTokenHash: newRefreshTokenHash,
                    refreshTokenExpiresAt: newRefreshTokenExpiresAt
                }
            },
            { returnDocument: "after" }
        );

        if (!rotated) {
            return res.status(401).json({
                message: "Invalid refresh token"
            });
        }

        // Send new cookies
        res.cookie(
            "accessToken",
            newAccessToken,
            accessCookieOptions
        );

        res.cookie(
            "refreshToken",
            newRefreshToken,
            refreshCookieOptions
        );

        return res.status(200).json({
            message:
                "Token refreshed successfully"
        });

    } catch (error) {
        logAuthFailure("refresh_token", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};


// ==============================
// LOGOUT
// ==============================

const logout = async (req, res) => {
    try {
        const refreshToken =
            req.cookies?.refreshToken;

        if (refreshToken) {
            const refreshTokenHash = crypto
                .createHash("sha256")
                .update(refreshToken)
                .digest("hex");

            await User.findOneAndUpdate(
                { refreshTokenHash },
                {
                    $set: {
                        refreshTokenHash: null,
                        refreshTokenExpiresAt: null
                    },
                    $inc: {
                        tokenVersion: 1
                    }
                }
            );
        }

        if (typeof req.cookies?.accessToken === "string") {
            const secrets = [
                process.env.ACCESS_TOKEN_SECRET,
                process.env.JWT_SECRET
            ].filter((secret, index, values) =>
                typeof secret === "string" && secret.length > 0 && values.indexOf(secret) === index
            );

            for (const secret of secrets) {
                let payload;
                try {
                    payload = jwt.verify(req.cookies.accessToken, secret);
                } catch {
                    continue;
                }

                const userId = String(payload.id || payload.sub || "");
                if (!mongoose.Types.ObjectId.isValid(userId)) break;

                // Revoke a still-valid access token even if its refresh cookie
                // is missing, stale, or cannot be matched.
                await User.findOneAndUpdate(
                    {
                        _id: userId,
                        tokenVersion: payload.tokenVersion ?? 0
                    },
                    {
                        $set: {
                            refreshTokenHash: null,
                            refreshTokenExpiresAt: null
                        },
                        $inc: { tokenVersion: 1 }
                    }
                );
                break;
            }
        }

        // Clear authentication cookies
        res.clearCookie(
            "accessToken",
            accessCookieOptions
        );

        res.clearCookie(
            "refreshToken",
            refreshCookieOptions
        );

        return res.status(200).json({
            message: "Logout successful"
        });

    } catch (error) {
        logAuthFailure("logout", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};


// ==============================
// FORGOT PASSWORD
// ==============================

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body || {};

        const normalizedEmail =
            typeof email === "string"
                ? email.trim().toLowerCase()
                : "";

        if (!normalizedEmail) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        if (normalizedEmail.length > 254 || !validator.isEmail(normalizedEmail)) {
            return res.status(400).json({
                message: "Invalid email format"
            });
        }

        const user = await User.findOne({ email: normalizedEmail });

        // Don't reveal whether account exists
        if (!user) {
            return res.status(200).json({
                message:
                    "If the account exists, a password reset email has been sent"
            });
        }

        const resetToken =
            generateEmailVerificationToken();

        const resetTokenHash =
            hashToken(resetToken);

        const resetTokenExpiresAt =
            new Date(Date.now() + 15 * 60 * 1000);

        user.passwordResetTokenHash =
            resetTokenHash;

        user.passwordResetTokenExpiresAt =
            resetTokenExpiresAt;

        await user.save();

        await sendPasswordResetEmail(
            user.email,
            resetToken
        );

        return res.status(200).json({
            message:
                "If the account exists, a password reset email has been sent"
        });

    } catch (error) {
        logAuthFailure("forgot_password", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};


// ==============================
// RESET PASSWORD
// ==============================
// ==============================
// RESET PASSWORD
// ==============================

const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body || {};

        // Validate required fields
        if (!token || !password) {
            return res.status(400).json({
                message: "Token and password are required"
            });
        }

        // Validate input types
        if (
            typeof token !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                message: "Token and password must be strings"
            });
        }

        // Require at least 8 characters, one uppercase letter,
        // and one special character.
        const passwordRegex =
            /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/;

        if (
            Buffer.byteLength(password, "utf8") > 72 ||
            !passwordRegex.test(password)
        ) {
            return res.status(400).json({
                message:
                    "Password must be 8 to 72 bytes and contain an uppercase letter, a number, and a special character"
            });
        }

        // Hash the supplied reset token and new password
        const tokenHash = hashToken(token);
        const hashedPassword = await bcrypt.hash(password, 10);

        // Atomically update the password and consume the token.
        // Only one request can successfully use a reset token.
        const user = await User.findOneAndUpdate(
            {
                passwordResetTokenHash: tokenHash,
                passwordResetTokenExpiresAt: {
                    $gt: new Date()
                }
            },
            {
                $set: {
                    password: hashedPassword,
                    passwordResetTokenHash: null,
                    passwordResetTokenExpiresAt: null,
                    refreshTokenHash: null,
                    refreshTokenExpiresAt: null
                },
                $inc: {
                    tokenVersion: 1
                }
            },
            {
                new: true,
                runValidators: true
            }
        );

        // Reject invalid, expired, or previously used tokens
        if (!user) {
            return res.status(400).json({
                message:
                    "Invalid or expired password reset token"
            });
        }

        return res.status(200).json({
            message: "Password reset successful"
        });

    } catch (error) {
        logAuthFailure("reset_password", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};
// ==============================
// EXPORTS
// ==============================

module.exports = {
    register,
    login,
    refreshToken,
    logout,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword
};