
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
            type: Date,
            default: null
        },

        submission_deadline: {
            type: Date,
            default: null
        },

        event_start: {
            type: Date,
            default: null
        },
        event_start_date: {
            type: Date,
            default: null
        },

        event_end: {
            type: Date,
            default: null
        },

        description: {
            type: String,
            default: "",
            trim: true
        },

        organizer: {
            type: String,
            default: "",
            trim: true
        },

        url: {
            type: String,
            default: ""
        },

        mode: {
            type: String,
            default: "online"
        },

        location: {
            type: String,
            default: "",
            trim: true
        },

        domains: {
            type: [String],
            default: []
        },
        domain: {
            type: [String],
            default: []
        },

        skills: {
            type: [String],
            default: []
        },

        prize_pool: {
            type: String,
            default: ""
        },

        source: {
            type: String,
            default: ""
        },

        external_id: {
            type: String,
            default: "",
            index: true
        },

        // Optional enrichment populated by the importer/admin tools.
        theme: {
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
