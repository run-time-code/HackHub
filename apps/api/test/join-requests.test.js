'use strict';

// Integration tests for the team collaboration flow: join requests,
// invitations, permissions, duplicate/full/self guards, the daily request
// limit, auto-close, leader transfer and cleanup on close/delete.
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
const { JoinRequest } = require('../src/models/joinRequest');
const { Team } = require('../src/models/team');

describe('team collaboration', () => {
  let server;
  let base;
  let mongo;
  let hackathonId;
  let leader;
  let alice;
  let bob;
  let carol;
  let tokens = {};
  let alphaTeamId;
  let betaTeamId;

  function sign(id) {
    return jwt.sign({ id, email: `${id}@test.com`, role: 'student' }, config.jwtSecret);
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

  async function createTeam(name, maxTeamSize = 4) {
    const { res, body } = await api('POST', '/teams', tokens.leader, {
      name,
      hackathonId,
      maxTeamSize,
    });
    assert.equal(res.status, 201);
    return body.data.id;
  }

  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());

    const users = await User.insertMany([
      { name: 'Leader', email: 'leader@test.com', password: 'HashedPlaceholder' },
      { name: 'Alice', email: 'alice@test.com', password: 'HashedPlaceholder' },
      { name: 'Bob', email: 'bob@test.com', password: 'HashedPlaceholder' },
      { name: 'Carol', email: 'carol@test.com', password: 'HashedPlaceholder' },
    ]);
    [leader, alice, bob, carol] = users;
    for (const [key, user] of Object.entries({ leader, alice, bob, carol })) {
      tokens[key] = sign(String(user._id));
    }
    const Hackathon = require('../models/Hackathon');
    const row = await Hackathon.create({ hackathon_id: 'join-flow-2026', title: 'Join Flow 2026' });
    hackathonId = String(row._id);

    await new Promise((resolve) => {
      server = createApp().listen(0, resolve);
    });
    base = `http://localhost:${server.address().port}/api`;

    alphaTeamId = await createTeam('Alpha', 2);
    betaTeamId = await createTeam('Beta', 4);
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mongo.stop();
  });

  it('requires authentication to send a join request', async () => {
    const { res, body } = await api('POST', `/teams/${alphaTeamId}/requests`, null, {});
    assert.equal(res.status, 401);
    assert.equal(body.error.code, 'UNAUTHENTICATED');
  });

  it('blocks the leader from requesting their own team', async () => {
    const { res, body } = await api('POST', `/teams/${alphaTeamId}/requests`, tokens.leader, {});
    assert.equal(res.status, 400);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  it('lets a user send one pending request per team', async () => {
    const first = await api('POST', `/teams/${alphaTeamId}/requests`, tokens.alice, {
      role: 'designer',
      message: 'I can design',
    });
    assert.equal(first.res.status, 201);
    assert.equal(first.body.data.status, 'pending');
    assert.equal(first.body.data.type, 'request');
    assert.equal(first.body.data.role, 'designer');

    const duplicate = await api('POST', `/teams/${alphaTeamId}/requests`, tokens.alice, {});
    assert.equal(duplicate.res.status, 409);
    assert.equal(duplicate.body.error.code, 'ALREADY_PENDING');
  });

  it('notifies the leader about a new request', async () => {
    const { res, body } = await api('GET', '/notifications', tokens.leader);
    assert.equal(res.status, 200);
    const created = body.data.items.find((n) => n.type === 'join_request');
    assert.ok(created, 'leader was not notified');
    assert.equal(created.data.teamId, alphaTeamId);
  });

  it('only the leader can list and answer join requests', async () => {
    await api('POST', `/teams/${alphaTeamId}/requests`, tokens.bob, {});

    const denied = await api('GET', `/teams/${alphaTeamId}/requests`, tokens.alice);
    assert.equal(denied.res.status, 403);

    const listed = await api('GET', `/teams/${alphaTeamId}/requests`, tokens.leader);
    assert.equal(listed.res.status, 200);
    assert.equal(listed.body.data.items.length, 2);
    // Privacy: the leader sees names and skills, never emails.
    assert.ok(listed.body.data.items[0].user.name);
    assert.equal(listed.body.data.items[0].user.email, undefined);
  });

  it('accepts a request, fills the team, closes it and clears the queue', async () => {
    const latest = await JoinRequest.findOne({
      team: alphaTeamId,
      user: alice._id,
      status: 'pending',
    });

    const denied = await api('PATCH', `/team-requests/${latest._id}`, tokens.bob, {
      action: 'accept',
    });
    assert.equal(denied.res.status, 403);

    const accepted = await api('PATCH', `/team-requests/${latest._id}`, tokens.leader, {
      action: 'accept',
    });
    assert.equal(accepted.res.status, 200);
    assert.equal(accepted.body.data.status, 'accepted');

    const team = await api('GET', `/teams/${alphaTeamId}`);
    assert.equal(team.body.data.size, 2);
    assert.equal(team.body.data.status, 'closed');
    assert.equal(team.body.data.members[0].user, String(alice._id));

    const queued = await JoinRequest.findOne({
      team: alphaTeamId,
      user: bob._id,
    });
    assert.equal(queued.status, 'cancelled');

    const blocked = await api('POST', `/teams/${alphaTeamId}/requests`, tokens.carol, {});
    assert.equal(blocked.res.status, 409);
    assert.equal(blocked.body.error.code, 'TEAM_CLOSED');

    const inbox = await api('GET', '/notifications', tokens.alice);
    assert.ok(inbox.body.data.items.some((n) => n.type === 'request_accepted'));
  });

  it('supports leader invitations that only the invitee can answer', async () => {
    const forbiddenInvite = await api(
      'POST',
      `/teams/${betaTeamId}/invitations`,
      tokens.alice,
      { userId: String(carol._id) }
    );
    assert.equal(forbiddenInvite.res.status, 403);

    const invite = await api('POST', `/teams/${betaTeamId}/invitations`, tokens.leader, {
      userId: String(carol._id),
      role: 'backend',
    });
    assert.equal(invite.res.status, 201);
    assert.equal(invite.body.data.type, 'invite');

    const duplicate = await api('POST', `/teams/${betaTeamId}/requests`, tokens.carol, {});
    assert.equal(duplicate.res.status, 409);
    assert.equal(duplicate.body.error.code, 'ALREADY_PENDING');

    const mine = await api('GET', '/team-requests/mine?status=pending', tokens.carol);
    assert.equal(mine.res.status, 200);
    assert.equal(mine.body.data.items[0].type, 'invite');

    const leaderInbox = await api('GET', `/teams/${betaTeamId}/invitations`, tokens.leader);
    assert.equal(leaderInbox.res.status, 200);
    assert.equal(leaderInbox.body.data.items[0].type, 'invite');

    const wrongUser = await api('PATCH', `/team-requests/${invite.body.data.id}`, tokens.leader, {
      action: 'accept',
    });
    assert.equal(wrongUser.res.status, 403);

    const accepted = await api('PATCH', `/team-requests/${invite.body.data.id}`, tokens.carol, {
      action: 'accept',
    });
    assert.equal(accepted.res.status, 200);

    const team = await api('GET', `/teams/${betaTeamId}`);
    const membership = team.body.data.members.find((m) => m.user === String(carol._id));
    assert.ok(membership);
    assert.equal(membership.role, 'backend');
  });

  it('lets an invitee decline and lets a requester cancel', async () => {
    const invite = await api('POST', `/teams/${betaTeamId}/invitations`, tokens.leader, {
      userId: String(bob._id),
    });
    assert.equal(invite.res.status, 201);

    const declined = await api('PATCH', `/team-requests/${invite.body.data.id}`, tokens.bob, {
      action: 'decline',
    });
    assert.equal(declined.res.status, 200);
    assert.equal(declined.body.data.status, 'declined');

    const request = await api('POST', `/teams/${betaTeamId}/requests`, tokens.bob, {});
    assert.equal(request.res.status, 201);
    const cancelled = await api('DELETE', `/team-requests/${request.body.data.id}`, tokens.bob);
    assert.equal(cancelled.res.status, 200);
    assert.equal(cancelled.body.data.status, 'cancelled');
  });

  it('enforces the daily join-request limit', async () => {
    const previous = config.maxJoinRequestsPerDay;
    config.maxJoinRequestsPerDay = 2;
    try {
      const teamA = await createTeam('Limit A');
      const teamB = await createTeam('Limit B');
      // Alice already sent one request today (Alpha), so one more is allowed.
      const first = await api('POST', `/teams/${teamA}/requests`, tokens.alice, {});
      assert.equal(first.res.status, 201);

      const second = await api('POST', `/teams/${teamB}/requests`, tokens.alice, {});
      assert.equal(second.res.status, 429);
      assert.equal(second.body.error.code, 'JOIN_REQUEST_LIMIT');
    } finally {
      config.maxJoinRequestsPerDay = previous;
    }
  });

  it('transfers leadership to an existing member only', async () => {
    const denied = await api('PATCH', `/teams/${betaTeamId}/leader`, tokens.alice, {
      userId: String(carol._id),
    });
    assert.equal(denied.res.status, 403);

    const notMember = await api('PATCH', `/teams/${betaTeamId}/leader`, tokens.leader, {
      userId: String(bob._id),
    });
    assert.equal(notMember.res.status, 400);

    const transferred = await api('PATCH', `/teams/${betaTeamId}/leader`, tokens.leader, {
      userId: String(carol._id),
    });
    assert.equal(transferred.res.status, 200);
    assert.equal(transferred.body.data.leader, String(carol._id));
    assert.ok(
      transferred.body.data.members.some((m) => m.user === String(leader._id)),
      'outgoing leader should become a member'
    );

    const oldLeaderCannotEdit = await api('PATCH', `/teams/${betaTeamId}`, tokens.leader, {
      name: 'Nope',
    });
    assert.equal(oldLeaderCannotEdit.res.status, 403);

    const newLeaderCanEdit = await api('PATCH', `/teams/${betaTeamId}`, tokens.carol, {
      name: 'Beta Squad',
    });
    assert.equal(newLeaderCanEdit.res.status, 200);
  });

  it('expires stale pending rows instead of keeping them actionable', async () => {
    const teamId = await createTeam('Delta');
    const request = await api('POST', `/teams/${teamId}/requests`, tokens.bob, {});
    assert.equal(request.res.status, 201);

    await JoinRequest.updateOne(
      { _id: request.body.data.id },
      { $set: { expiresAt: new Date(Date.now() - 1000) } }
    );

    const expired = await api('PATCH', `/team-requests/${request.body.data.id}`, tokens.leader, {
      action: 'accept',
    });
    assert.equal(expired.res.status, 410);
    assert.equal(expired.body.error.code, 'REQUEST_EXPIRED');

    const row = await JoinRequest.findById(request.body.data.id);
    assert.equal(row.status, 'expired');

    // An expired row must not block a fresh request to the same team.
    const fresh = await api('POST', `/teams/${teamId}/requests`, tokens.bob, {});
    assert.equal(fresh.res.status, 201);
  });

  it('cleans up pending requests when a team is deleted', async () => {
    const teamId = await createTeam('Gamma');
    const request = await api('POST', `/teams/${teamId}/requests`, tokens.bob, {});
    assert.equal(request.res.status, 201);

    const removed = await api('DELETE', `/teams/${teamId}`, tokens.leader);
    assert.equal(removed.res.status, 200);

    const row = await JoinRequest.findById(request.body.data.id);
    assert.equal(row.status, 'cancelled');

    const team = await Team.findById(teamId);
    assert.equal(team, null);
  });
});
