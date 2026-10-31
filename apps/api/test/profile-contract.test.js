'use strict';

// Contract tests for the extended profile payload: update/read round-trip,
// safe links, skill proficiency pruning and public-profile privacy.

process.env.LOG_LEVEL = 'fatal';
// Legacy profile routes verify against the configured env secret, so set it
// before requiring config/app (the src team routes have a fallback).
process.env.JWT_SECRET = 'test-secret';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

const config = require('../src/config');
const createApp = require('../src/app');
const cloudinary = require('../config/cloudinary');
const User = require('../models/User');

describe('profile contract', () => {
  let server;
  let base;
  let mongo;
  let user;
  let token;
  let csrf;

  async function bootstrapCsrf() {
    const res = await fetch(`${base}/auth/csrf-token`);
    const body = await res.json();
    return {
      token: body.csrfToken,
      cookie: (res.headers.get('set-cookie') || '').split(';')[0],
    };
  }

  async function put(path, body) {
    const res = await fetch(`${base}${path}`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        'x-csrf-token': csrf.token,
        cookie: csrf.cookie,
      },
      body: JSON.stringify(body),
    });
    return { res, body: await res.json() };
  }

  async function get(path) {
    const res = await fetch(`${base}${path}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    return { res, body: await res.json() };
  }

  async function remove(path) {
    const res = await fetch(`${base}${path}`, {
      method: 'DELETE',
      headers: {
        authorization: 'Bearer '.concat(token),
        'x-csrf-token': csrf.token,
        cookie: csrf.cookie,
      },
    });
    return { res, body: await res.json() };
  }

  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());

    user = await User.create({
      name: 'Profile Owner',
      email: 'owner@test.com',
      password: 'HashedPlaceholder',
    });
    token = jwt.sign(
      { id: String(user._id), email: user.email, role: user.role },
      config.jwtSecret
    );

    await new Promise((resolve) => {
      server = createApp().listen(0, resolve);
    });
    base = `http://localhost:${server.address().port}/api`;
    csrf = await bootstrapCsrf();
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mongo.stop();
  });

  it('GET /users/me returns the full own-profile shape with defaults', async () => {
    const { res, body } = await get('/users/me');
    assert.equal(res.status, 200, JSON.stringify(body));

    assert.deepEqual(Object.keys(body.user).sort(), [
      'availability',
      'avatarUrl',
      'bio',
      'college',
      'createdAt',
      'discoverable',
      'email',
      'emailVerified',
      'headline',
      'id',
      'links',
      'location',
      'lookingForTeam',
      'name',
      'pastHackathons',
      'preferences',
      'role',
      'skillProficiency',
      'skills',
      'updatedAt',
      'year',
    ]);
    assert.deepEqual(body.user.links, { github: '', linkedin: '', portfolio: '' });
    assert.deepEqual(body.user.pastHackathons, []);
    assert.deepEqual(body.user.skillProficiency, {});
    assert.equal(body.user.headline, '');
    assert.equal(body.user.year, '');
    assert.equal(body.user.password, undefined);
    assert.equal(body.user.refreshTokenHash, undefined);
  });

  it('PUT /users/me persists every profile field and returns the full shape', async () => {
    const { res, body } = await put('/users/me', {
      headline: 'Full-stack builder',
      year: 'Final year',
      bio: 'I build hackathon products.',
      college: 'IIT Madras',
      location: 'Chennai',
      links: {
        github: 'https://github.com/asha',
        linkedin: 'https://www.linkedin.com/in/asha',
      },
      pastHackathons: [
        {
          name: 'Pixel Hack',
          year: '2025',
          projectUrl: 'https://example.com/pixel-hack',
        },
      ],
      skillProficiency: {
        React: 'advanced',
        'Node.js': 'intermediate',
      },
      availability: 'limited',
      lookingForTeam: true,
      discoverable: true,
      preferences: { interests: ['AI'], preferredMode: 'hybrid' },
    });

    assert.equal(res.status, 200);
    assert.equal(body.user.headline, 'Full-stack builder');
    assert.equal(body.user.year, 'Final year');
    assert.equal(body.user.availability, 'limited');
    assert.equal(body.user.lookingForTeam, true);
    assert.equal(body.user.discoverable, true);
    assert.deepEqual(body.user.links, {
      github: 'https://github.com/asha',
      linkedin: 'https://www.linkedin.com/in/asha',
      portfolio: '',
    });
    assert.deepEqual(body.user.pastHackathons, [
      {
        name: 'Pixel Hack',
        year: '2025',
        projectUrl: 'https://example.com/pixel-hack',
      },
    ]);
    assert.deepEqual(body.user.skillProficiency, {
      React: 'advanced',
      'Node.js': 'intermediate',
    });
    assert.equal(body.user.emailVerified, false);
    assert.ok(body.user.createdAt);
    assert.ok(body.user.updatedAt);
  });

  it('merges links and skillProficiency instead of dropping existing entries', async () => {
    const { res, body } = await put('/users/me', {
      links: { portfolio: 'https://asha.dev' },
      skillProficiency: { React: 'expert' },
    });

    assert.equal(res.status, 200);
    assert.deepEqual(body.user.links, {
      github: 'https://github.com/asha',
      linkedin: 'https://www.linkedin.com/in/asha',
      portfolio: 'https://asha.dev',
    });
    assert.deepEqual(body.user.skillProficiency, {
      React: 'expert',
      'Node.js': 'intermediate',
    });

    const persisted = await get('/users/me');
    assert.deepEqual(persisted.body.user.links, body.user.links);
    assert.deepEqual(persisted.body.user.skillProficiency, body.user.skillProficiency);
  });

  it('rejects unsafe links, invalid proficiency values and empty updates', async () => {
    const unsafe = await put('/users/me', {
      links: { github: 'javascript:alert(1)' },
    });
    assert.equal(unsafe.res.status, 400);
    assert.equal(unsafe.body.message, 'Invalid profile data');

    const badLevel = await put('/users/me', {
      skillProficiency: { React: 'wizard' },
    });
    assert.equal(badLevel.res.status, 400);

    const empty = await put('/users/me', {});
    assert.equal(empty.res.status, 400);
  });

  it('prunes skill proficiency when skills are removed via PUT /users/skills', async () => {
    const updated = await put('/users/skills', { skills: ['Node.js'] });
    assert.equal(updated.res.status, 200);
    assert.deepEqual(updated.body.skills, ['Node.js']);

    const { body } = await get('/users/me');
    assert.deepEqual(body.user.skills, ['Node.js']);
    assert.deepEqual(body.user.skillProficiency, { 'Node.js': 'intermediate' });
  });

  it('removes a profile avatar from the account record', async () => {
    user.avatarUrl = 'https://cdn.example.com/legacy-avatar.png';
    await user.save();

    const { res, body } = await remove('/users/avatar');
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.equal(body.avatarUrl, '');
    assert.equal((await User.findById(user._id)).avatarUrl, '');
  });

  it('returns an actionable service error when avatar storage is not configured', async () => {
    const previousConfig = cloudinary.config();
    cloudinary.config({ cloud_name: '', api_key: '', api_secret: '' });
    try {
      const form = new FormData();
      form.append('avatar', new Blob(['image'], { type: 'image/png' }), 'avatar.png');
      const res = await fetch(`${base}/users/avatar`, {
        method: 'PUT',
        headers: {
          authorization: 'Bearer '.concat(token),
          'x-csrf-token': csrf.token,
          cookie: csrf.cookie,
        },
        body: form,
      });
      assert.equal(res.status, 503, JSON.stringify(await res.clone().json()));
      assert.match((await res.json()).message, /CLOUDINARY_CLOUD_NAME/);
    } finally {
      cloudinary.config(previousConfig);
    }
  });

  it('GET /users/public/:id never exposes private profile fields', async () => {
    const res = await fetch(`${base}/users/public/${user._id}`);
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.deepEqual(Object.keys(body.user).sort(), [
      'availability',
      'avatarUrl',
      'bio',
      'college',
      'createdAt',
      'headline',
      'id',
      'links',
      'location',
      'lookingForTeam',
      'name',
      'pastHackathons',
      'skillProficiency',
      'skills',
      'year',
    ]);
    assert.equal(body.user.email, undefined);
    assert.equal(body.user.preferences, undefined);
    assert.equal(body.user.discoverable, undefined);
    assert.equal(body.user.password, undefined);
    assert.equal(body.user.refreshTokenHash, undefined);
    assert.equal(body.user.headline, 'Full-stack builder');
    assert.equal(body.user.year, 'Final year');
  });
});
