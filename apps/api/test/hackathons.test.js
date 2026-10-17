'use strict';

// Regression tests for the QA fix round (owner: Senthil Raja R):
// public hackathon catalogue (F-05a), orphan-team rejection, member
// leave/remove + reopen (F-17), friendly validation messages (F-23).
// Uses an in-memory MongoDB. Run with: npm test

process.env.LOG_LEVEL = 'fatal';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

const config = require('../src/config');
const createApp = require('../src/app');
const Hackathon = require('../models/Hackathon');

describe('hackathons catalogue + membership (QA fixes)', () => {
  let server;
  let base;
  let mongo;
  let leaderToken;
  let memberToken;
  let memberId;
  let outsiderToken;

  function sign(userId) {
    return jwt.sign({ id: userId, email: `${userId}@test.com`, role: 'student' }, config.jwtSecret);
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

  let hackathon;
  let hidden;

  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    [hackathon, hidden] = await Hackathon.create([
      { hackathon_id: 'pixel-hack-2026', title: 'Pixel Hack 2026' },
      { hackathon_id: 'hidden-hack', title: 'Hidden Hack', is_hidden: true },
    ]);
    const leaderId = new mongoose.Types.ObjectId().toHexString();
    memberId = new mongoose.Types.ObjectId().toHexString();
    leaderToken = sign(leaderId);
    memberToken = sign(memberId);
    outsiderToken = sign(new mongoose.Types.ObjectId().toHexString());
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

  it('GET /hackathons lists visible rows with search + pagination', async () => {
    const res = await fetch(`${base}/hackathons?q=pixel&page=1&limit=10`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.total, 1);
    assert.equal(body.data.items[0].slug, 'pixel-hack-2026');
    assert.ok(body.data.items[0].id);
  });

  it('GET /hackathons/:id accepts ObjectId or slug, hides hidden rows', async () => {
    const byId = await fetch(`${base}/hackathons/${hackathon._id}`);
    assert.equal(byId.status, 200);
    assert.equal((await byId.json()).data.slug, 'pixel-hack-2026');

    const bySlug = await fetch(`${base}/hackathons/pixel-hack-2026`);
    assert.equal(bySlug.status, 200);

    const missing = await fetch(`${base}/hackathons/nope`);
    assert.equal(missing.status, 404);

    const hiddenRow = await fetch(`${base}/hackathons/${hidden._id}`);
    assert.equal(hiddenRow.status, 404);
  });

  it('POST /teams rejects unknown hackathons instead of orphaning teams', async () => {
    const fake = new mongoose.Types.ObjectId().toHexString();
    const { res, body } = await api('POST', '/teams', leaderToken, {
      name: 'Orphan Team',
      hackathonId: fake,
    });
    assert.equal(res.status, 400);
    assert.match(body.error.message, /existing hackathon/);
  });

  it('member leave/remove + reopen, permissions, friendly validation', async () => {
    const created = await api('POST', '/teams', leaderToken, {
      name: 'QA Crew',
      hackathonId: String(hackathon._id),
      maxTeamSize: 2,
    });
    assert.equal(created.res.status, 201);
    const teamId = created.body.data.id;

    // Validation messages are stable, not Mongoose internals.
    const bad = await api('PATCH', `/teams/${teamId}`, leaderToken, { name: 'x'.repeat(200) });
    assert.equal(bad.res.status, 400);
    assert.doesNotMatch(bad.body.error.message, /Path `name`/);

    // Non-leader cannot remove others.
    const denied = await api('DELETE', `/teams/${teamId}/members/${memberId}`, outsiderToken);
    assert.equal(denied.res.status, 403);

    // Unknown member -> 404 MEMBER_NOT_FOUND.
    const unknown = await api(
      'DELETE',
      `/teams/${teamId}/members/${new mongoose.Types.ObjectId()}`,
      leaderToken
    );
    assert.equal(unknown.res.status, 404);
    assert.equal(unknown.body.error.code, 'MEMBER_NOT_FOUND');

    // Leader cannot leave without transferring.
    const leaderLeave = await api('DELETE', `/teams/${teamId}/members/${created.body.data.leader}`, leaderToken);
    assert.equal(leaderLeave.res.status, 400);

    // Close the team, add flow via direct accept is covered elsewhere; here
    // exercise reopen: manually close then remove a member.
    const { Team } = require('../src/models/team');
    const { JoinRequest } = require('../src/models/joinRequest');
    const team = await Team.findById(teamId);
    team.members.push({ user: memberId, role: 'member', joinedAt: new Date() });
    team.status = 'closed';
    await team.save();
    await JoinRequest.create({
      team: team._id,
      user: memberId,
      type: 'request',
      initiatedBy: memberId,
      status: 'accepted',
    });

    const left = await api('DELETE', `/teams/${teamId}/members/${memberId}`, memberToken);
    assert.equal(left.res.status, 200);
    assert.equal(left.body.data.status, 'open');
  });
});
