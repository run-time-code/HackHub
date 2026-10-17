const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const {
    encodeNotificationCursor,
    decodeNotificationCursor
} = require("../utils/notificationCursor");

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const getNotifications = async (req, res) => {
    const limitValue = req.query.limit;
    if (limitValue !== undefined && typeof limitValue !== "string") {
        return res.status(400).json({
            success: false,
            error: { message: "limit must be a single integer value" }
        });
    }

    const requestedLimit = limitValue === undefined
        ? DEFAULT_LIMIT
        : Number(limitValue);
    if (
        !Number.isInteger(requestedLimit) ||
        requestedLimit < 1 ||
        requestedLimit > MAX_LIMIT
    ) {
        return res.status(400).json({
            success: false,
            error: { message: "limit must be an integer between 1 and 50" }
        });
    }

    let cursorFilter = {};
    if (req.query.cursor !== undefined) {
        try {
            const cursor = decodeNotificationCursor(req.query.cursor);
            cursorFilter = {
                $or: [
                    { createdAt: { $lt: cursor.createdAt } },
                    {
                        createdAt: cursor.createdAt,
                        _id: { $lt: cursor.id }
                    }
                ]
            };
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: { message: error.message }
            });
        }
    }

    try {
        const [notifications, unreadCount] = await Promise.all([
            Notification.find({
                user: req.user.id,
                ...cursorFilter
            })
                .sort({ createdAt: -1, _id: -1 })
                .limit(requestedLimit + 1)
                .lean(),
            Notification.countDocuments({
                user: req.user.id,
                readAt: null
            })
        ]);

        const hasMore = notifications.length > requestedLimit;
        if (hasMore) {
            notifications.pop();
        }

        const nextCursor = hasMore
            ? encodeNotificationCursor(notifications[notifications.length - 1])
            : null;

        return res.status(200).json({
            success: true,
            data: notifications,
            pagination: {
                limit: requestedLimit,
                hasMore,
                nextCursor
            },
            unreadCount
        });
    } catch (error) {
        console.error("Fetching notifications failed:", error.message);
        return res.status(500).json({
            success: false,
            error: { message: "Could not fetch notifications" }
        });
    }
};

const markNotificationRead = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
            success: false,
            error: { message: "Notification id is invalid" }
        });
    }

    try {
        let notification = await Notification.findOneAndUpdate(
            {
                _id: req.params.id,
                user: req.user.id,
                readAt: null
            },
            {
                $set: { readAt: new Date() }
            },
            {
                returnDocument: "after"
            }
        );

        if (!notification) {
            notification = await Notification.findOne({
                _id: req.params.id,
                user: req.user.id
            });
        }

        if (!notification) {
            return res.status(404).json({
                success: false,
                error: { message: "Notification not found" }
            });
        }

        return res.status(200).json({
            success: true,
            data: notification
        });
    } catch (error) {
        console.error("Marking notification as read failed:", error.message);
        return res.status(500).json({
            success: false,
            error: { message: "Could not update notification" }
        });
    }
};

const markAllNotificationsRead = async (req, res) => {
    try {
        const result = await Notification.updateMany(
            {
                user: req.user.id,
                readAt: null
            },
            {
                $set: { readAt: new Date() }
            }
        );

        return res.status(200).json({
            success: true,
            data: { updatedCount: result.modifiedCount }
        });
    } catch (error) {
        console.error("Marking all notifications as read failed:", error.message);
        return res.status(500).json({
            success: false,
            error: { message: "Could not update notifications" }
        });
    }
};

module.exports = {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead
};
