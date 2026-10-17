const mongoose = require("mongoose");

const reminderJobSchema = new mongoose.Schema(
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

        eventType: {
            type: String,
            enum: [
                "registration_deadline",
                "submission_deadline",
                "event_start",
                "event_end"
            ],
            required: true
        },

        runAt: {
            type: Date,
            required: true
        },

        idempotencyKey: {
            type: String,
            required: true,
            unique: true
        },

        status: {
            type: String,
            enum: ["queued", "processing", "sent", "dead", "cancelled"],
            default: "queued",
            required: true
        },

        attempts: {
            type: Number,
            default: 0,
            min: 0
        },

        lockedAt: {
            type: Date,
            default: null
        },

        sentAt: {
            type: Date,
            default: null
        },

        lastError: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true,
        collection: "ReminderJobs"
    }
);

reminderJobSchema.index({ status: 1, runAt: 1 });
reminderJobSchema.index({ user: 1, hackathon: 1, status: 1 });

module.exports = mongoose.model("ReminderJob", reminderJobSchema);
