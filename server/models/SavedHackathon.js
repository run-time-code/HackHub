const mongoose = require("mongoose");

const savedHackathonSchema = new mongoose.Schema(
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
        }
    },
    {
        timestamps: true
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