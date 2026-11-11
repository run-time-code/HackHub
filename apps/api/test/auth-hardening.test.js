'use strict';

// Regression tests for session hardening:
//  - banned accounts cannot log in or refresh a session;
//  - deleted/unverified accounts cannot refresh;
//  - refresh tokens expire server-side and rotate atomically;
//  - logout revokes the still-valid access token;
//  - resend-verification no longer discloses verified accounts.

process.env.LOG_LEVEL = 'fatal';
process.env.JWT_SECRET = 'test-secret';
process.env.ACCESS_TOKEN_SECRET = 'test-access-secret';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');

const createApp = require('../src/app');
const User = require('../models/User');
const { completeOAuthLogin } = require('../controllers/oauthController');

const hash = (value) =>
  crypto.createHash('sha256').update(value).digest('hex');

describe('authentication hardening', () => {
  let server;
  let base;
  let mongo;

  async function csrf() {
    const res = await fetch(`${base}/auth/csrf-token`);
    const payload = await res.json();
    return {
      token: payload.csrfToken,
      cookie: (res.headers.get('set-cookie') || '').split(';')[0],
    };
  }

  async function post(path, body, cookies = '') {
    const token = await csrf();
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': token.token,
        cookie: [token.cookie, cookies].filter(Boolean).join('; '),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return {
      res,
      body: text ? JSON.parse(text) : null,
      setCookie: res.headers.get('set-cookie') || '',
    };
  }

  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    await new Promise((resolve) => {
      server = createApp().listen(0, resolve);
    });
    base = `http://localhost:${server.address().port}/api`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongo) {
      await mongo.stop();
    }
  });

  it('rejects a banned account even with the correct password', async () => {
    await User.create({
      name: 'Banned Login',
      email: 'banned-login@example.com',
      password: await bcrypt.hash('Correct-Pass1!', 10),
      emailVerified: true,
      banned: true,
    });

    const { res, body, setCookie } = await post('/auth/login', {
      email: 'banned-login@example.com',
      password: 'Correct-Pass1!',
    });

    assert.equal(res.status, 403);
    assert.match(body.message, /banned/i);
    assert.doesNotMatch(setCookie, /accessToken=/);
  });

  it('rejects refresh for banned, deleted and unverified accounts', async () => {
    const cases = [
      { email: 'banned-refresh@example.com', banned: true, status: 403 },
      { email: 'deleted-refresh@example.com', deletedAt: new Date(), status: 401 },
      { email: 'unverified-refresh@example.com', emailVerified: false, status: 403 },
    ];

    for (const [index, entry] of cases.entries()) {
      const refreshToken = `refresh-token-${index}`;
      await User.create({
        name: `Refresh ${index}`,
        email: entry.email,
        emailVerified: entry.emailVerified ?? true,
        banned: entry.banned ?? false,
        deletedAt: entry.deletedAt ?? null,
        refreshTokenHash: hash(refreshToken),
        refreshTokenExpiresAt: new Date(Date.now() + 60_000),
      });

      const { res } = await post(
        '/auth/refresh',
        undefined,
        `refreshToken=${refreshToken}`
      );

      assert.equal(res.status, entry.status, entry.email);
    }
  });

  it('rejects an expired server-side refresh token', async () => {
    const refreshToken = 'expired-refresh-token';
    await User.create({
      name: 'Expired Refresh',
      email: 'expired-refresh@example.com',
      emailVerified: true,
      refreshTokenHash: hash(refreshToken),
      refreshTokenExpiresAt: new Date(Date.now() - 1_000),
    });

    const { res } = await post(
      '/auth/refresh',
      undefined,
      `refreshToken=${refreshToken}`
    );

    assert.equal(res.status, 401);
  });

  it('rotates a refresh token only once under concurrency', async () => {
    const refreshToken = 'concurrent-refresh-token';
    await User.create({
      name: 'Concurrent Refresh',
      email: 'concurrent-refresh@example.com',
      emailVerified: true,
      refreshTokenHash: hash(refreshToken),
      refreshTokenExpiresAt: new Date(Date.now() + 60_000),
    });

    const token = await csrf();
    const request = () =>
      fetch(`${base}/auth/refresh`, {
        method: 'POST',
        headers: {
          'x-csrf-token': token.token,
          cookie: `${token.cookie}; refreshToken=${refreshToken}`,
        },
      });

    const responses = await Promise.all([request(), request()]);
    const statuses = responses.map((response) => response.status).sort();

    assert.deepEqual(statuses, [200, 401]);
  });

  it('logout revokes the access token that was still valid', async () => {
    const refreshToken = 'logout-refresh-token';
    const user = await User.create({
      name: 'Logout User',
      email: 'logout@example.com',
      emailVerified: true,
      refreshTokenHash: hash(refreshToken),
      refreshTokenExpiresAt: new Date(Date.now() + 60_000),
    });

    const accessToken = jwt.sign(
      {
        id: String(user._id),
        email: user.email,
        role: user.role,
        tokenVersion: user.tokenVersion ?? 0,
      },
      process.env.JWT_SECRET
    );

    const before = await fetch(`${base}/users/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    assert.equal(before.status, 200);

    const { res } = await post(
      '/auth/logout',
      undefined,
      `refreshToken=${refreshToken}`
    );
    assert.equal(res.status, 200);

    const after = await fetch(`${base}/users/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    assert.equal(after.status, 401);

    const stored = await User.findById(user._id);
    assert.equal(stored.refreshTokenHash, null);
    assert.equal(stored.refreshTokenExpiresAt, null);
    assert.equal(stored.tokenVersion, 1);
  });

  it('does not disclose already-verified accounts on resend', async () => {
    await User.create({
      name: 'Verified Resend',
      email: 'verified-resend@example.com',
      emailVerified: true,
    });

    const exact = await post('/auth/resend-verification', {
      email: 'verified-resend@example.com',
    });
    assert.equal(exact.res.status, 200);
    assert.match(exact.body.message, /If the account exists/);

    // Whitespace/case normalization must happen before validation and lookup.
    const normalized = await post('/auth/resend-verification', {
      email: '  VERIFIED-RESEND@Example.COM  ',
    });
    assert.equal(normalized.res.status, 200);
    assert.match(normalized.body.message, /If the account exists/);

    const unknown = await post('/auth/resend-verification', {
      email: 'nobody-resend@example.com',
    });
    assert.equal(unknown.res.status, 200);
    assert.equal(unknown.body.message, exact.body.message);
  });

  it('rejects OAuth login for a banned provider account', async () => {
    await User.create({
      name: 'Banned OAuth',
      email: 'banned-oauth@example.com',
      googleId: 'google-banned-1',
      emailVerified: true,
      banned: true,
    });

    const res = {
      statusCode: null,
      body: null,
      cookies: [],
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
      cookie(...args) {
        this.cookies.push(args);
        return this;
      },
      redirect() {
        throw new Error('banned OAuth login must not redirect');
      },
    };

    await completeOAuthLogin(
      {
        user: {
          provider: 'google',
          id: 'google-banned-1',
          displayName: 'Banned OAuth',
          emails: [{ value: 'banned-oauth@example.com', verified: true }],
        },
        get: () => 'application/json',
      },
      res
    );

    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /banned/i);
    assert.equal(res.cookies.length, 0);
  });

  it('rejects OAuth linking to a banned local account', async () => {
    await User.create({
      name: 'Banned Link',
      email: 'banned-link@example.com',
      emailVerified: true,
      banned: true,
    });

    const res = {
      statusCode: null,
      body: null,
      cookies: [],
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
      cookie(...args) {
        this.cookies.push(args);
        return this;
      },
    };

    await completeOAuthLogin(
      {
        user: {
          provider: 'github',
          id: 'github-banned-link',
          displayName: 'Banned Link',
          emails: [{ value: 'banned-link@example.com', verified: true }],
        },
        get: () => 'application/json',
      },
      res
    );

    assert.equal(res.statusCode, 403);
    assert.equal(res.cookies.length, 0);

    const stored = await User.findOne({ email: 'banned-link@example.com' });
    assert.equal(stored.githubId, undefined);
  });
});
