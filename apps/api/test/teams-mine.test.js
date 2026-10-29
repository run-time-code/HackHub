'use strict';

// Contract tests for GET /teams/mine: personal team list (leader or member),
// newest-first ordering, hackathon titles and authentication.

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

describe('GET /teams/mine', () => {
  let server;
  let base;
  let mongo;
  let hackathon;
  let leader;
  let member;
  let outsider;
  let leaderToken;
  let ledTeam;
  let joinedTeam;
  let outsiderTeam;

  function sign(user) {
    return jwt.sign(
      { id: String(user._id), email: user.email, role: user.role },
      config.jwtSecret
    );
  }

  async function get(path, token) {
    const res = await fetch(`${base}${path}`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    return { res, body: await res.json() };
  }

  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());

    hackathon = await Hackathon.create({
      hackathon_id: 'mine-hack-2026',
      title: 'Mine Hack 2026',
    });
    [leader, member, outsider] = await User.insertMany([
      { name: 'Leader', email: 'leader@test.com' },
      { name: 'Member', email: 'member@test.com' },
      { name: 'Outsider', email: 'outsider@test.com' },
    ]);
    leaderToken = sign(leader);

    ledTeam = await Team.create({
      name: 'Led Team',
      hackathon: hackathon._id,
      leader: leader._id,
      members: [{ user: member._id, role: 'developer' }],
    });
    joinedTeam = await Team.create({
      name: 'Joined Team',
      hackathon: hackathon._id,
      leader: member._id,
      members: [{ user: leader._id, role: 'designer' }],
    });
    outsiderTeam = await Team.create({
      name: 'Outsider Team',
      hackathon: hackathon._id,
      leader: outsider._id,
    });

    // Make the ordering deterministic without relying on wall-clock timing.
    await Team.collection.updateOne(
      { _id: ledTeam._id },
      { $set: { updatedAt: new Date('2026-01-01T00:00:00.000Z') } }
    );
    await Team.collection.updateOne(
      { _id: joinedTeam._id },
      { $set: { updatedAt: new Date('2026-02-01T00:00:00.000Z') } }
    );

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

  it('requires authentication', async () => {
    const { res, body } = await get('/teams/mine');
    assert.equal(res.status, 401);
    assert.equal(body.error.code, 'UNAUTHENTICATED');
  });

  it('lists led and joined teams only, newest first, with hackathon titles', async () => {
    const { res, body } = await get('/teams/mine', leaderToken);
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.deepEqual(Object.keys(body.data), ['items']);
    assert.deepEqual(
      body.data.items.map((team) => team.id),
      [String(joinedTeam._id), String(ledTeam._id)]
    );
    assert.ok(!body.data.items.some((team) => team.id === String(outsiderTeam._id)));
    for (const team of body.data.items) {
      assert.equal(team.hackathonTitle, 'Mine Hack 2026');
    }
  });

  it('adds hackathonTitle to the public team detail response', async () => {
    const { res, body } = await get(`/teams/${ledTeam._id}`);
    assert.equal(res.status, 200);
    assert.equal(body.data.hackathon, String(hackathon._id));
    assert.equal(body.data.hackathonTitle, 'Mine Hack 2026');
  });
});
