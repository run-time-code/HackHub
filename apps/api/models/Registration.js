const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    hackathon: {
      type: String,
      required: true,
    },

    registered: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["saved", "registered", "ongoing", "completed"],
      default: "saved",
    },

    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    collection: "Registrations",
  }
);

registrationSchema.index(
  { user: 1, hackathon: 1 },
  { unique: true }
);

module.exports = mongoose.model("Registration", registrationSchema);