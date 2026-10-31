
const mongoose = require("mongoose");

const pastHackathonSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            default: "",
            trim: true,
            maxlength: 120
        },

        year: {
            type: String,
            default: "",
            trim: true,
            maxlength: 10
        },

        projectUrl: {
            type: String,
            default: "",
            trim: true,
            maxlength: 300
        }
    },
    {
        _id: false
    }
);

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        // NOTE: intentionally no `default` on the provider ids. A null
        // default is written for every password-only user, and MongoDB's
        // unique sparse index treats an explicit null as an indexed value —
        // which made the second user registration fail with E11000.
        // Leaving the field absent lets the sparse index skip those docs.
        googleId: {
            type: String,
            sparse: true,
            unique: true
        },

        githubId: {
            type: String,
            sparse: true,
            unique: true
        },

        password: {
            type: String,
            required: false,
            select: false
        },

        // Login lockout protection
        failedLoginAttempts: {
            type: Number,
            default: 0,
            min: 0
        },

        lockUntil: {
            type: Date,
            default: null
        },

        role: {
            type: String,
            enum: ["student", "admin"],
            default: "student"
        },

        banned: {
           type: Boolean,
           default: false,
           index: true
        },

        bannedAt: {
           type: Date,
           default: null
     },

        bio: {
            type: String,
            default: "",
            trim: true
        },

        college: {
            type: String,
            default: "",
            trim: true
        },

        location: {
            type: String,
            default: "",
            trim: true
        },

        headline: {
            type: String,
            default: "",
            trim: true,
            maxlength: 120
        },

        year: {
            type: String,
            default: "",
            trim: true,
            maxlength: 20
        },

        links: {
            github: {
                type: String,
                default: "",
                trim: true,
                maxlength: 300
            },
            linkedin: {
                type: String,
                default: "",
                trim: true,
                maxlength: 300
            },
            portfolio: {
                type: String,
                default: "",
                trim: true,
                maxlength: 300
            }
        },

        pastHackathons: {
            type: [pastHackathonSchema],
            default: [],
            validate: {
                validator: (items) => Array.isArray(items) && items.length <= 10,
                message: "pastHackathons cannot contain more than 10 entries"
            }
        },

        skillProficiency: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },

        skills: {
            type: [String],
            default: [],
            index: true
        },

        preferences: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },

        reminderPreferences: {
            defaultDaysBefore: {
                type: Number,
                min: 0,
                max: 365,
                default: 1
            },
            channels: {
                type: [String],
                enum: ["email", "in_app"],
                default: ["email"]
            },
            quietHours: {
                start: { type: String, default: "22:00" },
                end: { type: String, default: "08:00" }
            }
        },

        avatarUrl: {
            type: String,
            default: ""
        },

        avatarPublicId: {
            type: String,
            default: "",
            select: false
        },

        availability: {
            type: String,
            enum: ["available", "limited", "unavailable"],
            default: "available"
        },

        lookingForTeam: {
            type: Boolean,
            default: false,
            index: true
        },

        discoverable: {
            type: Boolean,
            default: false,
            index: true
        },

        refreshTokenHash: {
            type: String,
            default: null
        },

        emailVerified: {
            type: Boolean,
            default: false
        },

        emailVerificationTokenHash: {
            type: String,
            default: null
        },

        emailVerificationTokenExpiresAt: {
            type: Date,
            default: null
        },

        passwordResetTokenHash: {
            type: String,
            default: null
        },

        passwordResetTokenExpiresAt: {
            type: Date,
            default: null
        },

        deletedAt: {
    type: Date,
    default: null,
    index: true
},

tokenVersion: {
    type: Number,
    default: 0
}

    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);
