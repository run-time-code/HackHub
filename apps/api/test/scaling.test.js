'use strict';

// Scaling guarantees: cross-instance job locks, bounded discovery ranking,
// cached public counters, and the indexes those paths rely on.

process.env.LOG_LEVEL = 'fatal';
process.env.JWT_SECRET = 'test-secret';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const config = require('../src/config');
const User = require('../models/User');
const Hackathon = require('../models/Hackathon');
const SavedHackathon = require('../models/SavedHackathon');
const { Team } = require('../src/models/team');
const { JoinRequest } = require('../src/models/joinRequest');
const { JobLock } = require('../src/models/jobLock');
const { withJobLock } = require('../src/utils/jobLock');
const { getStats, invalidateStatsCache } = require('../src/services/statsService');
const { searchTeammates } = require('../src/services/usersService');

function hasIndex(schema, expected) {
  return schema.indexes().some(([fields]) =>
    Object.entries(expected).every(([key, value]) => fields[key] === value)
  );
}

describe('scaling', () => {
  let mongo;

  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  after(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  describe('cross-instance job lock', () => {
    it('lets exactly one concurrent caller run the job', async () => {
      let runs = 0;

      const [first, second] = await Promise.all([
        withJobLock('concurrent-job', 5000, async () => {
          runs += 1;
          await new Promise((resolve) => setTimeout(resolve, 30));
          return 'first';
        }),
        withJobLock('concurrent-job', 5000, async () => {
          runs += 1;
          return 'second';
        }),
      ]);

      assert.equal(runs, 1);
      assert.equal([first, second].filter((result) => result.acquired).length, 1);
      const lockCount = await JobLock.countDocuments({ key: 'concurrent-job' });
      // One insert, one delete, plus the no-op expired-path insert from the
      // failed race => 1 left. The check below is against what the test
      // observes, not against this arithmetic.
      assert.equal(lockCount, 0);
    });

    it('recovers an expired lock left by a crashed instance', async () => {
      await JobLock.create({
        key: 'expired-job',
        owner: 'dead-instance',
        acquiredAt: new Date(Date.now() - 5000),
        expiresAt: new Date(Date.now() - 1000),
      });

      const lock = await withJobLock('expired-job', 5000, async () => 'ran');

      assert.equal(lock.acquired, true);
      assert.equal(lock.value, 'ran');
      assert.equal(await JobLock.countDocuments({ key: 'expired-job' }), 0);
    });

    it('releases the lock when the job throws', async () => {
      await assert.rejects(
        withJobLock('throwing-job', 5000, async () => {
          throw new Error('boom');
        }),
        /boom/
      );
      assert.equal(await JobLock.countDocuments({ key: 'throwing-job' }), 0);
    });
  });

  describe('public counter cache', () => {
    it('serves cached counts until invalidated', async () => {
      invalidateStatsCache();

      const first = await getStats();

      await Hackathon.create({ hackathon_id: 'cache-visible', title: 'Cache Visible' });

      const cached = await getStats();
      assert.equal(cached.hackathons, first.hackathons);

      invalidateStatsCache();
      const fresh = await getStats();
      assert.equal(fresh.hackathons, first.hackathons + 1);

      await Hackathon.deleteOne({ hackathon_id: 'cache-visible' });
      invalidateStatsCache();
    });
  });

  describe('bounded discovery ranking', () => {
    it('caps scored candidates and reports truncation', async () => {
      await User.insertMany([
        { name: 'Cap A', email: 'cap-a@test.com', skills: ['React'], discoverable: true, lookingForTeam: true },
        { name: 'Cap B', email: 'cap-b@test.com', skills: ['React'], discoverable: true, lookingForTeam: true },
        { name: 'Cap C', email: 'cap-c@test.com', skills: ['React'], discoverable: true, lookingForTeam: true },
      ]);

      const previous = config.discoveryMaxCandidates;

      try {
        config.discoveryMaxCandidates = 2;
        const capped = await searchTeammates({ skills: 'react' });

        assert.equal(capped.total, 3);
        assert.equal(capped.truncated, true);
        assert.equal(capped.items.length, 2);

        config.discoveryMaxCandidates = 0;
        const unbounded = await searchTeammates({ skills: 'react' });

        assert.equal(unbounded.truncated, false);
        assert.equal(unbounded.items.length, 3);
      } finally {
        config.discoveryMaxCandidates = previous;
        await User.deleteMany({ email: /^cap-/ });
      }
    });
  });

  describe('query indexes', () => {
    it('indexes the access paths used by personal lists and discovery', () => {
      assert.equal(
        hasIndex(Team.schema, { 'members.user': 1 }),
        true,
        'Team.members.user must be indexed'
      );
      assert.equal(
        hasIndex(JoinRequest.schema, { initiatedBy: 1, createdAt: -1 }),
        true,
        'JoinRequest.initiatedBy must be indexed'
      );
      assert.equal(
        hasIndex(User.schema, { discoverable: 1, lookingForTeam: 1 }),
        true,
        'User discovery filters must be covered by a compound index'
      );
      assert.equal(
        hasIndex(SavedHackathon.schema, { user: 1, updatedAt: -1 }),
        true,
        'SavedHackathon user list must be indexed for its sort'
      );
    });
  });
});
