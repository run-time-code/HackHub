'use strict';

// Regression tests for GET /dashboard/summary. The aggregation used to feed
// the Date-typed `registration_deadline` into $dateFromString, which errors on
// a BSON date and (with onError: null) silently marked every saved hackathon
// as completed and returned no upcoming deadlines.

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
const Registration = require('../models/Registration');

describe('GET /dashboard/summary', () => {
  let server;
  let base;
  let mongo;
  let user;
  let token;

  function sign(id) {
    return jwt.sign(
      { id: String(id), email: 'dash@test.com', role: 'student', tokenVersion: 0 },
      config.jwtSecret
    );
  }

  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());

    user = await User.create({ name: 'Dash Owner', email: 'dash@test.com' });
    token = sign(user._id);

    // A registration whose deadline is in the future (should be "ongoing" and
    // appear in upcomingDeadlines) and one in the past ("completed").
    const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    await Hackathon.create({
      hackathon_id: 'dash-soon',
      title: 'Soon Hack',
      registration_deadline: soon,
    });
    await Hackathon.create({
      hackathon_id: 'dash-past',
      title: 'Past Hack',
      registration_deadline: past,
    });

    await Registration.create({ user: user._id, hackathon: 'dash-soon', registered: true });
    await Registration.create({ user: user._id, hackathon: 'dash-past', registered: true });

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

  it('classifies registrations by the stored Date deadline', async () => {
    const res = await fetch(`${base}/dashboard/summary`, {
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();

    const counts = Object.fromEntries(
      (body.statusCounts || []).map((entry) => [entry._id, entry.count])
    );

    assert.equal(counts.ongoing, 1, 'future deadline must be ongoing');
    assert.equal(counts.completed, 1, 'past deadline must be completed');

    assert.equal(body.upcomingDeadlines.length, 1);
    assert.equal(body.upcomingDeadlines[0].title, 'Soon Hack');
  });
});
