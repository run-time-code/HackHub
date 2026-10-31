'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
      // e.g. join_request, request_accepted, invitation, team_full, leader_changed
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, default: '', trim: true, maxlength: 500 },
    data: { type: Schema.Types.Mixed, default: {} },
    reminder: {
      type: Schema.Types.ObjectId,
      ref: 'Reminder',
    },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index(
  { reminder: 1 },
  { unique: true, sparse: true }
);

notificationSchema.set('toJSON', { virtuals: true });

module.exports = {
  Notification:
    mongoose.models.Notification || mongoose.model('Notification', notificationSchema),
};
