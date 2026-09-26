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

        password: {
            type: String,
            required: true
        },

        role: {
            type: String,
            enum: ["student", "admin"],
            default: "student"
        },

        skills: {
            type: [String],
            default: []
        },

        interests: {
            type: [String],
            default: []
        },

        technologyDomains: {
            type: [String],
            default: []
        },

        bio: {
            type: String,
            default: "",
            trim: true
        },

        githubUrl: {
            type: String,
            default: "",
            trim: true
        },

        linkedinUrl: {
            type: String,
            default: "",
            trim: true
        },

        profileImage: {
            type: String,
            default: ""
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
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);