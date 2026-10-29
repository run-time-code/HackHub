'use strict';

// Contract tests for GET /team-requests/mine: leaders must see join requests
// aimed at their own teams, including the resolved rows that feed History.

process.env.LOG_LEVEL = 'fatal';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

const config = require('../src/config');
const createApp = require('../src/app');
const Hackathon = require('../models/Hackathon');
const User = require('../models/User');
const { Team } = require('../src/models/team');

describe('GET /team-requests/mine for team leaders', () => {
  let server;
  let base;
  let mongo;
  let leader;
  let requester;
  let outsider;
  let team;
  let tokens = {};
  let requestId;

  function sign(user) {
    return jwt.sign(
      { id: String(user._id), email: user.email, role: user.role },
      config.jwtSecret
    );
  }

  async function api(method, path, token, body) {
    const headers = { 'content-type': 'application/json' };
    if (token) headers.authorization = `Bearer ${token}`;
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { res, body: await res.json() };
  }

  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());

    const hackathon = await Hackathon.create({
      hackathon_id: 'requests-led-2026',
      title: 'Requests Led 2026',
    });
    [leader, requester, outsider] = await User.insertMany([
      { name: 'Leader', email: 'leader@test.com' },
      { name: 'Requester', email: 'requester@test.com' },
      { name: 'Outsider', email: 'outsider@test.com' },
    ]);
    for (const [key, user] of Object.entries({ leader, requester, outsider })) {
      tokens[key] = sign(user);
    }
    team = await Team.create({
      name: 'Led Team',
      hackathon: hackathon._id,
      leader: leader._id,
    });

    await new Promise((resolve) => {
      server = createApp().listen(0, resolve);
    });
    base = `http://localhost:${server.address().port}/api`;

    const created = await api('POST', `/teams/${team._id}/requests`, tokens.requester, {
      message: 'Let me join',
    });
    assert.equal(created.res.status, 201);
    requestId = created.body.data.id;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mongo.stop();
  });

  it('includes a pending request sent to a team the caller leads', async () => {
    const { res, body } = await api('GET', '/team-requests/mine?status=pending', tokens.leader);
    assert.equal(res.status, 200);

    const matches = body.data.items.filter((item) => item.id === requestId);
    assert.equal(matches.length, 1, 'request should appear exactly once');
    const item = matches[0];
    assert.equal(item.type, 'request');
    assert.equal(item.user.id, String(requester._id));
    assert.equal(item.team.id, String(team._id));
    assert.equal(item.team.leader, String(leader._id));
  });

  it('keeps the request in the sender inbox and hides it from non-leaders', async () => {
    const sender = await api('GET', '/team-requests/mine', tokens.requester);
    assert.ok(sender.body.data.items.some((item) => item.id === requestId));

    const outsiderInbox = await api('GET', '/team-requests/mine', tokens.outsider);
    assert.ok(!outsiderInbox.body.data.items.some((item) => item.id === requestId));
  });

  it('keeps resolved requests in the leader history', async () => {
    const accepted = await api('PATCH', `/team-requests/${requestId}`, tokens.leader, {
      action: 'accept',
    });
    assert.equal(accepted.res.status, 200);
    assert.equal(accepted.body.data.status, 'accepted');

    const { body } = await api('GET', '/team-requests/mine', tokens.leader);
    const matches = body.data.items.filter((item) => item.id === requestId);
    assert.equal(matches.length, 1, 'resolved request should remain in the archive');
    assert.equal(matches[0].status, 'accepted');

    const filtered = await api('GET', '/team-requests/mine?status=accepted', tokens.leader);
    assert.ok(filtered.body.data.items.some((item) => item.id === requestId));
  });
});
