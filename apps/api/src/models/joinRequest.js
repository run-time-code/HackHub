'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

// One document covers both directions of the team handshake:
//   type=request  user asks to join a team    (initiatedBy = requester)
//   type=invite   leader invites a user       (initiatedBy = leader)
//
// The lifecycle is pending -> accepted | declined | cancelled | expired.
const PENDING_STATUS = 'pending';

const joinRequestSchema = new Schema(
  {
    team: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['request', 'invite'], default: 'request', index: true },
    initiatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, trim: true, default: 'member', maxlength: 50 },
    message: { type: String, default: '', trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'cancelled', 'expired'],
      default: PENDING_STATUS,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// A user can have at most one *pending* request/invite per team, in either
// direction. Resolved rows stay around as history.
joinRequestSchema.index(
  { team: 1, user: 1 },
  { unique: true, partialFilterExpression: { status: PENDING_STATUS } }
);
joinRequestSchema.index({ user: 1, type: 1, createdAt: -1 });
joinRequestSchema.index({ team: 1, status: 1, createdAt: -1 });

joinRequestSchema.set('toJSON', { virtuals: true });

module.exports = {
  JoinRequest:
    mongoose.models.JoinRequest || mongoose.model('JoinRequest', joinRequestSchema),
  PENDING_STATUS,
};
