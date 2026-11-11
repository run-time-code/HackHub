'use strict';

const mongoose = require('mongoose');

const { Schema } = mongoose;

// Short-lived advisory locks shared by every API instance. Cron jobs used to
// rely on module-level booleans, so N instances ran N copies of the same
// sweep. The lock is a single document per job key; the TTL makes a crashed
// holder self-healing.
const jobLockSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    owner: { type: String, required: true },
    acquiredAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: false }
);

module.exports = {
  JobLock: mongoose.models.JobLock || mongoose.model('JobLock', jobLockSchema),
};
