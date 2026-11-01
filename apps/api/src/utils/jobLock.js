'use strict';

const crypto = require('node:crypto');

const { JobLock } = require('../models/jobLock');
const logger = require('./logger');

// Acquire, run, release. Exactly one instance runs the callback for a key at a
// time; a second caller gets { acquired: false } immediately instead of
// queueing. Crash safety comes from the TTL, so a lock is never permanent.
async function withJobLock(key, ttlMs, callback) {
  const owner = `${process.pid}:${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);

  try {
    const lock = await JobLock.findOneAndUpdate(
      {
        key,
        $or: [{ expiresAt: { $lte: now } }],
      },
      { $set: { key, owner, acquiredAt: now, expiresAt } },
      { upsert: true, returnDocument: 'after' }
    );

    // upsert can also return the existing, still-valid document when the
    // duplicate-key retry path wins; only the owner runs the job.
    if (!lock || lock.owner !== owner) {
      return { acquired: false };
    }
  } catch (error) {
    // Another instance holds an unexpired lock: the unique index rejects our
    // upsert. That is the expected contention path.
    if (error && error.code === 11000) {
      return { acquired: false };
    }
    throw error;
  }

  try {
    const value = await callback();
    return { acquired: true, value };
  } finally {
    try {
      await JobLock.deleteOne({ key, owner });
    } catch (error) {
      logger.warn({ err: error, key }, '[job-lock] release failed; TTL will expire it');
    }
  }
}

module.exports = { withJobLock };
