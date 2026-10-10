'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

// One membership = one non-leader seat on a team. Embedded in Team
// (there is no standalone memberships collection in the DB design).
const membershipSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, trim: true, default: 'member', maxlength: 50 },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const teamSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 80 },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    hackathon: { type: Schema.Types.ObjectId, ref: 'Hackathon', required: true, index: true },
    leader: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    members: { type: [membershipSchema], default: [] },
    rolesNeeded: {
      type: [String],
      default: [],
      validate: {
        validator(roles) {
          return (
            Array.isArray(roles) &&
            roles.length <= 10 &&
            roles.every((r) => typeof r === 'string' && r.trim().length > 0 && r.trim().length <= 50)
          );
        },
        message: 'rolesNeeded must be an array of up to 10 non-empty strings',
      },
    },
    maxTeamSize: { type: Number, default: 4, min: 2, max: 10 },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
  },
  { timestamps: true }
);

teamSchema.index({ hackathon: 1, status: 1 });

teamSchema.virtual('size').get(function size() {
  return 1 + this.members.length;
});

teamSchema.set('toJSON', { virtuals: true });
teamSchema.set('toObject', { virtuals: true });

module.exports = {
  Team: mongoose.models.Team || mongoose.model('Team', teamSchema),
  membershipSchema,
};
