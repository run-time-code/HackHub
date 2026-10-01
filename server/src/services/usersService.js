'use strict';

const User = require('../../models/User');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const AVAILABILITY = ['available', 'limited', 'unavailable'];

// Public teammate card. Never expose email, password, tokens or roles here:
// discovery is opt-in (discoverable=true) and contact happens through the
// join-request flow, so no direct contact details leave the server.
function serialize(user, matchCount) {
  return {
    id: String(user._id),
    name: user.name,
    skills: user.skills || [],
    availability: user.availability,
    lookingForTeam: user.lookingForTeam,
    matchCount,
  };
}

function parseBool(value, fallback) {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const text = String(value).trim().toLowerCase();
  if (['true', '1', 'yes'].includes(text)) {
    return true;
  }
  if (['false', '0', 'no'].includes(text)) {
    return false;
  }
  throw { status: 400, code: 'VALIDATION_ERROR', message: 'lookingForTeam must be true or false' };
}

function parseSkills(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return [];
  }
  const skills = String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (skills.length > 10) {
    throw { status: 400, code: 'VALIDATION_ERROR', message: 'search at most 10 skills at once' };
  }
  return skills;
}

async function searchTeammates(query) {
  const { skills: skillsParam, availability, lookingForTeam: lookingParam, page = 1, limit = DEFAULT_LIMIT } = query || {};

  const skills = parseSkills(skillsParam);
  const lookingForTeam = parseBool(lookingParam, true);

  // Privacy rule: only users who explicitly opted in are ever returned.
  const filter = { discoverable: true, lookingForTeam };
  if (availability !== undefined) {
    if (!AVAILABILITY.includes(availability)) {
      throw {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: `availability must be one of: ${AVAILABILITY.join(', ')}`,
      };
    }
    filter.availability = availability;
  }
  if (skills.length > 0) {
    filter.skills = { $in: skills.map((s) => new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) };
  }

  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('name skills availability lookingForTeam')
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    User.countDocuments(filter),
  ]);

  const lowered = skills.map((s) => s.toLowerCase());
  const ranked = users
    .map((user) => {
      const have = new Set((user.skills || []).map((s) => String(s).toLowerCase()));
      const matchCount = lowered.filter((s) => have.has(s)).length;
      return serialize(user, skills.length > 0 ? matchCount : 0);
    })
    .sort((a, b) => b.matchCount - a.matchCount);

  return { items: ranked, page: pageNum, limit: limitNum, total };
}

module.exports = { searchTeammates };
