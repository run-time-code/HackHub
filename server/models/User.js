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
    default: []
},

preferences: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
},

avatarUrl: {
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
},
    },
    {
        timestamps: true
    }


);

module.exports = mongoose.model("User", userSchema);