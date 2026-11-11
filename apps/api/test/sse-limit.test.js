'use strict';

// Regression tests for the notification SSE stream cap. Streams are
// long-lived sockets, so an account may hold only a few at a time and an
// instance has a hard total ceiling.

process.env.LOG_LEVEL = 'fatal';
process.env.JWT_SECRET = 'test-secret';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

const config = require('../src/config');
const createApp = require('../src/app');
const User = require('../models/User');
const limiter = require('../src/utils/sseLimiter');

describe('notification SSE stream limit', () => {
  let server;
  let base;
  let mongo;
  let token;
  const open = [];

  function openStream() {
    return new Promise((resolve, reject) => {
      const req = http.get(
        `${base}/notifications/stream`,
        { headers: { authorization: `Bearer ${token}` } },
        (res) => resolve({ req, res })
      );
      req.on('error', reject);
    });
  }

  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());

    const user = await User.create({ name: 'SSE User', email: 'sse@test.com' });
    token = jwt.sign(
      { id: String(user._id), email: user.email, role: user.role, tokenVersion: 0 },
      config.jwtSecret
    );

    await new Promise((resolve) => {
      server = createApp().listen(0, resolve);
    });
    base = `http://localhost:${server.address().port}/api`;
  });

  after(async () => {
    for (const { req } of open) req.destroy();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mongo.stop();
  });

  it('rejects the fourth concurrent stream for one account and recovers after close', async () => {
    for (let index = 0; index < limiter.MAX_STREAMS_PER_USER; index += 1) {
      const connection = await openStream();
      open.push(connection);
      assert.equal(connection.res.statusCode, 200);
    }

    const rejected = await openStream();
    assert.equal(rejected.res.statusCode, 429);
    rejected.res.resume();
    rejected.req.destroy();

    for (const { req } of open.splice(0)) req.destroy();

    // Wait for the server to observe the closed sockets and release slots.
    let statusCode = 0;
    for (let attempt = 0; attempt < 20 && statusCode !== 200; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const probe = await openStream();
      statusCode = probe.res.statusCode;
      if (statusCode === 200) {
        probe.req.destroy();
      } else {
        probe.res.resume();
        probe.req.destroy();
      }
    }

    assert.equal(statusCode, 200, 'closing streams must release their slots');

    // Let the last probe's close reach the server before the accounting test.
    for (let attempt = 0; attempt < 20 && limiter.stats().total !== 0; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.equal(limiter.stats().total, 0);
  });

  it('enforces per-user and instance ceilings', () => {
    assert.equal(limiter.MAX_STREAMS_PER_USER > 0, true);
    assert.equal(limiter.MAX_STREAMS_TOTAL > limiter.MAX_STREAMS_PER_USER, true);

    const user = 'limit-unit-user';
    for (let index = 0; index < limiter.MAX_STREAMS_PER_USER; index += 1) {
      assert.equal(limiter.tryAcquire(user), true);
    }
    assert.equal(limiter.tryAcquire(user), false);
    limiter.release(user);
    assert.equal(limiter.tryAcquire(user), true);

    for (let index = 0; index < limiter.MAX_STREAMS_PER_USER + 1; index += 1) {
      limiter.release(user);
    }
    assert.equal(limiter.stats().total, 0, 'all released slots must be reclaimed');
  });
});
