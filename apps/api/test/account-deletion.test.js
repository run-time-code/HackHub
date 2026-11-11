'use strict';

// Regression tests for account deletion. Deleting an account used to leave the
// user as an unreachable team leader, keep pending join requests alive, keep
// reminder jobs live for a deleted address, and preserve saved/notification
// rows forever.

process.env.LOG_LEVEL = 'fatal';
process.env.JWT_SECRET = 'test-secret';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

const config = require('../src/config');
const createApp = require('../src/app');
const User = require('../models/User');
const Hackathon = require('../models/Hackathon');
const SavedHackathon = require('../models/SavedHackathon');
const Registration = require('../models/Registration');
const { Team } = require('../src/models/team');
const { JoinRequest } = require('../src/models/joinRequest');
const { Notification } = require('../src/models/notification');
const { Reminder } = require('../src/models/reminder');
const { purgeDeletedAccounts } = require('../utils/accountPurge');

describe('account deletion', () => {
  let server;
  let base;
  let mongo;
  let csrf;
  let leader;
  let member;
  let hackathon;
  let ledTeam;
  let soloTeam;
  let pendingRequest;

  function sign(id) {
    return jwt.sign(
      { id: String(id), email: 'leader@test.com', role: 'student', tokenVersion: 0 },
      config.jwtSecret
    );
  }

  async function deleteAccount(token) {
    const res = await fetch(`${base}/users/me`, {
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${token}`,
        'x-csrf-token': csrf.token,
        cookie: csrf.cookie,
      },
    });
    return { res, body: await res.json() };
  }

  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());

    leader = await User.create({ name: 'Leader', email: 'leader@test.com' });
    member = await User.create({ name: 'Member', email: 'member@test.com' });

    hackathon = await Hackathon.create({
      hackathon_id: 'deletion-hack',
      title: 'Deletion Hack',
      registration_deadline: new Date('2030-05-15T12:00:00.000Z'),
    });

    ledTeam = await Team.create({
      name: 'Led Team',
      hackathon: hackathon._id,
      leader: leader._id,
      members: [{ user: member._id, role: 'member', joinedAt: new Date('2029-01-01') }],
      status: 'closed',
      maxTeamSize: 4,
    });

    soloTeam = await Team.create({
      name: 'Solo Team',
      hackathon: hackathon._id,
      leader: leader._id,
      members: [],
      maxTeamSize: 4,
    });

    pendingRequest = await JoinRequest.create({
      team: ledTeam._id,
      user: member._id,
      type: 'invite',
      initiatedBy: leader._id,
      role: 'designer',
      status: 'pending',
    });

    await Reminder.create({
      user: leader._id,
      hackathon: hackathon._id,
      eventType: 'registration',
      daysBefore: 1,
      channel: 'email',
      remindAt: new Date('2030-05-14T12:00:00.000Z'),
    });
    await SavedHackathon.create({ user: leader._id, hackathon: hackathon.hackathon_id });
    await Registration.create({ user: leader._id, hackathon: hackathon.hackathon_id });
    await Notification.create({
      user: leader._id,
      type: 'team_full',
      title: 'Test notification',
    });

    await new Promise((resolve) => {
      server = createApp().listen(0, resolve);
    });
    base = `http://localhost:${server.address().port}/api`;

    const boot = await fetch(`${base}/auth/csrf-token`);
    csrf = {
      token: (await boot.json()).csrfToken,
      cookie: (boot.headers.get('set-cookie') || '').split(';')[0],
    };
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mongo.stop();
  });

  it('releases teams, requests and reminders when the account is deleted', async () => {
    const { res } = await deleteAccount(sign(leader._id));
    assert.equal(res.status, 200);

    const inherited = await Team.findById(ledTeam._id);
    assert.equal(String(inherited.leader), String(member._id), 'leadership must transfer');
    assert.equal(
      inherited.members.some((entry) => String(entry.user) === String(member._id)),
      false,
      'the new leader must not also occupy a member seat'
    );
    assert.equal(inherited.status, 'open', 'a freed seat reopens a closed team');

    assert.equal(await Team.findById(soloTeam._id), null, 'leaderless team is removed');

    const request = await JoinRequest.findById(pendingRequest._id);
    assert.equal(request.status, 'cancelled');

    const reminders = await Reminder.find({ user: leader._id });
    assert.equal(reminders.length, 1);
    assert.equal(reminders[0].active, false, 'reminder job must not email a deleted account');

    const leaderStill = await User.findById(leader._id);
    assert.ok(leaderStill.deletedAt, 'the account stays for the retention window');
  });

  it('erases retained rows once the retention window has passed', async () => {
    await User.updateOne(
      { _id: leader._id },
      { $set: { deletedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) } }
    );

    const result = await purgeDeletedAccounts();

    assert.equal(result.deletedAccounts, 1);
    assert.equal(result.deletedRegistrations, 1);
    assert.equal(result.deletedSavedHackathons, 1);
    assert.equal(result.deletedReminders, 1);
    assert.equal(result.deletedNotifications, 1);

    assert.equal(await User.findById(leader._id), null);
    assert.equal(await SavedHackathon.countDocuments({ user: leader._id }), 0);
    assert.equal(await Reminder.countDocuments({ user: leader._id }), 0);
    assert.equal(await Notification.countDocuments({ user: leader._id }), 0);
    assert.equal(await Registration.countDocuments({ user: leader._id }), 0);
    assert.equal(await JoinRequest.countDocuments({ user: leader._id }), 0);

    // The surviving member still owns the team after the purge.
    const inherited = await Team.findById(ledTeam._id);
    assert.ok(inherited);
    assert.equal(String(inherited.leader), String(member._id));
  });
});
