'use strict';

// Contract tests for the enriched teammate-discovery response: search text,
// interest overlap, 70/30 match scoring and privacy-safe fields.

process.env.LOG_LEVEL = 'fatal';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

const config = require('../src/config');
const createApp = require('../src/app');
const User = require('../models/User');

describe('teammate discovery contract', () => {
  let server;
  let base;
  let mongo;
  let token;

  function sign(user) {
    return jwt.sign(
      { id: String(user._id), email: user.email, role: user.role },
      config.jwtSecret
    );
  }

  async function get(path) {
    const res = await fetch(`${base}${path}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    return { res, body: await res.json() };
  }

  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());

    await User.insertMany([
      {
        name: 'Asha',
        email: 'asha@test.com',
        headline: 'AI product builder',
        skills: ['React', 'Node.js'],
        skillProficiency: { React: 'advanced', 'Node.js': 'intermediate' },
        preferences: { interests: ['AI', 'Climate'] },
        location: 'Chennai',
        college: 'IIT Madras',
        year: '3rd year',
        avatarUrl: 'https://cdn.example.com/asha.png',
        availability: 'available',
        lookingForTeam: true,
        discoverable: true,
      },
      {
        name: 'Bala',
        email: 'bala@test.com',
        headline: 'Backend engineer',
        skills: ['React'],
        skillProficiency: { React: 'beginner' },
        preferences: { interests: ['AI'] },
        availability: 'limited',
        lookingForTeam: true,
        discoverable: true,
      },
      {
        name: 'Cara',
        email: 'cara@test.com',
        headline: 'Design systems lead',
        skills: ['React'],
        preferences: { interests: ['Design'] },
        availability: 'available',
        lookingForTeam: true,
        discoverable: true,
      },
      {
        name: 'Dev',
        email: 'dev@test.com',
        headline: 'Climate data scientist',
        skills: ['Python'],
        preferences: { interests: ['Climate'] },
        availability: 'available',
        lookingForTeam: true,
        discoverable: true,
      },
      {
        name: 'Eve',
        email: 'eve@test.com',
        headline: 'Private AI builder',
        skills: ['React'],
        preferences: { interests: ['AI'] },
        lookingForTeam: true,
        discoverable: false,
      },
      {
        name: 'Fina',
        email: 'fina@test.com',
        skills: ['React'],
        lookingForTeam: true,
        discoverable: true,
        banned: true,
      },
      {
        name: 'Gopal',
        email: 'gopal@test.com',
        skills: ['React'],
        lookingForTeam: true,
        discoverable: true,
        deletedAt: new Date(),
      },
      {
        name: 'Esha',
        email: 'esha@test.com',
        skills: ['React'],
        lookingForTeam: false,
        discoverable: true,
      },
    ]);

    const current = await User.create({
      name: 'Current User',
      email: 'current@test.com',
    });
    token = sign(current);

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

  it('searches name, headline and skills case-insensitively', async () => {
    const byHeadline = await get('/users/discover?q=AI%20PRODUCT');
    assert.equal(byHeadline.res.status, 200);
    assert.deepEqual(byHeadline.body.data.items.map((u) => u.name), ['Asha']);

    const bySkill = await get('/users/discover?q=react');
    const names = bySkill.body.data.items.map((u) => u.name);
    assert.deepEqual(names, ['Asha', 'Bala', 'Cara']);
    assert.ok(!names.includes('Eve'), 'private user leaked through q search');
  });

  it('filters by interests and ranks by overlap', async () => {
    const { res, body } = await get('/users/discover?interests=AI,Climate');
    assert.equal(res.status, 200);
    assert.equal(body.data.total, 3);
    assert.deepEqual(body.data.items.map((u) => u.name), ['Asha', 'Bala', 'Dev']);

    const [asha, bala, dev] = body.data.items;
    assert.equal(asha.matchScore, 100);
    assert.equal(bala.matchScore, 50);
    assert.equal(dev.matchScore, 50);
    assert.deepEqual(asha.matchedInterests, ['AI', 'Climate']);
    assert.deepEqual(bala.matchedInterests, ['AI']);
    assert.deepEqual(asha.matchedSkills, []);
  });

  it('weights skill overlap at 70% and interest overlap at 30%', async () => {
    const { res, body } = await get(
      '/users/discover?skills=React,Node.js&interests=AI,Climate'
    );
    assert.equal(res.status, 200);
    assert.equal(body.data.total, 2);
    assert.deepEqual(body.data.items.map((u) => u.name), ['Asha', 'Bala']);

    const [asha, bala] = body.data.items;
    assert.equal(asha.matchScore, 100);
    assert.deepEqual(asha.matchedSkills, ['React', 'Node.js']);
    assert.deepEqual(asha.matchedInterests, ['AI', 'Climate']);
    assert.equal(bala.matchScore, 50);
    assert.deepEqual(bala.matchedSkills, ['React']);
    assert.deepEqual(bala.matchedInterests, ['AI']);
  });

  it('returns zero scores when no skill or interest filter is given', async () => {
    const { body } = await get('/users/discover');
    assert.deepEqual(body.data.items.map((u) => u.name), ['Asha', 'Bala', 'Cara', 'Dev']);
    for (const item of body.data.items) {
      assert.equal(item.matchScore, 0);
      assert.deepEqual(item.matchedSkills, []);
      assert.deepEqual(item.matchedInterests, []);
    }
  });

  it('returns profile enrichment without contact details', async () => {
    const { body } = await get('/users/discover?q=asha');
    const item = body.data.items[0];
    assert.equal(item.headline, 'AI product builder');
    assert.equal(item.location, 'Chennai');
    assert.equal(item.college, 'IIT Madras');
    assert.equal(item.year, '3rd year');
    assert.equal(item.avatarUrl, 'https://cdn.example.com/asha.png');
    assert.equal(item.skillProficiency.React, 'advanced');
    assert.equal(item.email, undefined);
    assert.equal(item.preferences, undefined);
  });

  it('rejects more than ten interests', async () => {
    const many = Array.from({ length: 11 }, (_, i) => `interest${i}`).join(',');
    const { res, body } = await get(`/users/discover?interests=${many}`);
    assert.equal(res.status, 400);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });
});
