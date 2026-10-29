'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const feedbackSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: ['general', 'bug', 'feature', 'content'],
      default: 'general',
    },
    message: { type: String, required: true, trim: true, minlength: 5, maxlength: 2000 },
    page: { type: String, default: '', trim: true, maxlength: 300 },
    email: { type: String, default: '', trim: true, maxlength: 200 },
    status: { type: String, default: 'open', index: true },
    userAgent: { type: String, default: '', maxlength: 300 },
  },
  { timestamps: true }
);

feedbackSchema.index({ status: 1, createdAt: -1 });

module.exports =
  mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);
