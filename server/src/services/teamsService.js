'use strict';

const mongoose = require('mongoose');

const { Team } = require('../models/team');

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

function assertObjectId(value, name) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw badRequest(`${name} must be a valid id`);
  }
}

function isLeader(team, userId) {
  return String(team.leader) === String(userId);
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
    throw badRequest(err.message);
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
  try {
    await team.validate();
  } catch (err) {
    throw badRequest(err.message);
  }
  await team.save();
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
  await team.deleteOne();
}

module.exports = {
  createTeam,
  listTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  isLeader,
  serialize,
};
