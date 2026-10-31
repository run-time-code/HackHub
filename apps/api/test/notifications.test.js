'use strict';

// Integration tests for in-app notifications: list, unread filter, mark
// read, ownership isolation, polling fallback and the SSE stream.
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
const notificationsService = require('../src/services/notificationsService');

describe('notifications', () => {
  let server;
  let base;
  let mongo;
  let token;
  let otherToken;
  let userId;

  function sign(id) {
    return jwt.sign({ id, email: `${id}@test.com`, role: 'student' }, config.jwtSecret);
  }

  async function api(method, path, options = {}) {
    const headers = { 'content-type': 'application/json' };
    if (options.token) headers.authorization = `Bearer ${options.token}`;
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    return { res, body: await res.json() };
  }

  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());

    const [me, other] = await User.insertMany([
      { name: 'Me', email: 'me@test.com', password: 'HashedPlaceholder' },
      { name: 'Other', email: 'other@test.com', password: 'HashedPlaceholder' },
    ]);
    userId = String(me._id);
    token = sign(userId);
    otherToken = sign(String(other._id));

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
    const { res, body } = await api('GET', '/notifications');
    assert.equal(res.status, 401);
    assert.equal(body.error.code, 'UNAUTHENTICATED');
  });

  it('rejects revoked, banned and deleted sessions', async () => {
    const revoked = await User.create({ name: 'Revoked', email: 'revoked@test.com' });
    const revokedToken = sign(String(revoked._id));
    revoked.tokenVersion += 1;
    await revoked.save();
    const revokedResponse = await api('GET', '/notifications', { token: revokedToken });
    assert.equal(revokedResponse.res.status, 401);

    const banned = await User.create({ name: 'Banned', email: 'banned@test.com', banned: true });
    const bannedResponse = await api('GET', '/notifications', { token: sign(String(banned._id)) });
    assert.equal(bannedResponse.res.status, 403);

    const deleted = await User.create({ name: 'Deleted', email: 'deleted@test.com', deletedAt: new Date() });
    const deletedResponse = await api('GET', '/notifications', { token: sign(String(deleted._id)) });
    assert.equal(deletedResponse.res.status, 401);
  });

  it('lists newest-first with an unread count and unread filter', async () => {
    await notificationsService.createNotification({
      userId,
      type: 'join_request',
      title: 'First',
      message: 'oldest',
      email: false,
    });
    await notificationsService.createNotification({
      userId,
      type: 'team_full',
      title: 'Second',
      message: 'newest',
      email: false,
    });

    const all = await api('GET', '/notifications', { token });
    assert.equal(all.res.status, 200);
    assert.equal(all.body.data.total, 2);
    assert.equal(all.body.data.unread, 2);
    assert.equal(all.body.data.items[0].title, 'Second');
    assert.equal(all.body.data.items[0].read, false);

    const unread = await api('GET', '/notifications?unreadOnly=true', { token });
    assert.equal(unread.body.data.total, 2);
  });

  it('creates multiple notifications without a reminder reference', async () => {
    const user = await User.create({ name: 'No reminder', email: 'no-reminder@test.com' });
    await notificationsService.createNotification({
      userId: user._id,
      type: 'team_full',
      title: 'First notification',
      email: false,
    });
    await notificationsService.createNotification({
      userId: user._id,
      type: 'request_accepted',
      title: 'Second notification',
      email: false,
    });

    const result = await notificationsService.listNotifications(user._id);
    assert.equal(result.total, 2);
  });

  it('marks one notification read without leaking other users', async () => {
    const list = await api('GET', '/notifications', { token });
    const id = list.body.data.items[0].id;

    const denied = await api('PATCH', `/notifications/${id}/read`, { token: otherToken });
    assert.equal(denied.res.status, 404);

    const marked = await api('PATCH', `/notifications/${id}/read`, { token });
    assert.equal(marked.res.status, 200);
    assert.equal(marked.body.data.read, true);

    const after = await api('GET', '/notifications', { token });
    assert.equal(after.body.data.unread, 1);
    assert.equal(after.body.data.items[0].read, true);
  });

  it('marks every notification read (polling fallback endpoint)', async () => {
    const marked = await api('PATCH', '/notifications/read-all', { token });
    assert.equal(marked.res.status, 200);
    assert.equal(marked.body.data.updated, 1);

    const after = await api('GET', '/notifications?unreadOnly=true', { token });
    assert.equal(after.body.data.total, 0);
  });

  it('validates notification ids', async () => {
    const { res, body } = await api('PATCH', '/notifications/not-an-id/read', { token });
    assert.equal(res.status, 400);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  it('pushes new notifications over a server-sent events stream', async () => {
    const controller = new AbortController();
    const response = await fetch(`${base}/notifications/stream`, {
      headers: { authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/event-stream/);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const readChunk = () =>
      Promise.race([
        reader.read(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timed out waiting for SSE data')), 3000)
        ),
      ]);

    try {
      const ready = await readChunk();
      assert.match(decoder.decode(ready.value), /event: ready/);

      await notificationsService.createNotification({
        userId,
        type: 'request_accepted',
        title: 'Instant delivery',
        message: 'streamed',
        email: false,
      });

      let received = '';
      const deadline = Date.now() + 5000;
      while (!received.includes('event: notification') && Date.now() < deadline) {
        const { value, done } = await readChunk();
        if (done) break;
        received += decoder.decode(value);
      }
      assert.match(received, /event: notification/);
      assert.match(received, /Instant delivery/);
    } finally {
      controller.abort();
      await reader.cancel().catch(() => {});
    }
  });
});
