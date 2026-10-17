
const User = require("../models/User");

// Ban a user
const banUser = async (req, res) => {
    try {
        const { userId } = req.params;

        if (userId === req.user.id) {
            return res.status(400).json({
                message: "You cannot ban your own account"
            });
        }

        const user = await User.findById(userId);

        if (!user || user.deletedAt) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        if (user.role === "admin") {
            return res.status(403).json({
                message: "Admin accounts cannot be banned through this endpoint"
            });
        }

        if (user.banned === true) {
            return res.status(200).json({
                message: "User is already banned"
            });
        }

        user.banned = true;
        user.bannedAt = new Date();

        // Revoke existing tokens/sessions that use tokenVersion.
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        user.refreshTokenHash = null;

        await user.save();

        return res.status(200).json({
            message: "User banned successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                banned: user.banned,
                bannedAt: user.bannedAt
            }
        });
    } catch (error) {
        console.error("Ban user error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

// Unban a user
const unbanUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);

        if (!user || user.deletedAt) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        if (user.banned !== true) {
            return res.status(200).json({
                message: "User is not banned"
            });
        }

        user.banned = false;
        user.bannedAt = null;

        await user.save();

        return res.status(200).json({
            message: "User unbanned successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                banned: user.banned,
                bannedAt: user.bannedAt
            }
        });
    } catch (error) {
        console.error("Unban user error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
};

module.exports = {
    banUser,
    unbanUser
};
