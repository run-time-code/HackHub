'use strict';

// Smoke tests for the auth surface that the production entrypoint
// (src/app.js) now mounts: the CSRF token endpoint and the session-restore
// route the SPA calls on load.

process.env.LOG_LEVEL = 'fatal';
process.env.JWT_SECRET = 'test-secret';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const { MongoMemoryServer } = require('mongodb-memory-server');

const createApp = require('../src/app');
const User = require('../models/User');

describe('auth routes mounted on the src entrypoint', () => {
  let server;
  let base;
  let mongo;

  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    await new Promise((resolve) => {
      server = createApp().listen(0, resolve);
    });
    base = `http://localhost:${server.address().port}/api`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mongo.stop();
  });

  it('GET /auth/csrf-token issues a token and sets the CSRF cookie', async () => {
    const res = await fetch(`${base}/auth/csrf-token`);

    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(typeof body.csrfToken, 'string');
    assert.ok(res.headers.get('set-cookie')?.includes('psifi.x-csrf-token'));
  });

  it('GET /auth/me restores the session from a signed access token', async () => {
    const user = await User.create({
      name: 'Session User',
      email: 'session@example.com',
      emailVerified: true,
    });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );

    const res = await fetch(`${base}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.user.email, 'session@example.com');
  });

  it('GET /auth/me rejects requests without a token', async () => {
    const res = await fetch(`${base}/auth/me`);
    assert.equal(res.status, 401);
  });

  it('POST /auth/refresh renews the session using a valid refresh token', async () => {
  const refreshToken = crypto.randomBytes(32).toString('hex');
  const refreshTokenHash = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');

  const user = await User.create({
    name: 'Persistent Session User',
    email: 'persistent-session@example.com',
    emailVerified: true,
    refreshTokenHash,
  });

  const csrfRes = await fetch(`${base}/auth/csrf-token`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.get('set-cookie') || '').split(';')[0];

  const res = await fetch(`${base}/auth/refresh`, {
    method: 'POST',
    headers: {
      'x-csrf-token': csrfToken,
      cookie: `${csrfCookie}; refreshToken=${refreshToken}`,
    },
  });

  assert.equal(res.status, 200);

  const setCookie = res.headers.get('set-cookie') || '';
  assert.match(setCookie, /accessToken=/);
  assert.match(setCookie, /refreshToken=/);

  const updatedUser = await User.findById(user._id);
  assert.notEqual(updatedUser.refreshTokenHash, refreshTokenHash);
});

});