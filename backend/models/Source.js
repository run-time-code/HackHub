const mongoose = require("mongoose");

const sourceSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        website: {
            type: String,
            default: ""
        },

        apiUrl: {
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
        collection: "Sources"
    }
);

module.exports = mongoose.model("Source", sourceSchema);