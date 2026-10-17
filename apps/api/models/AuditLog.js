const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
    {
        event: {
            type: String,
            required: true,
            index: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true
        },
        email: {
            type: String,
            default: null
        },
        success: {
            type: Boolean,
            required: true
        },
        statusCode: {
            type: Number,
            default: null
        },
        ip: {
            type: String,
            default: null
        },
        userAgent: {
            type: String,
            default: null
        },
        details: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

// Automatically delete audit logs after 180 days.
auditLogSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: 180 * 24 * 60 * 60 }
);

module.exports =
    mongoose.models.AuditLog ||
    mongoose.model("AuditLog", auditLogSchema);