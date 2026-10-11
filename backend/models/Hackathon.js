const mongoose = require("mongoose");

const hackathonSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        description: {
            type: String,
            default: "",
            trim: true
        },

        organizer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organizer",
            required: true
        },

        source: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Source",
            required: true
        },

        externalId: {
            type: String,
            required: true,
            trim: true
        },

        canonicalKey: {
            type: String,
            default: null
        },

        isCanonical: {
            type: Boolean,
            default: true
        },

        sourceListings: [
            new mongoose.Schema({
                source: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Source",
                    required: true
                },
                externalId: {
                    type: String,
                    required: true
                },
                sourceUrl: {
                    type: String,
                    default: ""
                }
            }, { _id: false })
        ],

        tags: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Tag"
            }
        ],

        skills: {
            type: [String],
            default: []
        },

        domain: {
            type: [String],
            default: []
        },

        tagNames: {
            type: [String],
            default: []
        },

        mode: {
            type: String,
            enum: ["ONLINE", "OFFLINE", "HYBRID"],
            default: "ONLINE"
        },

        location: {
            type: String,
            default: "",
            trim: true
        },

        registrationDeadline: {
            type: Date,
            default: null
        },

        eventStartDate: {
            type: Date,
            default: null
        },

        eventEndDate: {
            type: Date,
            default: null
        },

        prize: {
            type: Number,
            default: 0,
            min: 0
        },

        status: {
            type: String,
            enum: ["upcoming", "ongoing", "completed", "inactive"],
            default: "upcoming"
        },

        sourceUrl: {
            type: String,
            default: ""
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true,
        collection: "Hackathons"
    }
);

// Deduplication
hackathonSchema.index(
    { source: 1, externalId: 1 },
    { unique: true }
);

hackathonSchema.index({ canonicalKey: 1, isCanonical: 1 });
hackathonSchema.index({ "sourceListings.source": 1 });

// Text search
hackathonSchema.index({
    title: "text",
    description: "text",
    skills: "text",
    domain: "text",
    tagNames: "text"
});

// Filters
hackathonSchema.index({
    mode: 1,
    location: 1,
    status: 1
});

hackathonSchema.index({ registrationDeadline: 1, _id: 1 });
hackathonSchema.index({ prize: 1, _id: 1 });
hackathonSchema.index({ prize: -1, _id: 1 });
hackathonSchema.index({ createdAt: -1, _id: -1 });

module.exports = mongoose.model("Hackathon", hackathonSchema);