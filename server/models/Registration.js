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