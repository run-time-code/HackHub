const mongoose = require("mongoose");

const encodeNotificationCursor = (notification) =>
    Buffer.from(
        JSON.stringify({
            createdAt: notification.createdAt.toISOString(),
            id: String(notification._id)
        })
    ).toString("base64url");

const decodeNotificationCursor = (cursor) => {
    if (typeof cursor !== "string" || cursor.length > 512) {
        throw new Error("cursor is invalid");
    }

    let value;
    try {
        value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    } catch {
        throw new Error("cursor is invalid");
    }

    if (
        !value ||
        typeof value.createdAt !== "string" ||
        Number.isNaN(new Date(value.createdAt).getTime()) ||
        typeof value.id !== "string" ||
        !mongoose.isValidObjectId(value.id)
    ) {
        throw new Error("cursor is invalid");
    }

    return {
        createdAt: new Date(value.createdAt),
        id: new mongoose.Types.ObjectId(value.id)
    };
};

module.exports = {
    encodeNotificationCursor,
    decodeNotificationCursor
};
