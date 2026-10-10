'use strict';

// Integration tests for teammate discovery: skill search, availability and
// looking-for-team filters, opt-in privacy, and ranked matches.
// Uses an in-memory MongoDB. Run with: npm test

process.env.LOG_LEVEL = 'fatal';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

const config = require('../src/config');
const createApp = require('../src/app');
const User = require('../models/User');

describe('teammate discovery', () => {
  let server;
  let base;
  let mongo;
  let token;

  function seed(users) {
    return User.insertMany(
      users.map((u, i) => ({
        name: u.name,
        email: `${u.name.replace(/\s+/g, '').toLowerCase()}${i}@test.com`,
        password: 'HashedPlaceholder',
        skills: u.skills || [],
        availability: u.availability || 'available',
        lookingForTeam: u.lookingForTeam ?? false,
        discoverable: u.discoverable ?? false,
      }))
    );
  }

  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    token = jwt.sign(
      { id: new mongoose.Types.ObjectId().toHexString(), email: 'me@test.com', role: 'student' },
      config.jwtSecret
    );
    await seed([
      { name: 'Asha', skills: ['React', 'Node'], availability: 'available', lookingForTeam: true, discoverable: true },
      { name: 'Bala', skills: ['React'], availability: 'limited', lookingForTeam: true, discoverable: true },
      { name: 'Cara', skills: ['React', 'Node'], availability: 'available', lookingForTeam: true, discoverable: false },
      { name: 'Dev', skills: ['Python'], availability: 'available', lookingForTeam: true, discoverable: true },
      { name: 'Esha', skills: ['React'], availability: 'available', lookingForTeam: false, discoverable: true },
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

  function get(path) {
    return fetch(`${base}${path}`, { headers: { authorization: `Bearer ${token}` } });
  }

  it('GET /users/discover requires authentication', async () => {
    const res = await fetch(`${base}/users/discover?skills=react`);
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error.code, 'UNAUTHENTICATED');
  });

  it('finds opted-in teammates by skill, best match first', async () => {
    const res = await get('/users/discover?skills=react,node');
    assert.equal(res.status, 200);
    const body = await res.json();
    const names = body.data.items.map((u) => u.name);
    assert.deepEqual(names, ['Asha', 'Bala']);
    assert.equal(body.data.items[0].matchCount, 2);
    assert.equal(body.data.items[1].matchCount, 1);
  });

  it('never lists users who did not opt in', async () => {
    const res = await get('/users/discover?skills=react,node,python');
    const names = (await res.json()).data.items.map((u) => u.name);
    assert.ok(!names.includes('Cara'), 'private user leaked into discovery');
  });

  it('filters by availability', async () => {
    const res = await get('/users/discover?availability=limited');
    const names = (await res.json()).data.items.map((u) => u.name);
    assert.deepEqual(names, ['Bala']);
  });

  it('defaults to teammates who are looking, and rejects bad filters', async () => {
    const res = await get('/users/discover');
    const names = (await res.json()).data.items.map((u) => u.name);
    assert.ok(!names.includes('Esha'), 'user not looking should be excluded by default');

    const bad = await get('/users/discover?availability=never');
    assert.equal(bad.status, 400);
    assert.equal((await bad.json()).error.code, 'VALIDATION_ERROR');
  });

  it('exposes no sensitive fields', async () => {
    const res = await get('/users/discover?skills=react');
    const item = (await res.json()).data.items[0];
    assert.deepEqual(
      Object.keys(item).sort(),
      ['availability', 'id', 'lookingForTeam', 'matchCount', 'name', 'skills']
    );
  });
});
