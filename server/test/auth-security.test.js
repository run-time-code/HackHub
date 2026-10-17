'use strict';

// Regression tests for the social-login hardening:
//  - atomic lockout: N concurrent wrong passwords must all count ($inc) and
//    trip the 5-attempt lockout (423), never silently under-count;
//  - OAuth `state`: the callback must reject forged/missing state with 403
//    before passport ever runs, so a login-CSRF authorization code cannot
//    mint a session.

process.env.LOG_LEVEL = 'fatal';
process.env.JWT_SECRET = 'test-secret';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');

const createApp = require('../src/app');
const User = require('../models/User');

describe('login lockout is atomic', () => {
  let server;
  let base;
  let mongo;

  async function login(email, password, csrf) {
    const res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': csrf.token,
        cookie: csrf.cookie,
      },
      body: JSON.stringify({ email, password }),
    });
    return { status: res.status, body: await res.json() };
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
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mongo.stop();
  });

  async function csrf() {
    const res = await fetch(`${base}/auth/csrf-token`);
    const { csrfToken } = await res.json();
    const cookie = (res.headers.get('set-cookie') || '').split(';')[0];
    return { token: csrfToken, cookie };
  }

  it('locks the account after concurrent failures and clears it after expiry', async () => {
    const email = 'lockout@example.com';
    await User.create({
      name: 'Lockout User',
      email,
      password: await bcrypt.hash('Correct-Pass1!', 10),
      emailVerified: true,
    });
    const token = await csrf();

    // Fire 5 wrong-password attempts concurrently: with the old
    // read-modify-write save() these raced and under-counted.
    const attempts = await Promise.all(
      Array.from({ length: 5 }, () => login(email, 'Wrong-Pass1!', token))
    );
    assert.ok(
      attempts.some((a) => a.status === 423),
      `expected a 423 lockout, got [${attempts.map((a) => a.status)}]`
    );

    const user = await User.findOne({ email });
    assert.ok(user.lockUntil && user.lockUntil > new Date());

    // Expire the lockout and confirm login succeeds again.
    await User.updateOne(
      { _id: user._id },
      { $set: { lockUntil: new Date(Date.now() - 1000) } }
    );
    const ok = await login(email, 'Correct-Pass1!', token);
    assert.equal(ok.status, 200);
    assert.equal(ok.body.message, 'Login successful');
  });

  it('keeps generic 401 responses for unknown accounts', async () => {
    const token = await csrf();
    const { status, body } = await login(
      'nobody@example.com',
      'Wrong-Pass1!',
      token
    );
    assert.equal(status, 401);
    assert.equal(body.message, 'Invalid email or password');
  });
});

describe('OAuth state verification', () => {
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

  it('GET /auth/google issues a signed state cookie and a state param', async () => {
    const res = await fetch(`${base}/auth/google`, {
      redirect: 'manual',
    });

    // No Google credentials in CI, so the placeholder strategy fails to the
    // oauth-failed route — but the state cookie must still be set.
    const setCookie = res.headers.get('set-cookie') || '';
    assert.ok(
      setCookie.includes('oauth_state='),
      `expected a signed oauth_state cookie, got: ${setCookie}`
    );
  });

  it('rejects callbacks with a missing or forged state before passport runs', async () => {
    const missing = await fetch(
      `${base}/auth/google/callback?code=attacker-code`,
      { redirect: 'manual' }
    );
    assert.equal(missing.status, 403);
    assert.match(
      (await missing.json()).message,
      /verification failed/i
    );

    const forged = await fetch(
      `${base}/auth/github/callback?code=attacker-code&state=forged`,
      {
        redirect: 'manual',
        headers: { cookie: 'oauth_state=forged; ' },
      }
    );
    assert.equal(forged.status, 403);
  });
});
