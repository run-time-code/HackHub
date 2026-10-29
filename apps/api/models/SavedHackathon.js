const mongoose = require("mongoose");

const savedHackathonSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        hackathon: {
            type: String,
            required: true
        },

        // Dashboard tracking state. Kept on the saved row so the redesigned
        // dashboard can read one record per hackathon without joining the
        // legacy registration collection.
        status: {
            type: String,
            enum: ["saved", "registered", "ongoing", "completed"],
            default: "saved"
        },

        notes: {
            type: String,
            default: "",
            maxlength: 2000
        }
    },
    {
        timestamps: true,
        collection: "Saved_Hackathons"
    }
);

savedHackathonSchema.index(
    { user: 1, hackathon: 1 },
    { unique: true }
);

module.exports = mongoose.model(
    "SavedHackathon",
    savedHackathonSchema
);