const mongoose = require("mongoose");

const ingestionQuarantineSchema = new mongoose.Schema(
    {
        record: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        },
        issues: {
            type: [String],
            required: true
        },
        status: {
            type: String,
            enum: ["pending", "failed"],
            default: "pending"
        }
    },
    {
        timestamps: true,
        collection: "IngestionQuarantine"
    }
);

module.exports = mongoose.model("IngestionQuarantine", ingestionQuarantineSchema);
