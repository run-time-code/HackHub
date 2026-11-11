'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

const EVENT_TYPES = ['registration', 'submission', 'event'];
const CHANNELS = ['email', 'in_app'];

const reminderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    hackathon: { type: Schema.Types.ObjectId, ref: 'Hackathon', required: true, index: true },
    eventType: { type: String, enum: EVENT_TYPES, default: 'registration' },
    daysBefore: { type: Number, required: true, min: 0, max: 365 },
    channel: { type: String, enum: CHANNELS, default: 'email' },
    eventAt: { type: Date, default: null },
    remindAt: { type: Date, required: true },
    active: { type: Boolean, default: true },
    deliveredAt: { type: Date, default: null },
    processingUntil: { type: Date, default: null },
    lastError: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true }
);

// One reminder per user/hackathon/event/lead-time/channel. Re-posting the
// same combination is treated as a duplicate rather than creating noise.
reminderSchema.index(
  { user: 1, hackathon: 1, eventType: 1, daysBefore: 1, channel: 1 },
  { unique: true }
);
reminderSchema.index({ user: 1, remindAt: 1 });
reminderSchema.index({ remindAt: 1, deliveredAt: 1, active: 1 });

reminderSchema.set('toJSON', { virtuals: true });

module.exports = {
  Reminder: mongoose.models.Reminder || mongoose.model('Reminder', reminderSchema),
  EVENT_TYPES,
  CHANNELS,
};
