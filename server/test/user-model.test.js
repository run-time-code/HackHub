'use strict';

// Regression tests for the User model indexes: password-only users must be
// insertable more than once (a null default on googleId/githubId used to be
// written for every user, and the unique sparse index treated the explicit
// nulls as duplicates — the second registration failed with E11000).

process.env.LOG_LEVEL = 'fatal';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('../models/User');

describe('user model provider-id indexes', () => {
  let mongo;

  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    await User.init();
  });

  after(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  it('allows many password-only users (no googleId/githubId stored)', async () => {
    await User.create({ name: 'A', email: 'a@example.com', password: 'x' });
    await User.create({ name: 'B', email: 'b@example.com', password: 'x' });

    assert.equal(await User.countDocuments(), 2);
  });

  it('keeps googleId unique across users', async () => {
    await User.create({ name: 'C', email: 'c@example.com', googleId: 'g-1' });

    await assert.rejects(
      User.create({ name: 'D', email: 'd@example.com', googleId: 'g-1' }),
      (err) => err.code === 11000
    );
  });

  it('keeps githubId unique across users', async () => {
    await User.create({ name: 'E', email: 'e@example.com', githubId: 'h-1' });

    await assert.rejects(
      User.create({ name: 'F', email: 'f@example.com', githubId: 'h-1' }),
      (err) => err.code === 11000
    );
  });
});