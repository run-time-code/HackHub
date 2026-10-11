const mongoose = require("mongoose");

const tagSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        }
    },
    {
        timestamps: true,
        collection: "Tags"
    }
);

module.exports = mongoose.model("Tag", tagSchema);