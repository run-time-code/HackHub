const mongoose = require("mongoose");

const hackathonSchema = new mongoose.Schema(
    {
        hackathon_id: {
            type: String,
            required: true,
            unique: true
        },

        title: {
            type: String
        },

        registration_deadline: {
            type: String
        },

        is_active: {
            type: Boolean
        }
    },
    {
        collection: "Hackathons"
    }
);

module.exports = mongoose.model("Hackathon", hackathonSchema);