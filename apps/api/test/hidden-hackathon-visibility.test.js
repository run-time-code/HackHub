'use strict';

// Regression tests: a hackathon marked hidden must not leak back into
// calendar, saved items, reminders or public counters through the alternate
// spelling of the moderation flag. The catalogue writes both isHidden and
// is_hidden, but old rows/scrapers can carry only one of them.

process.env.LOG_LEVEL = 'fatal';
process.env.JWT_SECRET = 'test-secret';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

const config = require('../src/config');
const createApp = require('../src/app');
const User = require('../models/User');
const Hackathon = require('../models/Hackathon');
const { getStats } = require('../src/services/statsService');

describe('hidden hackathon visibility', () => {
  let server;
  let base;
  let mongo;
  let user;
  let token;
  let csrf;
  let hidden;

  function sign(id) {
    return jwt.sign(
      { id: String(id), email: 'hidden@test.com', role: 'student', tokenVersion: 0 },
      config.jwtSecret
    );
  }

  async function api(method, path, body) {
    const headers = { 'content-type': 'application/json' };
    if (token) headers.authorization = `Bearer ${token}`;
    if (method !== 'GET') {
      headers['x-csrf-token'] = csrf.token;
      headers.cookie = csrf.cookie;
    }
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { res, body: text ? JSON.parse(text) : null };
  }

  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());

    user = await User.create({ name: 'Hidden Owner', email: 'hidden@test.com' });
    token = sign(user._id);

    // Only the camelCase moderation flag is set, which is what the admin
    // controller wrote historically.
    hidden = await Hackathon.create({
      hackathon_id: 'hidden-only-camel',
      title: 'Hidden Hack',
      isHidden: true,
      registration_deadline: new Date('2030-05-15T12:00:00.000Z'),
      event_start_date: new Date('2030-05-18T09:00:00.000Z'),
    });

    await new Promise((resolve) => {
      server = createApp().listen(0, resolve);
    });
    base = `http://localhost:${server.address().port}/api`;

    const boot = await fetch(`${base}/auth/csrf-token`);
    csrf = {
      token: (await boot.json()).csrfToken,
      cookie: (boot.headers.get('set-cookie') || '').split(';')[0],
    };
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mongo.stop();
  });

  it('is excluded from the public catalogue', async () => {
    const { res, body } = await api('GET', '/hackathons');
    assert.equal(res.status, 200);
    assert.equal(body.data.total, 0);
  });

  it('is excluded from the calendar', async () => {
    const { res, body } = await api('GET', '/calendar?month=2030-05');
    assert.equal(res.status, 200);
    assert.equal(body.data.items.length, 0, 'hidden hackathon leaked into the calendar');
  });

  it('cannot be saved or given a reminder', async () => {
    const saved = await api('POST', '/saved', { hackathonId: String(hidden._id) });
    assert.equal(saved.res.status, 404);

    const reminder = await api('POST', '/reminders', {
      hackathonId: String(hidden._id),
      eventType: 'registration',
    });
    assert.equal(reminder.res.status, 404);
  });

  it('is not counted as a public hackathon', async () => {
    const stats = await getStats();
    assert.equal(stats.hackathons, 0);
  });
});
