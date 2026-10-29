const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const {
    encodeNotificationCursor,
    decodeNotificationCursor
} = require("../utils/notificationCursor");

test("notification cursors preserve timestamp and identifier", () => {
    const notification = {
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date("2026-10-16T12:00:00.000Z")
    };

    assert.deepEqual(
        decodeNotificationCursor(encodeNotificationCursor(notification)),
        {
            createdAt: notification.createdAt,
            id: notification._id
        }
    );
});

test("notification cursors reject malformed values", () => {
    assert.throws(() => decodeNotificationCursor("not-a-valid-cursor"), /cursor is invalid/);
    assert.throws(() => decodeNotificationCursor(""), /cursor is invalid/);
});
