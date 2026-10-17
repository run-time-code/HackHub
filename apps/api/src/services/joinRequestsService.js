'use strict';

const mongoose = require('mongoose');

const config = require('../config');
const { Team } = require('../models/team');
const { JoinRequest, PENDING_STATUS } = require('../models/joinRequest');
const User = require('../../models/User');
const notifications = require('./notificationsService');

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const ACTIONS = ['accept', 'decline'];

function badRequest(message) {
  return { status: 400, code: 'VALIDATION_ERROR', message };
}

function notFound(code = 'JOIN_REQUEST_NOT_FOUND', message = 'Join request not found') {
  return { status: 404, code, message };
}

function conflict(code, message) {
  return { status: 409, code, message };
}

function forbidden(message = 'You cannot perform this action') {
  return { status: 403, code: 'FORBIDDEN', message };
}

function assertObjectId(value, name) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw badRequest(`${name} must be a valid id`);
  }
}

function teamSize(team) {
  return 1 + (team.members ? team.members.length : 0);
}

function isLeader(team, userId) {
  return String(team.leader) === String(userId);
}

function isMember(team, userId) {
  return (team.members || []).some((m) => String(m.user) === String(userId));
}

function serialize(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  const user = obj.user && obj.user.name
    ? {
        id: String(obj.user._id),
        name: obj.user.name,
        skills: obj.user.skills || [],
        availability: obj.user.availability,
      }
    : { id: String(obj.user && (obj.user._id || obj.user)) };
  const team = obj.team && obj.team.name
    ? { id: String(obj.team._id), name: obj.team.name, status: obj.team.status }
    : { id: String(obj.team && (obj.team._id || obj.team)) };
  return {
    id: String(obj._id || obj.id),
    team,
    user,
    type: obj.type,
    initiatedBy: String(obj.initiatedBy),
    role: obj.role,
    message: obj.message || '',
    status: obj.status,
    expiresAt: obj.expiresAt,
    respondedAt: obj.respondedAt || null,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

async function loadTeam(teamId) {
  assertObjectId(teamId, 'team id');
  const team = await Team.findById(teamId);
  if (!team) {
    throw notFound('TEAM_NOT_FOUND', 'Team not found');
  }
  return team;
}

// A team that already reached capacity is closed on the spot, so every
// later join attempt sees a consistent TEAM_FULL/TEAM_CLOSED answer.
async function assertOpenWithSpace(team) {
  if (team.status !== 'open') {
    throw conflict('TEAM_CLOSED', 'This team is closed');
  }
  if (teamSize(team) >= team.maxTeamSize) {
    if (team.status !== 'closed') {
      team.status = 'closed';
      await team.save();
    }
    throw conflict('TEAM_FULL', 'This team is full');
  }
}

// Pending rows live for 7 days. There is no background job for this tiny
// collection: every read/write sweeps its own scope first so an expired row
// can never block a fresh request or linger in a list.
async function expireStale(teamId) {
  const filter = { status: PENDING_STATUS, expiresAt: { $lte: new Date() } };
  if (teamId) filter.team = teamId;
  await JoinRequest.updateMany(filter, {
    $set: { status: 'expired', respondedAt: new Date() },
  });
}

async function findPending(teamId, userId) {
  return JoinRequest.findOne({ team: teamId, user: userId, status: PENDING_STATUS });
}

// Pending rows past their expiry are lazily moved to `expired`; the API
// returns a distinct 410 so clients can drop them from their list.
async function expireIfNeeded(doc) {
  if (doc.status === PENDING_STATUS && doc.expiresAt && doc.expiresAt.getTime() <= Date.now()) {
    doc.status = 'expired';
    doc.respondedAt = new Date();
    await doc.save();
  }
  return doc;
}

async function sendJoinRequest(teamId, userId, input = {}) {
  const team = await loadTeam(teamId);
  if (isLeader(team, userId)) {
    throw badRequest('You already lead this team');
  }
  if (isMember(team, userId)) {
    throw conflict('ALREADY_MEMBER', 'You are already a member of this team');
  }
  await assertOpenWithSpace(team);
  await expireStale(team._id);

  if (await findPending(team._id, userId)) {
    throw conflict('ALREADY_PENDING', 'A request or invitation for this team is already pending');
  }

  // Per-user daily quota counts requests actually sent (invites are sent
  // by leaders and are not limited by this rule).
  const sentToday = await JoinRequest.countDocuments({
    user: userId,
    type: 'request',
    createdAt: { $gte: new Date(Date.now() - DAY_MS) },
  });
  if (sentToday >= config.maxJoinRequestsPerDay) {
    throw {
      status: 429,
      code: 'JOIN_REQUEST_LIMIT',
      message: `You can send at most ${config.maxJoinRequestsPerDay} join requests per day`,
    };
  }

  let request;
  try {
    request = await JoinRequest.create({
      team: team._id,
      user: userId,
      type: 'request',
      initiatedBy: userId,
      role: typeof input.role === 'string' && input.role.trim() ? input.role.trim() : 'member',
      message: typeof input.message === 'string' ? input.message.trim() : '',
    });
  } catch (err) {
    // Two requests racing: the partial unique index is the source of truth.
    if (err && err.code === 11000) {
      throw conflict('ALREADY_PENDING', 'A request or invitation for this team is already pending');
    }
    throw err;
  }

  await notifications.createNotification({
    userId: team.leader,
    type: 'join_request',
    title: 'New join request',
    message: `Someone asked to join ${team.name}. Review the request in your team dashboard.`,
    data: { teamId: String(team._id), requestId: String(request._id) },
  });

  return serialize(request);
}

async function sendInvitation(teamId, leaderId, input = {}) {
  const team = await loadTeam(teamId);
  if (!isLeader(team, leaderId)) {
    throw forbidden('Only the team leader can invite members');
  }
  if (!input.userId) {
    throw badRequest('userId is required');
  }
  assertObjectId(input.userId, 'userId');
  if (String(input.userId) === String(leaderId)) {
    throw badRequest('You cannot invite yourself');
  }
  if (isMember(team, input.userId)) {
    throw conflict('ALREADY_MEMBER', 'That user is already a member of this team');
  }
  await assertOpenWithSpace(team);

  const invitee = await User.findById(input.userId).select('_id name');
  if (!invitee) {
    throw notFound('USER_NOT_FOUND', 'User not found');
  }
  await expireStale(team._id);
  if (await findPending(team._id, input.userId)) {
    throw conflict('ALREADY_PENDING', 'A request or invitation for this team is already pending');
  }

  let invitation;
  try {
    invitation = await JoinRequest.create({
      team: team._id,
      user: input.userId,
      type: 'invite',
      initiatedBy: leaderId,
      role: typeof input.role === 'string' && input.role.trim() ? input.role.trim() : 'member',
      message: typeof input.message === 'string' ? input.message.trim() : '',
    });
  } catch (err) {
    if (err && err.code === 11000) {
      throw conflict('ALREADY_PENDING', 'A request or invitation for this team is already pending');
    }
    throw err;
  }

  await notifications.createNotification({
    userId: input.userId,
    type: 'team_invitation',
    title: 'Team invitation',
    message: `You were invited to join ${team.name}.`,
    data: { teamId: String(team._id), requestId: String(invitation._id) },
  });

  return serialize(invitation);
}

async function listTeamRequests(teamId, requesterId, type = 'request') {
  const team = await loadTeam(teamId);
  if (!isLeader(team, requesterId)) {
    throw forbidden('Only the team leader can view requests');
  }
  if (!['request', 'invite'].includes(type)) {
    throw badRequest("type must be 'request' or 'invite'");
  }
  await expireStale(team._id);
  const items = await JoinRequest.find({ team: team._id, type, status: PENDING_STATUS })
    .sort({ createdAt: 1 })
    .populate('user', 'name skills availability');
  return { items: items.map(serialize) };
}

async function listMine(userId, query = {}) {
  const pageNum = Math.max(Number(query.page) || 1, 1);
  const limitNum = Math.min(Math.max(Number(query.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  await expireStale();
  const filter = {
    $or: [{ user: userId }, { initiatedBy: userId }],
  };
  if (query.status) {
    if (!['pending', 'accepted', 'declined', 'cancelled', 'expired'].includes(query.status)) {
      throw badRequest('invalid status filter');
    }
    filter.status = query.status;
  }

  const [items, total] = await Promise.all([
    JoinRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('team', 'name status')
      .populate('user', 'name skills availability'),
    JoinRequest.countDocuments(filter),
  ]);

  return { items: items.map(serialize), page: pageNum, limit: limitNum, total };
}

// When a team fills up (or is deleted) every other pending row is closed
// so nobody is left waiting on a team that can no longer accept them.
async function cancelPendingForTeam(teamId, exceptId) {
  const filter = { team: teamId, status: PENDING_STATUS };
  if (exceptId) {
    filter._id = { $ne: exceptId };
  }
  const result = await JoinRequest.updateMany(filter, {
    $set: { status: 'cancelled', respondedAt: new Date() },
  });
  return result.modifiedCount || 0;
}

async function respond(requestId, userId, input = {}) {
  const action = input.action;
  if (!ACTIONS.includes(action)) {
    throw badRequest("action must be 'accept' or 'decline'");
  }
  assertObjectId(requestId, 'request id');
  const request = await JoinRequest.findById(requestId);
  if (!request) {
    throw notFound();
  }
  await expireIfNeeded(request);
  if (request.status === 'expired') {
    throw { status: 410, code: 'REQUEST_EXPIRED', message: 'This request has expired' };
  }
  if (request.status !== PENDING_STATUS) {
    throw conflict('REQUEST_NOT_PENDING', `This request is already ${request.status}`);
  }

  const team = await loadTeam(request.team);
  if (request.type === 'request' && !isLeader(team, userId)) {
    throw forbidden('Only the team leader can respond to join requests');
  }
  if (request.type === 'invite' && String(request.user) !== String(userId)) {
    throw forbidden('Only the invited user can respond to an invitation');
  }

  if (action === 'decline') {
    request.status = 'declined';
    request.respondedAt = new Date();
    await request.save();
    const recipient = request.type === 'request' ? request.user : request.initiatedBy;
    await notifications.createNotification({
      userId: recipient,
      type: request.type === 'request' ? 'request_declined' : 'invitation_declined',
      title: request.type === 'request' ? 'Join request declined' : 'Invitation declined',
      message:
        request.type === 'request'
          ? `${team.name} declined your request to join.`
          : `Your invitation to ${team.name} was declined.`,
      data: { teamId: String(team._id), requestId: String(request._id) },
    });
    return serialize(request);
  }

  // accept
  if (team.status !== 'open') {
    throw conflict('TEAM_CLOSED', 'This team is closed');
  }
  if (isMember(team, request.user)) {
    throw conflict('ALREADY_MEMBER', 'That user is already a member of this team');
  }

  // Seat assignment is a single conditional update: two leaders/invitees
  // accepting at the same moment can never overfill the team.
  const acceptedTeam = await Team.findOneAndUpdate(
    {
      _id: team._id,
      status: 'open',
      'members.user': { $ne: request.user },
      $expr: { $lt: [{ $add: [{ $size: '$members' }, 1] }, '$maxTeamSize'] },
    },
    {
      $push: {
        members: {
          user: request.user,
          role: request.role || 'member',
          joinedAt: new Date(),
        },
      },
    },
    { new: true }
  );
  if (!acceptedTeam) {
    const current = await Team.findById(team._id);
    if (!current) {
      throw notFound('TEAM_NOT_FOUND', 'Team not found');
    }
    if (current.status !== 'open') {
      throw conflict('TEAM_CLOSED', 'This team is closed');
    }
    if (isMember(current, request.user)) {
      throw conflict('ALREADY_MEMBER', 'That user is already a member of this team');
    }
    current.status = 'closed';
    await current.save();
    await cancelPendingForTeam(current._id, request._id);
    throw conflict('TEAM_FULL', 'This team is full');
  }

  const becameFull = teamSize(acceptedTeam) >= acceptedTeam.maxTeamSize;
  if (becameFull) {
    await Team.updateOne({ _id: acceptedTeam._id }, { $set: { status: 'closed' } });
  }

  request.status = 'accepted';
  request.respondedAt = new Date();
  await request.save();

  if (becameFull) {
    await cancelPendingForTeam(team._id, request._id);
  }

  const recipient = request.type === 'request' ? request.user : request.initiatedBy;
  await notifications.createNotification({
    userId: recipient,
    type: request.type === 'request' ? 'request_accepted' : 'invitation_accepted',
    title: request.type === 'request' ? 'You joined a team' : 'Invitation accepted',
    message:
      request.type === 'request'
        ? `Your request to join ${team.name} was accepted.`
        : `${team.name} accepted your invitation.`,
    data: { teamId: String(team._id), requestId: String(request._id) },
  });

  if (becameFull && String(team.leader) !== String(recipient)) {
    await notifications.createNotification({
      userId: team.leader,
      type: 'team_full',
      title: 'Team is full',
      message: `${team.name} is now full and has been closed to new requests.`,
      data: { teamId: String(team._id) },
    });
  }

  return serialize(request);
}

async function cancel(requestId, userId) {
  assertObjectId(requestId, 'request id');
  const request = await JoinRequest.findById(requestId);
  if (!request) {
    throw notFound();
  }
  await expireIfNeeded(request);
  if (request.status !== PENDING_STATUS) {
    throw conflict('REQUEST_NOT_PENDING', `This request is already ${request.status}`);
  }

  const team = await Team.findById(request.team);
  const isSender = String(request.user) === String(userId);
  const isInitiator = String(request.initiatedBy) === String(userId);
  const isTeamLeader = team ? isLeader(team, userId) : false;
  if (!isSender && !isInitiator && !isTeamLeader) {
    throw forbidden('You cannot cancel this request');
  }

  request.status = 'cancelled';
  request.respondedAt = new Date();
  await request.save();
  return serialize(request);
}

module.exports = {
  sendJoinRequest,
  sendInvitation,
  listTeamRequests,
  listMine,
  respond,
  cancel,
  cancelPendingForTeam,
  serialize,
  isLeader,
};
