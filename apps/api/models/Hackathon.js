
const mongoose = require("mongoose");

const hackathonSchema = new mongoose.Schema(
    {
        hackathon_id: {
            type: String,
            required: true,
            unique: true
        },

        title: {
            type: String,
            trim: true
        },

        registration_deadline: {
            type: String
        },

        // Optional enrichment. The importer and admin tools may fill these;
        // the public API tolerates their absence.
        submission_deadline: {
            type: String
        },

        description: {
            type: String,
            trim: true
        },

        organizer: {
            type: String,
            trim: true
        },

        mode: {
            type: String,
            trim: true
        },

        location: {
            type: String,
            trim: true
        },

        url: {
            type: String,
            trim: true
        },

        sourceUrl: {
            type: String,
            trim: true
        },

        prize: {
            type: mongoose.Schema.Types.Mixed
        },

        skills: {
            type: [String],
            default: []
        },

        domain: {
            type: [String],
            default: []
        },

        theme: {
            type: String,
            trim: true
        },

        event_start_date: {
            type: String
        },

        event_end_date: {
            type: String
        },

        is_active: {
            type: Boolean,
            default: true
        },

        is_hidden: {
            type: Boolean,
            default: false
        },

        is_featured: {
            type: Boolean,
            default: false
        }
    },
    {
        collection: "Hackathons",
        timestamps: true
    }
);

module.exports = mongoose.model("Hackathon", hackathonSchema);
