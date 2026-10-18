
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
        collection: "Hackathons"
    }
);

module.exports = mongoose.model("Hackathon", hackathonSchema);
