"use strict";

const mongoose = require("mongoose");

const hackathonSchema = new mongoose.Schema(
    {
        hackathon_id: {
            type: String,
            default: undefined,
            sparse: true,
            unique: true
        },
        slug: {
            type: String,
            default: undefined,
            sparse: true,
            unique: true
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            default: "",
            trim: true
        },
        organizerName: {
            type: String,
            default: ""
        },
        sourceName: {
            type: String,
            default: ""
        },
        organizer: {
            type: mongoose.Schema.Types.Mixed,
            default: ""
        },
        source: {
            type: mongoose.Schema.Types.Mixed,
            default: ""
        },
        externalId: {
            type: String,
            default: ""
        },
        external_id: {
            type: String,
            default: "",
            index: true
        },
        skills: {
            type: [String],
            default: []
        },
        domain: {
            type: [String],
            default: []
        },
        domains: {
            type: [String],
            default: []
        },
        tags: {
            type: [mongoose.Schema.Types.Mixed],
            default: []
        },
        tagNames: {
            type: [String],
            default: []
        },
        theme: {
            type: String,
            trim: true,
            default: ""
        },
        mode: {
            type: String,
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
        registration_deadline: {
            type: Date,
            default: null
        },
        submissionDeadline: {
            type: Date,
            default: null
        },
        submission_deadline: {
            type: Date,
            default: null
        },
        eventStartDate: {
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
        eventEndDate: {
            type: Date,
            default: null
        },
        event_end: {
            type: Date,
            default: null
        },
        event_end_date: {
            type: Date,
            default: null
        },
        prize: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },
        prize_pool: {
            type: String,
            default: ""
        },
        status: {
            type: String,
            enum: ["upcoming", "ongoing", "completed", "inactive"],
            default: "upcoming"
        },
        url: {
            type: String,
            default: ""
        },
        sourceUrl: {
            type: String,
            default: ""
        },
        source_url: {
            type: String,
            default: ""
        },
        isActive: {
            type: Boolean,
            default: true
        },
        is_active: {
            type: Boolean,
            default: true
        },
        isHidden: {
            type: Boolean,
            default: false
        },
        is_hidden: {
            type: Boolean,
            default: false
        },
        isFeatured: {
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

hackathonSchema.index({ skills: 1 });
hackathonSchema.index({ domain: 1 });
hackathonSchema.index({ domains: 1 });
hackathonSchema.index({ mode: 1, status: 1, isActive: 1 });
hackathonSchema.index({ title: 1, _id: 1 });
hackathonSchema.index({ registrationDeadline: 1, _id: 1 });
hackathonSchema.index({ registration_deadline: 1, _id: 1 });
hackathonSchema.index({ prize: -1, _id: 1 });
hackathonSchema.index({ prize: 1, _id: 1 });
hackathonSchema.index({ createdAt: -1, _id: -1 });

module.exports = mongoose.models.Hackathon
    || mongoose.model("Hackathon", hackathonSchema);
