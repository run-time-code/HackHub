'use strict';

// Contract tests for the public stats counters and the anonymous feedback
// intake (validation + persistence).

process.env.LOG_LEVEL = 'fatal';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const createApp = require('../src/app');
const Hackathon = require('../models/Hackathon');
const User = require('../models/User');
const { Team } = require('../src/models/team');
const { JoinRequest } = require('../src/models/joinRequest');
const Feedback = require('../src/models/feedback');

describe('public stats and feedback', () => {
  let server;
  let base;
  let mongo;
  let users;
  let teams;

  async function post(path, body, headers = {}) {
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    return { res, body: await res.json() };
  }

  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());

    const hackathons = await Hackathon.create([
      { hackathon_id: 'visible-one', title: 'Visible One' },
      { hackathon_id: 'visible-two', title: 'Visible Two' },
      { hackathon_id: 'hidden-one', title: 'Hidden One', is_hidden: true },
    ]);

    users = await User.insertMany([
      {
        name: 'Builder One',
        email: 'builder1@test.com',
        discoverable: true,
        deletedAt: null,
      },
      {
        name: 'Builder Two',
        email: 'builder2@test.com',
        discoverable: true,
        deletedAt: null,
      },
      {
        name: 'Deleted Builder',
        email: 'deleted@test.com',
        discoverable: true,
        deletedAt: new Date(),
      },
      {
        name: 'Private Builder',
        email: 'private@test.com',
        discoverable: false,
        deletedAt: null,
      },
    ]);

    teams = await Team.create([
      {
        name: 'Open One',
        hackathon: hackathons[0]._id,
        leader: users[0]._id,
        status: 'open',
      },
      {
        name: 'Open Two',
        hackathon: hackathons[1]._id,
        leader: users[1]._id,
        status: 'open',
      },
      {
        name: 'Closed One',
        hackathon: hackathons[0]._id,
        leader: users[2]._id,
        status: 'closed',
      },
    ]);

    await JoinRequest.create([
      {
        team: teams[0]._id,
        user: users[1]._id,
        initiatedBy: users[1]._id,
        type: 'request',
        status: 'accepted',
      },
      {
        team: teams[1]._id,
        user: users[2]._id,
        initiatedBy: users[2]._id,
        type: 'request',
        status: 'accepted',
      },
      {
        team: teams[0]._id,
        user: users[3]._id,
        initiatedBy: users[3]._id,
        type: 'request',
        status: 'pending',
      },
    ]);

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

  it('GET /stats is public and returns all product counters', async () => {
    const res = await fetch(`${base}/stats`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.deepEqual(body.data, {
      hackathons: 2,
      teams: 3,
      builders: 2,
      openTeams: 2,
      matches: 2,
    });
    assert.ok(body.requestId);
  });

  it('POST /feedback stores an anonymous submission', async () => {
    const { res, body } = await post(
      '/feedback',
      {
        type: 'bug',
        message: 'The team filter resets unexpectedly.',
        page: '/app?section=teams',
        email: 'reporter@example.com',
      },
      { 'user-agent': 'HackHubContractTest/1.0' }
    );

    assert.equal(res.status, 201);
    assert.equal(body.success, true);
    assert.deepEqual(Object.keys(body.data).sort(), ['createdAt', 'id']);

    const saved = await Feedback.findById(body.data.id);
    assert.ok(saved);
    assert.equal(saved.type, 'bug');
    assert.equal(saved.message, 'The team filter resets unexpectedly.');
    assert.equal(saved.page, '/app?section=teams');
    assert.equal(saved.email, 'reporter@example.com');
    assert.equal(saved.status, 'open');
    assert.equal(saved.userAgent, 'HackHubContractTest/1.0');
    assert.ok(saved.createdAt);
  });

  it('validates feedback type, message, page and email', async () => {
    const badType = await post('/feedback', { type: 'praise', message: 'Nice work' });
    assert.equal(badType.res.status, 400);
    assert.equal(badType.body.error.code, 'VALIDATION_ERROR');

    const shortMessage = await post('/feedback', { message: 'no' });
    assert.equal(shortMessage.res.status, 400);

    const longPage = await post('/feedback', {
      message: 'A valid message',
      page: 'x'.repeat(301),
    });
    assert.equal(longPage.res.status, 400);

    const badEmail = await post('/feedback', {
      message: 'A valid message',
      email: 'not-an-email',
    });
    assert.equal(badEmail.res.status, 400);
  });
});
