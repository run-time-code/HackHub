'use strict';

// Integration tests for the team APIs: CRUD, list by hackathon and
// leader-only permission checks. Uses an in-memory MongoDB, no external
// services needed. Run with: npm test

process.env.LOG_LEVEL = 'fatal';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

const config = require('../src/config');
const createApp = require('../src/app');

describe('teams', () => {
  let server;
  let base;
  let mongo;
  let hackathonId;
  let leaderToken;
  let otherToken;

  function sign(userId) {
    return jwt.sign({ id: userId, email: `${userId}@test.com`, role: 'student' }, config.jwtSecret);
  }

  async function api(method, path, token, body) {
    const headers = { 'content-type': 'application/json' };
    if (token) {
      headers.authorization = `Bearer ${token}`;
    }
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
    hackathonId = new mongoose.Types.ObjectId().toHexString();
    leaderToken = sign(new mongoose.Types.ObjectId().toHexString());
    otherToken = sign(new mongoose.Types.ObjectId().toHexString());
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

  it('POST /teams requires authentication', async () => {
    const { res, body } = await api('POST', '/teams', null, { name: 'X', hackathonId });
    assert.equal(res.status, 401);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'UNAUTHENTICATED');
  });

  it('POST /teams validates input', async () => {
    const { res, body } = await api('POST', '/teams', leaderToken, { hackathonId });
    assert.equal(res.status, 400);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  let teamId;

  it('POST /teams creates a team with the caller as leader', async () => {
    const { res, body } = await api('POST', '/teams', leaderToken, {
      name: 'Pixel Builders',
      hackathonId,
      rolesNeeded: ['designer'],
    });
    assert.equal(res.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.name, 'Pixel Builders');
    assert.equal(body.data.size, 1);
    assert.equal(body.data.openSlots, 3);
    assert.equal(body.data.status, 'open');
    assert.ok(body.data.leader);
    teamId = body.data.id;
  });

  it('GET /teams requires a hackathonId', async () => {
    const res = await fetch(`${base}/teams`);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  it('GET /teams lists teams linked to the hackathon', async () => {
    const res = await fetch(`${base}/teams?hackathonId=${hackathonId}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.total, 1);
    assert.equal(body.data.items[0].id, teamId);
  });

  it('GET /teams/:id returns one team and 404 for unknown ids', async () => {
    const found = await fetch(`${base}/teams/${teamId}`);
    assert.equal(found.status, 200);
    assert.equal((await found.json()).data.id, teamId);

    const missing = await fetch(`${base}/teams/${new mongoose.Types.ObjectId()}`);
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).error.code, 'TEAM_NOT_FOUND');
  });

  it('PATCH /teams/:id rejects non-leaders', async () => {
    const { res, body } = await api('PATCH', `/teams/${teamId}`, otherToken, { name: 'Hijacked' });
    assert.equal(res.status, 403);
    assert.equal(body.error.code, 'TEAM_FORBIDDEN');
  });

  it('PATCH /teams/:id lets the leader edit allowed fields only', async () => {
    const { res, body } = await api('PATCH', `/teams/${teamId}`, leaderToken, {
      name: 'Pixel Builders v2',
      status: 'closed',
      leader: new mongoose.Types.ObjectId().toHexString(),
    });
    assert.equal(res.status, 400);
    assert.match(body.error.message, /cannot be changed/);

    const ok = await api('PATCH', `/teams/${teamId}`, leaderToken, { name: 'Pixel Builders v2' });
    assert.equal(ok.res.status, 200);
    assert.equal(ok.body.data.name, 'Pixel Builders v2');
  });

  it('PATCH /teams/:id refuses maxTeamSize below the current size', async () => {
    const { res, body } = await api('PATCH', `/teams/${teamId}`, leaderToken, { maxTeamSize: 0 });
    assert.equal(res.status, 400);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  it('DELETE /teams/:id rejects non-leaders and lets the leader delete', async () => {
    const denied = await api('DELETE', `/teams/${teamId}`, otherToken);
    assert.equal(denied.res.status, 403);

    const done = await api('DELETE', `/teams/${teamId}`, leaderToken);
    assert.equal(done.res.status, 200);
    assert.equal(done.body.data.deleted, true);

    const gone = await fetch(`${base}/teams/${teamId}`);
    assert.equal(gone.status, 404);
  });
});
