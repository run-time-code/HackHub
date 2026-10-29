const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        hackathon: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hackathon",
            required: true
        },

        reminderJob: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ReminderJob",
            required: true,
            unique: true
        },

        type: {
            type: String,
            enum: [
                "registration_deadline",
                "submission_deadline",
                "event_start",
                "event_end"
            ],
            required: true
        },

        title: {
            type: String,
            required: true,
            trim: true
        },

        message: {
            type: String,
            required: true,
            trim: true
        },

        readAt: {
            type: Date,
            default: null
        },

        emailSentAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true,
        collection: "Notifications"
    }
);

notificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);