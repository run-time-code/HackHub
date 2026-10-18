const User = require("../models/User");
const {
    generateAccessToken,
    generateRefreshToken,
    hashToken
} = require("../utils/tokenUtils");

const {
    accessCookieOptions,
    refreshCookieOptions
} = require("../utils/cookieUtils");

const completeOAuthLogin = async (req, res) => {
    try {
        const profile = req.user;

        if (!profile || !profile.provider || !profile.id) {
            return res.status(400).json({
                message: "Invalid OAuth profile"
            });
        }

        const provider = profile.provider;

        if (!["google", "github"].includes(provider)) {
            return res.status(400).json({
                message: "Unsupported OAuth provider"
            });
        }

        const providerIdField =
            provider === "google" ? "googleId" : "githubId";

        const emailEntry = (profile.emails || []).find(
            email => email.verified === true
        );

        const email = emailEntry?.value?.trim().toLowerCase();

        if (!email) {
            return res.status(400).json({
                message: "A verified email address is required"
            });
        }

        let user = await User.findOne({
            [providerIdField]: profile.id,
            deletedAt: null
        });

        if (!user) {
            user = await User.findOne({ email }).select("+password");

            if (user && user.deletedAt) {
                return res.status(403).json({
                    message:
                        "This account has been deactivated and cannot be used for social login"
                });
            }

            if (user) {
                if (!user.emailVerified) {
                    return res.status(409).json({
                        message:
                            "Verify your HackHub email before linking this account"
                    });
                }

                user[providerIdField] = profile.id;
            } else {
                user = new User({
                    name: profile.displayName || email.split("@")[0],
                    email,
                    [providerIdField]: profile.id,
                    emailVerified: true
                });
            }

            await user.save();
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken();

        user.refreshTokenHash = hashToken(refreshToken);
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

        // Let the audit middleware attribute this login to the application
        // user (req.user here is the raw provider profile, whose id is not
        // a valid ObjectId).
        req.auditUserId = user._id;

        const payload = {
            message: `${provider} login successful`,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        };

        // The OAuth redirect lands here as a full browser page load, so send
        // the SPA back to the frontend (it picks the session up from the
        // cookies). API clients keep receiving JSON.
        if ((req.get("accept") || "").includes("text/html")) {
            const frontendUrl = (
                process.env.FRONTEND_URL || "http://localhost:5173"
            ).replace(/\/$/, "");

            return res.redirect(
                `${frontendUrl}/?oauth=${provider}_success`
            );
        }

        return res.status(200).json(payload);
    } catch (error) {
        console.error("OAuth login error:", error);

        // Concurrent first-time logins racing to create the same account.
        if (error && error.code === 11000) {
            return res.status(409).json({
                message: "Unable to complete social login. Please try again."
            });
        }

        return res.status(500).json({
            message: "Social login failed"
        });
    }
};

module.exports = {
    completeOAuthLogin
};