'use strict';

// Cross-instance job locking: exactly one API instance runs a given periodic
// job even when the service is scaled to N replicas.
//
// Ownership is a single document per job key in MongoDB:
//   * a caller first atomically steals the row only if its lease has expired
//     (findOneAndDelete is atomic, so at most one stealer wins);
//   * it then inserts a fresh row (create); a duplicate-key error means
//     another instance already holds a live lease.
// Because only one insert can succeed for a given key, the job body can never
// run twice concurrently, no matter how many instances tick at the same
// millisecond. A crashed holder simply leaves an expired row behind, which
// the next tick steals, so there is no permanent lock and no cleanup job.

const crypto = require('node:crypto');

const { JobLock } = require('../models/jobLock');
const logger = require('./logger');

async function tryAcquire(key, ttlMs) {
  const now = new Date();
  const owner = `${process.pid}:${crypto.randomBytes(8).toString('hex')}`;

  // Free the slot if the previous holder died without releasing it.
  await JobLock.findOneAndDelete({ key, expiresAt: { $lte: now } });

  try {
    await JobLock.create({
      key,
      owner,
      acquiredAt: now,
      expiresAt: new Date(now.getTime() + ttlMs),
    });
    return owner;
  } catch (error) {
    // 11000 = the unique index on `key`: someone else holds a live lease.
    if (error && error.code === 11000) return null;
    throw error;
  }
}

// Runs `callback` only if this instance won the lock; otherwise returns
// { acquired: false } immediately instead of queueing or duplicating work.
async function withJobLock(key, ttlMs, callback) {
  const owner = await tryAcquire(key, ttlMs);
  if (!owner) return { acquired: false };

  try {
    const value = await callback();
    return { acquired: true, value };
  } finally {
    // Owner-scoped release: if our lease already expired and another
    // instance took over, this delete matches nothing and leaves theirs.
    try {
      await JobLock.deleteOne({ key, owner });
    } catch (error) {
      logger.warn({ err: error, key }, '[job-lock] release failed; lease will expire');
    }
  }
}

module.exports = { tryAcquire, withJobLock };
