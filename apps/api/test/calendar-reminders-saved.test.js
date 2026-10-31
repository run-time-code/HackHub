'use strict';

// Contract tests for the Week 3 integrations: calendar events, reminder
// persistence and preferences, the saved-hackathon dashboard list and the
// WA3 account-settings aliases.

process.env.LOG_LEVEL = 'fatal';
process.env.JWT_SECRET = 'test-secret';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');

const config = require('../src/config');
const createApp = require('../src/app');
const User = require('../models/User');
const Hackathon = require('../models/Hackathon');
const SavedHackathon = require('../models/SavedHackathon');
const { Reminder } = require('../src/models/reminder');
const { Notification } = require('../src/models/notification');
const {
  isInQuietHours,
  processDueReminder,
  processDueReminders,
} = require('../src/services/reminderScheduler');

describe('calendar, reminders, saved hackathons and account settings', () => {
  let server;
  let base;
  let mongo;
  let user;
  let token;
  let csrf;
  let hackathon;

  function sign(id, tokenVersion = 0) {
    return jwt.sign(
      { id: String(id), email: 'owner@test.com', role: 'student', tokenVersion },
      config.jwtSecret
    );
  }

  async function bootstrapCsrf() {
    const res = await fetch(`${base}/auth/csrf-token`);
    const payload = await res.json();
    return {
      token: payload.csrfToken,
      cookie: (res.headers.get('set-cookie') || '').split(';')[0],
    };
  }

  async function api(method, path, body, options = {}) {
    const headers = { 'content-type': 'application/json' };
    const authToken = options.token === undefined ? token : options.token;
    if (authToken) headers.authorization = `Bearer ${authToken}`;
    if (options.csrf !== false) {
      headers['x-csrf-token'] = csrf.token;
      headers.cookie = csrf.cookie;
    }
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { res, body: text ? JSON.parse(text) : null };
  }

  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());

    user = await User.create({
      name: 'Calendar Owner',
      email: 'owner@test.com',
      password: await bcrypt.hash('OldPass1!', 10),
    });
    token = sign(user._id);

    hackathon = await Hackathon.create({
      hackathon_id: 'calendar-hack',
      title: 'Calendar Hack',
      registration_deadline: '2030-05-15T12:00:00.000Z',
      submission_deadline: '2030-05-20T12:00:00.000Z',
      event_start_date: '2030-05-18T09:00:00.000Z',
      description: 'A month of deliberate practice.',
    });

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

  it('GET /calendar returns registration, submission and event dates for a month', async () => {
    const { res, body } = await api('GET', '/calendar?month=2030-05', undefined, {
      csrf: false,
    });
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.month, '2030-05');
    assert.equal(body.data.items.length, 3);
    assert.deepEqual(
      body.data.items.map((item) => item.type).sort(),
      ['event', 'registration', 'submission']
    );
    assert.ok(body.data.items.every((item) => item.hackathonId === String(hackathon._id)));
    assert.equal(body.data.items[0].hackathon.title, 'Calendar Hack');

    const otherMonth = await api('GET', '/calendar?month=2030-06', undefined, { csrf: false });
    assert.equal(otherMonth.res.status, 200);
    assert.equal(otherMonth.body.data.items.length, 0);

    const invalid = await api('GET', '/calendar?month=May-2030', undefined, { csrf: false });
    assert.equal(invalid.res.status, 400);
    assert.match(invalid.body.error.message, /YYYY-MM/);
  });

  it('catalogue filters compose across domain, mode, skill and organizer search', async () => {
    const second = await Hackathon.create({
      hackathon_id: 'civic-hack',
      title: 'Civic Signals',
      organizer: 'Coastal Labs',
      mode: 'ONLINE',
      domain: ['Civic tech'],
      skills: ['React'],
      registration_deadline: '2030-06-01T12:00:00.000Z',
    });

    const filtered = await api(
      'GET',
      '/hackathons?domain=civic&mode=online&skill=react&q=coastal',
      undefined,
      { csrf: false }
    );
    assert.equal(filtered.res.status, 200);
    assert.equal(filtered.body.data.total, 1);
    assert.equal(filtered.body.data.items[0].title, 'Civic Signals');
    assert.equal(filtered.body.data.items[0].organizer, 'Coastal Labs');
    assert.deepEqual(filtered.body.data.items[0].domains, ['Civic tech']);
    assert.equal(filtered.body.data.items[0].mode, 'ONLINE');

    const noMatch = await api('GET', '/hackathons?domain=space', undefined, {
      csrf: false,
    });
    assert.equal(noMatch.body.data.total, 0);
    assert.equal(noMatch.body.data.items.length, 0);

    await Hackathon.deleteOne({ _id: second._id });
  });

  it('reminder preferences default and persist validated values', async () => {
    const defaults = await api('GET', '/reminders/preferences', undefined, { csrf: false });
    assert.equal(defaults.res.status, 200);
    assert.deepEqual(defaults.body.data, {
      defaultDaysBefore: 1,
      channels: ['email'],
      quietHours: { start: '22:00', end: '08:00' },
    });

    const saved = await api('PUT', '/reminders/preferences', {
      defaultDaysBefore: 7,
      channels: ['in_app'],
      quietHours: { start: '21:30', end: '07:15' },
    });
    assert.equal(saved.res.status, 200);
    assert.deepEqual(saved.body.data, {
      defaultDaysBefore: 7,
      channels: ['in_app'],
      quietHours: { start: '21:30', end: '07:15' },
    });

    const reloaded = await api('GET', '/reminders/preferences', undefined, { csrf: false });
    assert.deepEqual(reloaded.body.data, saved.body.data);

    const otherUser = await User.create({ name: 'Other Owner', email: 'other-owner@test.com' });
    const otherDefaults = await api('GET', '/reminders/preferences', undefined, {
      token: sign(otherUser._id),
      csrf: false,
    });
    assert.deepEqual(otherDefaults.body.data, {
      defaultDaysBefore: 1,
      channels: ['email'],
      quietHours: { start: '22:00', end: '08:00' },
    });

    const badChannel = await api('PUT', '/reminders/preferences', { channels: ['pigeon'] });
    assert.equal(badChannel.res.status, 400);
    const badTime = await api('PUT', '/reminders/preferences', {
      quietHours: { start: '25:00', end: '08:00' },
    });
    assert.equal(badTime.res.status, 400);
  });

  it('POST /reminders persists a reminder once and GET lists it', async () => {
    const unauthorized = await api('GET', '/reminders', undefined, {
      token: null,
      csrf: false,
    });
    assert.equal(unauthorized.res.status, 401);

    const created = await api('POST', '/reminders', {
      hackathonId: String(hackathon._id),
      eventType: 'registration',
      daysBefore: 3,
      channel: 'email',
    });
    assert.equal(created.res.status, 201);
    assert.equal(created.body.data.hackathonTitle, 'Calendar Hack');
    assert.equal(created.body.data.remindAt, '2030-05-12T12:00:00.000Z');

    const list = await api('GET', '/reminders', undefined, { csrf: false });
    assert.equal(list.res.status, 200);
    assert.equal(list.body.data.items.length, 1);
    assert.equal(list.body.data.items[0].daysBefore, 3);

    const duplicate = await api('POST', '/reminders', {
      hackathonId: hackathon.hackathon_id,
      eventType: 'registration',
      daysBefore: 3,
      channel: 'email',
    });
    assert.equal(duplicate.res.status, 409);

    const badDays = await api('POST', '/reminders', {
      hackathonId: hackathon.hackathon_id,
      daysBefore: 500,
    });
    assert.equal(badDays.res.status, 400);

    const unknown = await api('POST', '/reminders', {
      hackathonId: 'does-not-exist',
      daysBefore: 1,
    });
    assert.equal(unknown.res.status, 404);
  });

  it('dispatches a due reminder once and records delivery', async () => {
    const reminder = await Reminder.findOne({ user: user._id, active: true });
    await Reminder.updateOne(
      { _id: reminder._id },
      {
        $set: {
          channel: 'in_app',
          remindAt: new Date('2029-01-01T00:00:00.000Z'),
          processingUntil: null,
        },
      }
    );

    const deliveredId = await processDueReminder({ now: new Date('2031-01-01T08:00:00.000Z') });
    assert.equal(String(deliveredId), String(reminder._id));
    assert.equal(await Notification.countDocuments({ reminder: reminder._id }), 1);
    assert.ok((await Reminder.findById(reminder._id)).deliveredAt);

    assert.equal(
      await processDueReminder({ now: new Date('2031-01-01T08:01:00.000Z') }),
      null
    );
    assert.equal(await Notification.countDocuments({ reminder: reminder._id }), 1);
  });

  it('uses IST quiet hours and continues after an individual reminder fails', async () => {
    assert.equal(
      isInQuietHours(new Date('2031-01-01T18:00:00.000Z'), {
        start: '22:00',
        end: '08:00',
      }),
      true
    );
    assert.equal(
      isInQuietHours(new Date('2031-01-01T02:30:00.000Z'), {
        start: '22:00',
        end: '08:00',
      }),
      false
    );

    const invalidUserId = new mongoose.Types.ObjectId();
    const failedReminder = await Reminder.create({
      user: invalidUserId,
      hackathon: hackathon._id,
      eventType: 'submission',
      daysBefore: 4,
      channel: 'in_app',
      remindAt: new Date('2029-01-01T00:00:00.000Z'),
    });
    const deliverableReminder = await Reminder.create({
      user: user._id,
      hackathon: hackathon._id,
      eventType: 'event',
      daysBefore: 5,
      channel: 'in_app',
      remindAt: new Date('2030-01-01T00:00:00.000Z'),
    });

    const delivered = await processDueReminders({
      now: new Date('2031-01-01T08:00:00.000Z'),
      limit: 5,
    });

    assert.equal(delivered, 1);
    assert.ok((await Reminder.findById(failedReminder._id)).lastError);
    assert.ok((await Reminder.findById(failedReminder._id)).processingUntil);
    assert.ok((await Reminder.findById(deliverableReminder._id)).deliveredAt);
    assert.equal(await Notification.countDocuments({ reminder: deliverableReminder._id }), 1);
    await Reminder.deleteMany({
      _id: { $in: [failedReminder._id, deliverableReminder._id] },
    });
    await Notification.deleteOne({ reminder: deliverableReminder._id });
  });

  it('DELETE /reminders/:id removes the caller reminder only', async () => {
    const list = await api('GET', '/reminders', undefined, { csrf: false });
    const reminderId = list.body.data.items[0].id;

    const removed = await api('DELETE', `/reminders/${reminderId}`);
    assert.equal(removed.res.status, 204);

    const after = await api('GET', '/reminders', undefined, { csrf: false });
    assert.equal(after.body.data.items.length, 0);

    const missing = await api('DELETE', `/reminders/${reminderId}`);
    assert.equal(missing.res.status, 404);
  });

  it('saved hackathons round-trip through the dashboard list', async () => {
    const created = await api('POST', '/saved', { hackathonId: String(hackathon._id) });
    assert.equal(created.res.status, 201);
    assert.equal(created.body.data.status, 'saved');
    assert.equal(created.body.data.hackathon.title, 'Calendar Hack');

    const list = await api('GET', '/saved', undefined, { csrf: false });
    assert.equal(list.res.status, 200);
    assert.equal(list.body.data.items.length, 1);
    const savedId = list.body.data.items[0].id;

    const updated = await api('PATCH', `/saved/${savedId}`, {
      status: 'ongoing',
      notes: 'Team formed. Ship the map.',
    });
    assert.equal(updated.res.status, 200);
    assert.equal(updated.body.data.status, 'ongoing');
    assert.equal(updated.body.data.notes, 'Team formed. Ship the map.');

    const invalid = await api('PATCH', `/saved/${savedId}`, { status: 'maybe' });
    assert.equal(invalid.res.status, 400);

    const reloaded = await api('GET', '/saved', undefined, { csrf: false });
    assert.equal(reloaded.body.data.items[0].status, 'ongoing');

    const removed = await api('DELETE', `/saved/${savedId}`);
    assert.equal(removed.res.status, 204);
    const empty = await api('GET', '/saved', undefined, { csrf: false });
    assert.equal(empty.body.data.items.length, 0);
  });

  it('account settings aliases export, change the password and delete the account', async () => {
    const exported = await api('GET', '/users/me/export', undefined, { csrf: false });
    assert.equal(exported.res.status, 200);
    assert.equal(exported.body.profile.email, 'owner@test.com');
    assert.ok(exported.body.exportedAt);

    const wrong = await api('PUT', '/users/me/change-password', {
      currentPassword: 'wrong-password',
      newPassword: 'NewPass2!',
    });
    assert.equal(wrong.res.status, 400);

    const changed = await api('PUT', '/users/me/change-password', {
      currentPassword: 'OldPass1!',
      newPassword: 'NewPass2!',
    });
    assert.equal(changed.res.status, 200);

    const stored = await User.findById(user._id).select('+password');
    assert.equal(await bcrypt.compare('NewPass2!', stored.password), true);
    assert.equal(stored.tokenVersion, 1);

    const revoked = await api('GET', '/users/me', undefined, { csrf: false });
    assert.equal(revoked.res.status, 401);

    const second = await User.create({
      name: 'Delete Me',
      email: 'delete@test.com',
      password: await bcrypt.hash('Delete1!', 10),
    });
    const secondToken = sign(second._id);
    const deleted = await api('DELETE', '/users/me', undefined, { token: secondToken });
    assert.equal(deleted.res.status, 200);

    const gone = await User.findById(second._id);
    assert.ok(gone.deletedAt);
    const afterDelete = await api('GET', '/users/me', undefined, {
      token: secondToken,
      csrf: false,
    });
    assert.equal(afterDelete.res.status, 401);
  });

  it('does not expose another user saved rows or reminders', async () => {
    const outsider = await User.create({
      name: 'Outsider',
      email: 'outsider@test.com',
      password: await bcrypt.hash('Outsider1!', 10),
    });
    const outsiderToken = sign(outsider._id);
    // The password-change test above rotated the owner token version.
    const ownerToken = sign(user._id, 1);

    const saved = await api(
      'POST',
      '/saved',
      { hackathonId: hackathon.hackathon_id },
      { token: ownerToken }
    );
    assert.equal(saved.res.status, 201);

    const outsiderList = await api('GET', '/saved', undefined, {
      token: outsiderToken,
      csrf: false,
    });
    assert.equal(outsiderList.body.data.items.length, 0);

    const outsiderPatch = await api(
      'PATCH',
      `/saved/${saved.body.data.id}`,
      { status: 'completed' },
      { token: outsiderToken }
    );
    assert.equal(outsiderPatch.res.status, 404);

    assert.equal(await SavedHackathon.countDocuments({ user: user._id }), 1);
  });
});
