'use strict';

const mongoose = require('mongoose');

const { Team } = require('../models/team');
const { JoinRequest } = require('../models/joinRequest');
const { hackathonExists } = require('./hackathonsService');
const notifications = require('./notificationsService');

const ALLOWED_UPDATE_FIELDS = ['name', 'description', 'rolesNeeded', 'maxTeamSize', 'status'];
const IMMUTABLE_FIELDS = ['members', 'leader', 'hackathon'];
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function badRequest(message) {
  return { status: 400, code: 'VALIDATION_ERROR', message };
}

function notFound() {
  return { status: 404, code: 'TEAM_NOT_FOUND', message: 'Team not found' };
}

function forbidden() {
  return { status: 403, code: 'TEAM_FORBIDDEN', message: 'Only the team leader can do this' };
}

// F-23: map Mongoose validation text to stable client messages instead of
// leaking schema internals.
function friendlyValidationError(err) {
  const details = err && err.errors ? Object.values(err.errors) : [];
  const first = details[0];
  const kind = first && first.kind;
  const path = first && first.path;
  if (kind === 'maxlength') return badRequest(`${path} is too long`);
  if (kind === 'minlength') return badRequest(`${path} is too short`);
  if (kind === 'min') return badRequest(`${path} is too small`);
  if (kind === 'max') return badRequest(`${path} is too large`);
  if (kind === 'enum') return badRequest(`${path} has an invalid value`);
  if (kind === 'required') return badRequest(`${path} is required`);
  if (first && first.message) return badRequest('Invalid team data');
  return badRequest(err && err.message ? err.message : 'Invalid team data');
}

function assertObjectId(value, name) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw badRequest(`${name} must be a valid id`);
  }
}

function isLeader(team, userId) {
  return String(team.leader) === String(userId);
}

async function cancelPendingRequests(teamId) {
  await JoinRequest.updateMany(
    { team: teamId, status: 'pending' },
    { $set: { status: 'cancelled', respondedAt: new Date() } }
  );
}

function serialize(team) {
  const obj = team.toObject ? team.toObject({ virtuals: true }) : team;
  const size = 1 + (obj.members ? obj.members.length : 0);
  return {
    id: String(obj._id || obj.id),
    name: obj.name,
    description: obj.description,
    hackathon: String(obj.hackathon),
    leader: String(obj.leader),
    members: (obj.members || []).map((m) => ({
      user: String(m.user),
      role: m.role,
      joinedAt: m.joinedAt,
    })),
    rolesNeeded: obj.rolesNeeded || [],
    maxTeamSize: obj.maxTeamSize,
    size,
    openSlots: Math.max((obj.maxTeamSize || 0) - size, 0),
    status: obj.status,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

async function createTeam(input, leaderId) {
  const { name, hackathonId, description = '', rolesNeeded = [], maxTeamSize = 4 } = input || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw badRequest('name is required');
  }
  if (!hackathonId) {
    throw badRequest('hackathonId is required');
  }
  assertObjectId(hackathonId, 'hackathonId');
  if (!(await hackathonExists(hackathonId))) {
    throw badRequest('hackathonId does not reference an existing hackathon');
  }
  const team = new Team({
    name: name.trim(),
    description: typeof description === 'string' ? description.trim() : '',
    hackathon: hackathonId,
    leader: leaderId,
    members: [],
    rolesNeeded: Array.isArray(rolesNeeded) ? rolesNeeded.map((r) => String(r).trim()) : [],
    maxTeamSize,
  });
  try {
    await team.validate();
  } catch (err) {
    throw friendlyValidationError(err);
  }
  await team.save();
  return serialize(team);
}

async function listTeams(query) {
  const { hackathonId, status, page = 1, limit = DEFAULT_LIMIT } = query || {};
  if (!hackathonId) {
    throw badRequest('hackathonId query parameter is required');
  }
  assertObjectId(hackathonId, 'hackathonId');
  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const filter = { hackathon: hackathonId };
  if (status !== undefined) {
    if (!['open', 'closed'].includes(status)) {
      throw badRequest("status must be 'open' or 'closed'");
    }
    filter.status = status;
  }
  const [items, total] = await Promise.all([
    Team.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
    Team.countDocuments(filter),
  ]);
  return { items: items.map(serialize), page: pageNum, limit: limitNum, total };
}

async function getTeamById(id) {
  assertObjectId(id, 'team id');
  const team = await Team.findById(id);
  if (!team) {
    throw notFound();
  }
  return serialize(team);
}

async function updateTeam(id, updates, requesterId) {
  assertObjectId(id, 'team id');
  const team = await Team.findById(id);
  if (!team) {
    throw notFound();
  }
  if (!isLeader(team, requesterId)) {
    throw forbidden();
  }
  const wasClosed = team.status === 'closed';
  const rejected = IMMUTABLE_FIELDS.filter(
    (field) => updates && updates[field] !== undefined
  );
  if (rejected.length > 0) {
    throw badRequest(`${rejected.join(', ')} cannot be changed here`);
  }
  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (updates && updates[field] !== undefined) {
      if (field === 'name' || field === 'description') {
        team[field] = String(updates[field]).trim();
      } else if (field === 'rolesNeeded') {
        team[field] = Array.isArray(updates[field])
          ? updates[field].map((r) => String(r).trim())
          : updates[field];
      } else {
        team[field] = updates[field];
      }
    }
  }
  const size = 1 + team.members.length;
  if (team.maxTeamSize < size) {
    throw badRequest(`maxTeamSize cannot be below the current team size (${size})`);
  }
  // A team is never left open with no seats; closing it also clears the
  // queue of people waiting, so nobody is stuck on a team that is full.
  if (size >= team.maxTeamSize) {
    team.status = 'closed';
  }
  try {
    await team.validate();
  } catch (err) {
    throw friendlyValidationError(err);
  }
  await team.save();
  if (!wasClosed && team.status === 'closed') {
    await cancelPendingRequests(team._id);
  }
  return serialize(team);
}

async function deleteTeam(id, requesterId) {
  assertObjectId(id, 'team id');
  const team = await Team.findById(id);
  if (!team) {
    throw notFound();
  }
  if (!isLeader(team, requesterId)) {
    throw forbidden();
  }
  await cancelPendingRequests(team._id);
  await team.deleteOne();
}

// Leader hand-off. The outgoing leader stays on the team as a regular
// member; the new leader must already be a member (they joined through the
// request/invitation flow).
async function transferLeader(id, requesterId, newLeaderId) {
  assertObjectId(id, 'team id');
  if (!newLeaderId) {
    throw badRequest('userId is required');
  }
  assertObjectId(newLeaderId, 'userId');
  const team = await Team.findById(id);
  if (!team) {
    throw notFound();
  }
  if (!isLeader(team, requesterId)) {
    throw forbidden();
  }
  if (String(newLeaderId) === String(team.leader)) {
    throw badRequest('That user is already the leader');
  }
  const index = team.members.findIndex((m) => String(m.user) === String(newLeaderId));
  if (index === -1) {
    throw badRequest('The new leader must be a current team member');
  }

  team.members.splice(index, 1);
  team.members.push({ user: requesterId, role: 'member', joinedAt: new Date() });
  team.leader = newLeaderId;
  await team.save();

  await notifications.createNotification({
    userId: newLeaderId,
    type: 'leader_changed',
    title: 'You are now the team leader',
    message: `You are now the leader of ${team.name}.`,
    data: { teamId: String(team._id) },
  });
  await notifications.createNotification({
    userId: requesterId,
    type: 'leader_changed',
    title: 'Team leadership transferred',
    message: `You handed leadership of ${team.name} to another member.`,
    data: { teamId: String(team._id) },
  });

  return serialize(team);
}

// F-17: self-leave or leader-removal. A freed seat reopens a closed team.
// The leader cannot leave without transferring first.
async function removeMember(id, targetUserId, requesterId) {
  assertObjectId(id, 'team id');
  assertObjectId(targetUserId, 'user id');
  const team = await Team.findById(id);
  if (!team) {
    throw notFound();
  }
  const isSelf = String(targetUserId) === String(requesterId);
  const leader = isLeader(team, requesterId);
  if (!isSelf && !leader) {
    throw forbidden();
  }
  if (isSelf && isLeader(team, requesterId)) {
    throw badRequest('Transfer leadership before leaving the team');
  }
  const index = (team.members || []).findIndex((m) => String(m.user) === String(targetUserId));
  if (index === -1) {
    throw { status: 404, code: 'MEMBER_NOT_FOUND', message: 'Team member not found' };
  }
  team.members.splice(index, 1);
  if (team.status === 'closed' && 1 + team.members.length < team.maxTeamSize) {
    team.status = 'open';
  }
  await team.save();
  const removedIsLeaderAction = !isSelf;
  await notifications.createNotification({
    userId: targetUserId,
    type: removedIsLeaderAction ? 'member_removed' : 'member_left',
    title: removedIsLeaderAction ? 'Removed from team' : 'You left the team',
    message: removedIsLeaderAction
      ? `You were removed from ${team.name}.`
      : `You left ${team.name}.`,
    data: { teamId: String(team._id) },
    email: false,
  });
  await notifications.createNotification({
    userId: team.leader,
    type: removedIsLeaderAction ? 'member_removed' : 'member_left',
    title: removedIsLeaderAction ? 'Member removed' : 'Member left',
    message: removedIsLeaderAction
      ? `A member was removed from ${team.name}.`
      : `A member left ${team.name}.`,
    data: { teamId: String(team._id), userId: String(targetUserId) },
    email: false,
  });
  return serialize(team);
}

module.exports = {
  createTeam,
  listTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  transferLeader,
  removeMember,
  isLeader,
  serialize,
};
