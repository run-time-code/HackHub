'use strict';

// Regression tests for the legacy /saved-hackathons tracking routes:
// identifiers must resolve to a visible catalogue row (no orphan writes, no
// hidden events), notes are bounded, and status follows the event lifecycle
// instead of the registration deadline alone.

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
const SavedHackathon = require('../models/SavedHackathon');
const Registration = require('../models/Registration');

describe('legacy saved-hackathon tracking', () => {
  let server;
  let base;
  let mongo;
  let token;
  let csrf;
  let ongoing;
  let hidden;

  function sign(id) {
    return jwt.sign(
      { id: String(id), email: 'tracker@test.com', role: 'student', tokenVersion: 0 },
      config.jwtSecret
    );
  }

  async function api(method, path, body, options = {}) {
    const headers = { 'content-type': 'application/json' };
    if (options.token !== null) headers.authorization = `Bearer ${token}`;
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

    const user = await User.create({ name: 'Tracker', email: 'tracker@test.com' });
    token = sign(user._id);

    ongoing = await Hackathon.create({
      hackathon_id: 'legacy-ongoing',
      title: 'Legacy Ongoing',
      registrationDeadline: new Date('2020-01-01T00:00:00.000Z'),
      eventStartDate: new Date('2020-01-02T00:00:00.000Z'),
      eventEndDate: new Date('2099-01-02T00:00:00.000Z'),
    });
    await Hackathon.create({
      hackathon_id: 'legacy-completed',
      title: 'Legacy Completed',
      eventStartDate: new Date('2020-01-02T00:00:00.000Z'),
      eventEndDate: new Date('2020-01-03T00:00:00.000Z'),
    });
    await Hackathon.create({
      hackathon_id: 'legacy-undated',
      title: 'Legacy Undated',
    });
    hidden = await Hackathon.create({
      hackathon_id: 'legacy-hidden',
      title: 'Legacy Hidden',
      isHidden: true,
      eventEndDate: new Date('2099-01-02T00:00:00.000Z'),
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

  it('rejects unknown and hidden hackathons on save/register/notes', async () => {
    for (const path of ['/saved-hackathons/save', '/saved-hackathons/register', '/saved-hackathons/notes']) {
      const unknown = await api('POST', path, { hackathon: 'does-not-exist', notes: 'x' });
      assert.equal(unknown.res.status, 404, `${path} accepted an unknown id`);

      const hiddenRes = await api('POST', path, { hackathon: hidden.hackathon_id, notes: 'x' });
      assert.equal(hiddenRes.res.status, 404, `${path} accepted a hidden hackathon`);
    }

    assert.equal(await SavedHackathon.countDocuments({}), 0);
    assert.equal(await Registration.countDocuments({}), 0);
  });

  it('stores the canonical catalogue id for save, register and notes', async () => {
    const saved = await api('POST', '/saved-hackathons/save', {
      hackathon: ongoing.hackathon_id,
    });
    assert.equal(saved.res.status, 200);

    const row = await SavedHackathon.findOne({});
    assert.equal(row.hackathon, ongoing.hackathon_id);

    // ObjectIds resolve to the same canonical key.
    const registered = await api('POST', '/saved-hackathons/register', {
      hackathon: String(ongoing._id),
    });
    assert.equal(registered.res.status, 200);
    assert.equal((await Registration.findOne({})).hackathon, ongoing.hackathon_id);

    const notes = await api('POST', '/saved-hackathons/notes', {
      hackathon: ongoing.hackathon_id,
      notes: 'Bring the demo build.',
    });
    assert.equal(notes.res.status, 200);
    assert.equal((await Registration.findOne({})).notes, 'Bring the demo build.');

    const unsaved = await api('POST', '/saved-hackathons/unsave', {
      hackathon: ongoing.hackathon_id,
    });
    assert.equal(unsaved.res.status, 200);
    assert.equal(await SavedHackathon.countDocuments({}), 0);
  });

  it('bounds note payloads', async () => {
    const notAString = await api('POST', '/saved-hackathons/notes', {
      hackathon: ongoing.hackathon_id,
      notes: 42,
    });
    assert.equal(notAString.res.status, 400);

    const tooLong = await api('POST', '/saved-hackathons/notes', {
      hackathon: ongoing.hackathon_id,
      notes: 'x'.repeat(2001),
    });
    assert.equal(tooLong.res.status, 400);

    const atLimit = await api('POST', '/saved-hackathons/notes', {
      hackathon: ongoing.hackathon_id,
      notes: 'x'.repeat(2000),
    });
    assert.equal(atLimit.res.status, 200);
  });

  it('reports status from the event lifecycle', async () => {
    const running = await api('GET', `/saved-hackathons/status/${ongoing.hackathon_id}`);
    assert.equal(running.res.status, 200);
    assert.equal(running.body.status, 'Ongoing');
    assert.equal(running.body.statusCode, 'ongoing');

    const finished = await api('GET', '/saved-hackathons/status/legacy-completed');
    assert.equal(finished.body.status, 'Completed');
    assert.equal(finished.body.statusCode, 'completed');

    const undated = await api('GET', '/saved-hackathons/status/legacy-undated');
    assert.equal(undated.body.status, 'Upcoming');
    assert.equal(undated.body.statusCode, 'upcoming');

    const hiddenRes = await api('GET', `/saved-hackathons/status/${hidden.hackathon_id}`);
    assert.equal(hiddenRes.res.status, 404);

    const unknown = await api('GET', '/saved-hackathons/status/nope');
    assert.equal(unknown.res.status, 404);
  });
});
