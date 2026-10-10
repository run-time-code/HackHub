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
            [providerIdField]: profile.id
        });

        if (!user) {
            user = await User.findOne({ email }).select("+password");

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

        return res.status(200).json({
            message: `${provider} login successful`,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("OAuth login error:", error);

        return res.status(500).json({
            message: "Social login failed"
        });
    }
};

module.exports = {
    completeOAuthLogin
};