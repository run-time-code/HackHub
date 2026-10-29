const bcrypt = require("bcryptjs");
const User = require("../models/User");
const {
    createAccessToken,
    createRefreshToken,
    createActionToken,
    hashRefreshToken,
    getAccessTokenSecret
} = require("../services/authService");
const {
    sendVerificationEmail,
    sendPasswordResetEmail
} = require("../services/emailService");

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_BYTES = 72;

const validatePassword = (password) => {
    if (
        typeof password !== "string" ||
        password.length < MIN_PASSWORD_LENGTH ||
        Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES
    ) {
        return `Password must be at least ${MIN_PASSWORD_LENGTH} characters and no more than ${MAX_PASSWORD_BYTES} UTF-8 bytes`;
    }

    return null;
};

const publicUser = (user) => ({
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    timeZone: user.timeZone,
    reminderPreferences: user.reminderPreferences
});

const validateCredentials = (email, password) => {
    if (
        typeof email !== "string" ||
        email.trim().length === 0 ||
        email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
        return "A valid email address is required";
    }

    return validatePassword(password);
};

const register = async (req, res) => {
    const { name, email, password } = req.body || {};
    const credentialError = validateCredentials(email, password);

    if (
        typeof name !== "string" ||
        name.trim().length === 0 ||
        name.trim().length > 100
    ) {
        return res.status(400).json({
            success: false,
            error: { message: "Name must be between 1 and 100 characters" }
        });
    }

    if (credentialError) {
        return res.status(400).json({
            success: false,
            error: { message: credentialError }
        });
    }

    try {
        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await User.exists({ email: normalizedEmail });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: { message: "An account with this email already exists" }
            });
        }

        getAccessTokenSecret();
        const user = new User({
            name: name.trim(),
            email: normalizedEmail,
            password: await bcrypt.hash(password, BCRYPT_ROUNDS)
        });
        const verificationToken = createActionToken();
        user.emailVerificationTokenHash = verificationToken.hash;
        user.emailVerificationTokenExpiresAt = new Date(
            Date.now() + 24 * 60 * 60 * 1000
        );
        await user.save();

        try {
            await sendVerificationEmail({
                to: user.email,
                name: user.name,
                token: verificationToken.token
            });
        } catch (error) {
            console.error("Verification email delivery failed:", error.message);
            return res.status(503).json({
                success: false,
                error: {
                    message: "Account created, but verification email could not be sent. Request a new verification email after email settings are configured."
                }
            });
        }

        return res.status(201).json({
            success: true,
            message: "Account created. Check your email to verify the account."
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                error: { message: "An account with this email already exists" }
            });
        }

        console.error("Registration failed:", error.message);
        return res.status(500).json({
            success: false,
            error: { message: "Could not create the account" }
        });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body || {};

    if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        email.trim().length === 0 ||
        email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        password.length === 0 ||
        Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES
    ) {
        return res.status(400).json({
            success: false,
            error: { message: "A valid email and password are required" }
        });
    }

    try {
        getAccessTokenSecret();
        const user = await User.findOne({
            email: email.trim().toLowerCase()
        }).select("+password");

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                success: false,
                error: { message: "Email or password is incorrect" }
            });
        }

        if (!user.emailVerified) {
            return res.status(403).json({
                success: false,
                error: {
                    message: "Verify your email before signing in. You can request another verification email."
                }
            });
        }

        const refreshToken = createRefreshToken();
        user.refreshTokenHash = refreshToken.hash;
        user.refreshTokenExpiresAt = refreshToken.expiresAt;
        await user.save();

        return res.status(200).json({
            success: true,
            data: {
                user: publicUser(user),
                accessToken: createAccessToken(user),
                refreshToken: refreshToken.token,
                tokenType: "Bearer",
                expiresIn: 900
            }
        });
    } catch (error) {
        console.error("Login failed:", error.message);
        return res.status(500).json({
            success: false,
            error: { message: "Could not log in" }
        });
    }
};

const verifyEmail = async (req, res) => {
    const { token } = req.body || {};

    if (typeof token !== "string" || token.length > 256) {
        return res.status(400).json({
            success: false,
            error: { message: "A valid verification token is required" }
        });
    }

    try {
        const user = await User.findOneAndUpdate(
            {
                emailVerificationTokenHash: hashRefreshToken(token),
                emailVerificationTokenExpiresAt: { $gt: new Date() },
                emailVerified: false
            },
            {
                $set: {
                    emailVerified: true,
                    emailVerificationTokenHash: null,
                    emailVerificationTokenExpiresAt: null
                }
            },
            { returnDocument: "after" }
        );

        if (!user) {
            return res.status(400).json({
                success: false,
                error: { message: "Verification token is invalid, expired, or already used" }
            });
        }

        return res.status(200).json({
            success: true,
            message: "Email verified. You can now sign in."
        });
    } catch (error) {
        console.error("Email verification failed:", error.message);
        return res.status(500).json({
            success: false,
            error: { message: "Could not verify the email address" }
        });
    }
};

const resendVerificationEmail = async (req, res) => {
    const { email } = req.body || {};
    if (
        typeof email !== "string" ||
        email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
        return res.status(400).json({
            success: false,
            error: { message: "A valid email address is required" }
        });
    }

    try {
        const user = await User.findOne({
            email: email.trim().toLowerCase(),
            emailVerified: false
        }).select("+emailVerificationTokenHash +emailVerificationTokenExpiresAt");

        if (user) {
            const verificationToken = createActionToken();
            user.emailVerificationTokenHash = verificationToken.hash;
            user.emailVerificationTokenExpiresAt = new Date(
                Date.now() + 24 * 60 * 60 * 1000
            );
            await user.save();

            try {
                await sendVerificationEmail({
                    to: user.email,
                    name: user.name,
                    token: verificationToken.token
                });
            } catch (error) {
                console.error("Verification email delivery failed:", error.message);
            }
        }

        return res.status(202).json({
            success: true,
            message: "If the account exists and needs verification, a message will be sent."
        });
    } catch (error) {
        console.error("Resending verification email failed:", error.message);
        return res.status(500).json({
            success: false,
            error: { message: "Could not process the verification request" }
        });
    }
};

const requestPasswordReset = async (req, res) => {
    const { email } = req.body || {};
    if (
        typeof email !== "string" ||
        email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
        return res.status(400).json({
            success: false,
            error: { message: "A valid email address is required" }
        });
    }

    try {
        const user = await User.findOne({ email: email.trim().toLowerCase() })
            .select("+passwordResetTokenHash +passwordResetTokenExpiresAt");

        if (user) {
            const resetToken = createActionToken();
            user.passwordResetTokenHash = resetToken.hash;
            user.passwordResetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
            await user.save();

            try {
                await sendPasswordResetEmail({
                    to: user.email,
                    name: user.name,
                    token: resetToken.token
                });
            } catch (error) {
                console.error("Password reset email delivery failed:", error.message);
            }
        }

        return res.status(202).json({
            success: true,
            message: "If an account exists for that email, password reset instructions will be sent."
        });
    } catch (error) {
        console.error("Password reset request failed:", error.message);
        return res.status(500).json({
            success: false,
            error: { message: "Could not process the password reset request" }
        });
    }
};

const resetPassword = async (req, res) => {
    const { token, password } = req.body || {};
    if (typeof token !== "string" || token.length > 256) {
        return res.status(400).json({
            success: false,
            error: { message: "A valid password reset token is required" }
        });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
        return res.status(400).json({
            success: false,
            error: { message: passwordError }
        });
    }

    try {
        const user = await User.findOneAndUpdate(
            {
                passwordResetTokenHash: hashRefreshToken(token),
                passwordResetTokenExpiresAt: { $gt: new Date() }
            },
            {
                $set: {
                    password: await bcrypt.hash(password, BCRYPT_ROUNDS),
                    passwordResetTokenHash: null,
                    passwordResetTokenExpiresAt: null,
                    refreshTokenHash: null,
                    refreshTokenExpiresAt: null
                }
            },
            {
                returnDocument: "after",
                runValidators: true
            }
        );

        if (!user) {
            return res.status(400).json({
                success: false,
                error: { message: "Password reset token is invalid, expired, or already used" }
            });
        }

        return res.status(200).json({
            success: true,
            message: "Password reset successfully. Sign in with your new password."
        });
    } catch (error) {
        console.error("Password reset failed:", error.message);
        return res.status(500).json({
            success: false,
            error: { message: "Could not reset the password" }
        });
    }
};

const refresh = async (req, res) => {
    const { refreshToken: suppliedToken } = req.body || {};

    if (typeof suppliedToken !== "string" || suppliedToken.length > 256) {
        return res.status(401).json({
            success: false,
            error: { message: "A valid refresh token is required" }
        });
    }

    try {
        getAccessTokenSecret();
        const replacementToken = createRefreshToken();
        const user = await User.findOneAndUpdate(
            {
                refreshTokenHash: hashRefreshToken(suppliedToken),
                refreshTokenExpiresAt: { $gt: new Date() },
                emailVerified: true
            },
            {
                $set: {
                    refreshTokenHash: replacementToken.hash,
                    refreshTokenExpiresAt: replacementToken.expiresAt
                }
            },
            {
                returnDocument: "after"
            }
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                error: { message: "Refresh token is invalid or expired" }
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                accessToken: createAccessToken(user),
                refreshToken: replacementToken.token,
                tokenType: "Bearer",
                expiresIn: 900
            }
        });
    } catch (error) {
        console.error("Token refresh failed:", error.message);
        return res.status(500).json({
            success: false,
            error: { message: "Could not refresh the session" }
        });
    }
};

const logout = async (req, res) => {
    try {
        await User.updateOne(
            { _id: req.user.id },
            {
                $set: {
                    refreshTokenHash: null,
                    refreshTokenExpiresAt: null
                }
            }
        );

        return res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (error) {
        console.error("Logout failed:", error.message);
        return res.status(500).json({
            success: false,
            error: { message: "Could not log out" }
        });
    }
};

const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select(
            "_id name email role emailVerified timeZone reminderPreferences createdAt updatedAt"
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                error: { message: "User account no longer exists" }
            });
        }

        return res.status(200).json({
            success: true,
            data: { user: publicUser(user) }
        });
    } catch (error) {
        console.error("Fetching current user failed:", error.message);
        return res.status(500).json({
            success: false,
            error: { message: "Could not fetch the current user" }
        });
    }
};

module.exports = {
    register,
    login,
    refresh,
    verifyEmail,
    resendVerificationEmail,
    requestPasswordReset,
    resetPassword,
    logout,
    getCurrentUser
};
