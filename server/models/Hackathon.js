const mongoose = require("mongoose");

const hackathonSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        organizer: {
            type: String,
            default: ""
        },

        description: {
            type: String,
            default: ""
        },

        registrationDeadline: {
            type: Date
        },

        eventDate: {
            type: Date
        },

        mode: {
            type: String,
            enum: ["Online", "Offline", "Hybrid"],
            default: "Online"
        },

        location: {
            type: String,
            default: ""
        },

        domains: {
            type: [String],
            default: []
        },

        eligibility: {
            type: String,
            default: ""
        },

        prizePool: {
            type: Number,
            default: 0
        },

        registrationUrl: {
            type: String,
            default: ""
        },

        sourceWebsite: {
            type: String,
            default: ""
        },

        skillsRequired: {
            type: [String],
            default: []
        },

        status: {
            type: String,
            enum: ["Open", "Closed", "Upcoming", "Ongoing", "Completed"],
            default: "Open"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Hackathon", hackathonSchema);