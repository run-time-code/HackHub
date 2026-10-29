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
            required: true,
            select: false
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
            default: null,
            select: false
        },

        refreshTokenExpiresAt: {
            type: Date,
            default: null,
            select: false
        },

        emailVerified: {
            type: Boolean,
            default: false
        },

        emailVerificationTokenHash: {
            type: String,
            default: null,
            select: false
        },

        emailVerificationTokenExpiresAt: {
            type: Date,
            default: null,
            select: false
        },

        passwordResetTokenHash: {
            type: String,
            default: null,
            select: false
        },

        passwordResetTokenExpiresAt: {
            type: Date,
            default: null,
            select: false
        },

        timeZone: {
            type: String,
            default: "UTC",
            trim: true,
            validate: {
                validator(value) {
                    try {
                        new Intl.DateTimeFormat("en-US", {
                            timeZone: value
                        });
                        return true;
                    } catch {
                        return false;
                    }
                },
                message: "timeZone must be a valid IANA time zone"
            }
        },

        reminderPreferences: {
            enabled: {
                type: Boolean,
                default: true
            },

            emailReminders: {
                type: Boolean,
                default: true
            },

            registrationDeadlineHours: {
                type: [Number],
                default: [24],
                validate: {
                    validator(values) {
                        return values.every(
                            (value) => Number.isFinite(value) && value >= 0
                        );
                    },
                    message: "Reminder offsets must be non-negative numbers"
                }
            },

            submissionDeadlineHours: {
                type: [Number],
                default: [24],
                validate: {
                    validator(values) {
                        return values.every(
                            (value) => Number.isFinite(value) && value >= 0
                        );
                    },
                    message: "Reminder offsets must be non-negative numbers"
                }
            },

            eventStartHours: {
                type: [Number],
                default: [24],
                validate: {
                    validator(values) {
                        return values.every(
                            (value) => Number.isFinite(value) && value >= 0
                        );
                    },
                    message: "Reminder offsets must be non-negative numbers"
                }
            },

            eventEndHours: {
                type: [Number],
                default: [],
                validate: {
                    validator(values) {
                        return values.every(
                            (value) => Number.isFinite(value) && value >= 0
                        );
                    },
                    message: "Reminder offsets must be non-negative numbers"
                }
            }
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);