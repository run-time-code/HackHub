const bcrypt = require("bcryptjs");
const validator = require("validator");
const crypto = require("crypto");

const User = require("../models/User");

const {
    sendVerificationEmail,
    sendPasswordResetEmail
} = require("../utils/emailUtils");

const {
    generateAccessToken,
    generateRefreshToken,
    generateEmailVerificationToken,
    hashToken
} = require("../utils/tokenUtils");

const {
    accessCookieOptions,
    refreshCookieOptions
} = require("../utils/cookieUtils");


// ==============================
// REGISTER
// ==============================

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            console.log("All fields are required");

        const passwordRegex = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

        if (!passwordRegex.test(password)) {
                  return res.status(400).json({
                  message:
                    "Password must be at least 8 characters long and contain at least one uppercase letter and one special character"
            });
        }

            return res.status(400).json({
                message: "All fields are required"
            });
        }

        if (!validator.isEmail(email)) {
            console.log("Invalid email format");

            return res.status(400).json({
                message: "Invalid email format"
            });
        }

        if (password.length < 8) {
            console.log("Password must be at least 8 characters");

            return res.status(400).json({
                message: "Password must be at least 8 characters"
            });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            console.log("User already exists");

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
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            emailVerified: false,
            emailVerificationTokenHash:
                verificationTokenHash,
            emailVerificationTokenExpiresAt:
                verificationTokenExpiresAt
        });

        // Send verification email
        try {
            await sendVerificationEmail(
                user.email,
                verificationToken
            );
        } catch (emailError) {
            console.error(
                "Verification email failed:",
                emailError
            );

            // Remove account if verification email could not be sent
            await User.findByIdAndDelete(user._id);

            return res.status(500).json({
                message:
                    "Unable to send verification email. Please try again."
            });
        }

        console.log(
            `Verification email sent for registration: ${user.email}`
        );

        // Registration is NOT completed yet
        return res.status(200).json({
            message:
                "Verification email sent. Please verify your email to complete registration."
        });

    } catch (error) {
        console.error("Registration error:", error);

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

        if (!token) {
            return res.status(400).json({
                message: "Verification token is required"
            });
        }

        const tokenHash = hashToken(token);

        const user = await User.findOne({
            emailVerificationTokenHash: tokenHash,
            emailVerificationTokenExpiresAt: {
                $gt: new Date()
            }
        });

        if (!user) {
            return res.status(400).json({
                message:
                    "Invalid or expired verification token"
            });
        }

        // Complete registration
        user.emailVerified = true;

        // Make verification token single-use
        user.emailVerificationTokenHash = null;
        user.emailVerificationTokenExpiresAt = null;

        await user.save();

        console.log(
            `Email verified successfully: ${user.email}`
        );

        return res.status(200).json({
            message:
                "Email verified successfully. Registration completed. You can now log in."
        });

    } catch (error) {
        console.error(
            "Email verification error:",
            error
        );

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
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({
                message: "Invalid email format"
            });
        }

        const user = await User.findOne({ email });

        // Don't reveal whether an account exists
        if (!user) {
            return res.status(200).json({
                message:
                    "If the account exists, a verification email has been sent"
            });
        }

        if (user.emailVerified) {
            return res.status(400).json({
                message: "Email is already verified"
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
            console.error(
                "Verification email resend failed:",
                emailError
            );

            return res.status(500).json({
                message:
                    "Unable to send verification email. Please try again."
            });
        }

        console.log(
            `Verification email resent: ${user.email}`
        );

        return res.status(200).json({
            message:
                "If the account exists, a verification email has been sent"
        });

    } catch (error) {
        console.error(
            "Resend verification error:",
            error
        );

        return res.status(500).json({
            message: "Server error"
        });
    }
};


// ==============================
// LOGIN
// ==============================


const login = async (req, res) => {
    try {
        const email =
            typeof req.body.email === "string"
                ? req.body.email.trim().toLowerCase()
                : "";

        const { password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
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

        const now = new Date();

        // Enforce an active account lockout.
        if (user.lockUntil && user.lockUntil > now) {
            const retryAfterSeconds = Math.ceil(
                (user.lockUntil.getTime() - now.getTime()) / 1000
            );

            res.set(
                "Retry-After",
                String(retryAfterSeconds)
            );

            return res.status(423).json({
                message:
                    "Account temporarily locked due to failed login attempts. Please try again later.",
                retryAfterSeconds
            });
        }

        // Reset expired lockout state before checking the password.
        if (user.lockUntil && user.lockUntil <= now) {
            user.failedLoginAttempts = 0;
            user.lockUntil = null;
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            user.failedLoginAttempts =
                (user.failedLoginAttempts || 0) + 1;

            const MAX_FAILED_ATTEMPTS = 5;
            const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

            if (
                user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS
            ) {
                user.lockUntil = new Date(
                    Date.now() + LOCKOUT_DURATION_MS
                );
            }

            await user.save();

            // Do not disclose the remaining attempts.
            if (user.lockUntil && user.lockUntil > new Date()) {
                const retryAfterSeconds = Math.ceil(
                    (user.lockUntil.getTime() - Date.now()) / 1000
                );

                res.set(
                    "Retry-After",
                    String(retryAfterSeconds)
                );

                return res.status(423).json({
                    message:
                        "Account temporarily locked due to failed login attempts. Please try again later.",
                    retryAfterSeconds
                });
            }

            return res.status(401).json({
                message: "Invalid email or password"
            });
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
        console.error("Login error:", error);

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
            console.log(
                "Refresh token not provided"
            );

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
            console.log(
                "Invalid refresh token"
            );

            return res.status(401).json({
                message:
                    "Invalid refresh token"
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

        // Rotate refresh token
        user.refreshTokenHash =
            newRefreshTokenHash;

        await user.save();

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

        console.log(
            `Refresh token rotated: ${user.email}`
        );

        return res.status(200).json({
            message:
                "Token refreshed successfully"
        });

    } catch (error) {
        console.error(
            "Refresh token error:",
            error
        );

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
            req.cookies.refreshToken;

        if (refreshToken) {
            const refreshTokenHash = crypto
                .createHash("sha256")
                .update(refreshToken)
                .digest("hex");

            // Remove refresh token
            await User.findOneAndUpdate(
                { refreshTokenHash },
                {
                    $set: {
                        refreshTokenHash: null
                    }
                }
            );
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

        console.log("Logout successful");

        return res.status(200).json({
            message: "Logout successful"
        });

    } catch (error) {
        console.error(
            "Logout error:",
            error
        );

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
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({
                message: "Invalid email format"
            });
        }

        const user = await User.findOne({ email });

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

        console.log(
            `Password reset email sent: ${user.email}`
        );

        return res.status(200).json({
            message:
                "If the account exists, a password reset email has been sent"
        });

    } catch (error) {
        console.error(
            "Forgot password error:",
            error
        );

        return res.status(500).json({
            message: "Server error"
        });
    }
};


// ==============================
// RESET PASSWORD
// ==============================

const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        const passwordRegex = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                message:
                    "Password must be at least 8 characters long and contain at least one uppercase letter and one special character"
            });
        }

        if (!token || !password) {
            return res.status(400).json({
                message:
                    "Token and password are required"
            });
        }



        if (password.length < 8) {
            return res.status(400).json({
                message:
                    "Password must be at least 8 characters long"
            });
        }

        const tokenHash =
            hashToken(token);

        const user = await User.findOne({
            passwordResetTokenHash:
                tokenHash,
            passwordResetTokenExpiresAt: {
                $gt: new Date()
            }
        });

        if (!user) {
            return res.status(400).json({
                message:
                    "Invalid or expired password reset token"
            });
        }

        const hashedPassword =
            await bcrypt.hash(password, 10);

        user.password =
            hashedPassword;

        // Make reset token single-use
        user.passwordResetTokenHash =
            null;

        user.passwordResetTokenExpiresAt =
            null;

        // Invalidate existing refresh token
        user.refreshTokenHash =
            null;

        await user.save();

        console.log(
            `Password reset successful: ${user.email}`
        );

        return res.status(200).json({
            message:
                "Password reset successful"
        });

    } catch (error) {
        console.error(
            "Reset password error:",
            error
        );

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