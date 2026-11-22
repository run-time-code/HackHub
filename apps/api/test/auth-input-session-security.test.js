'use strict';

process.env.LOG_LEVEL = 'fatal';
process.env.NODE_ENV = 'development';
process.env.DEV_AUTO_VERIFY = 'true';
process.env.JWT_SECRET = 'test-secret';
process.env.ACCESS_TOKEN_SECRET = 'test-access-secret';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

const createApp = require('../src/app');
const User = require('../models/User');
const errorHandler = require('../src/middleware/errorHandler');

describe('authentication and onboarding input/session safeguards', () => {
  let server;
  let base;
  let mongo;

  async function getCsrf() {
    const response = await fetch(`${base}/auth/csrf-token`);
    const body = await response.json();
    return {
      token: body.csrfToken,
      cookie: (response.headers.get('set-cookie') || '').split(';')[0],
    };
  }

  async function mutate(path, { method = 'POST', body, cookies = '' } = {}) {
    const csrf = await getCsrf();
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': csrf.token,
        cookie: [csrf.cookie, cookies].filter(Boolean).join('; '),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { response, body: await response.json() };
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
    if (server) await new Promise((resolve) => server.close(resolve));
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongo) await mongo.stop();
  });

  it('rejects invalid names and passwords according to the browser policy', async () => {
    for (const body of [
      { name: { value: 'Mallory' }, email: 'name@example.com', password: 'Password1!' },
      { name: 'A'.repeat(81), email: 'long-name@example.com', password: 'Password1!' },
      { name: 'Name', email: 'missing-special@example.com', password: 'Password1' },
      { name: 'Name', email: 'missing-number@example.com', password: 'Password!' },
    ]) {
      const { response } = await mutate('/auth/register', { body });
      assert.equal(response.status, 400);
    }

    assert.equal(await User.countDocuments(), 0);
  });

  it('accepts a valid registration after the matching front-end validation', async () => {
    const { response, body } = await mutate('/auth/register', {
      body: {
        name: ' Valid Name ',
        email: ' VALID-REGISTRATION@EXAMPLE.COM ',
        password: 'Password1!',
      },
    });

    assert.equal(response.status, 200);
    assert.equal(body.autoVerified, true);
    const user = await User.findOne({ email: 'valid-registration@example.com' });
    assert.equal(user.name, 'Valid Name');
    assert.equal(user.emailVerified, true);
  });

  it('rejects oversized or control-character onboarding values', async () => {
    const user = await User.create({
      name: 'Onboarding Owner',
      email: 'onboarding-owner@example.com',
      emailVerified: true,
    });
    const token = jwt.sign(
      { id: String(user._id), tokenVersion: 0 },
      process.env.JWT_SECRET
    );

    for (const body of [
      { skills: ['x'.repeat(81)], interests: ['AI'], preferredMode: 'online', location: 'Chennai' },
      { skills: ['React'], interests: ['AI'], preferredMode: 'online', location: 'x'.repeat(101) },
      { skills: ['React\u0000'], interests: ['AI'], preferredMode: 'online', location: 'Chennai' },
    ]) {
      const { response } = await mutate('/users/me/onboarding', {
        method: 'PUT',
        body,
        cookies: `accessToken=${token}`,
      });
      assert.equal(response.status, 400);
    }

    const valid = await mutate('/users/me/onboarding', {
      method: 'PUT',
      body: {
        skills: ['React'],
        interests: ['AI/ML'],
        preferredMode: 'online',
        location: 'Chennai',
      },
      cookies: `accessToken=${token}`,
    });
    assert.equal(valid.response.status, 200);
    const updatedUser = await User.findById(user._id);
    assert.deepEqual(updatedUser.skills, ['React']);
    assert.equal(updatedUser.location, 'Chennai');
  });

  it('revokes an access-token session at logout even without a refresh cookie', async () => {
    const user = await User.create({
      name: 'Access-only Logout',
      email: 'access-only-logout@example.com',
      emailVerified: true,
    });
    const token = jwt.sign(
      { id: String(user._id), tokenVersion: 0 },
      process.env.JWT_SECRET
    );

    const { response } = await mutate('/auth/logout', {
      cookies: `accessToken=${token}`,
    });
    assert.equal(response.status, 200);

    const profile = await fetch(`${base}/users/me`, {
      headers: { cookie: `accessToken=${token}` },
    });
    assert.equal(profile.status, 401);
    assert.equal((await User.findById(user._id)).tokenVersion, 1);
  });

  it('does not disclose internal error details or database codes', () => {
    let responseBody;
    let responseStatus;
    const response = {
      status(status) {
        responseStatus = status;
        return this;
      },
      json(body) {
        responseBody = body;
        return this;
      },
    };

    errorHandler(
      Object.assign(new Error('MongoServerError: private database details'), {
        status: 500,
        code: 11000,
        stack: 'private stack',
      }),
      { id: 'request-id' },
      response,
      () => {}
    );

    assert.equal(responseStatus, 500);
    assert.equal(responseBody.error.code, 'INTERNAL_ERROR');
    assert.equal(responseBody.error.message, 'Something went wrong');
    assert.equal(responseBody.error.stack, undefined);
  });
});
