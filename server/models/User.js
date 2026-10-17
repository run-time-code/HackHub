
const mongoose = require("mongoose");

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

        googleId: {
            type: String,
            default: null,
            sparse: true,
            unique: true
        },

        githubId: {
            type: String,
            default: null,
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

        skills: {
            type: [String],
            default: [],
            index: true
        },

        preferences: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },

        avatarUrl: {
            type: String,
            default: ""
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
