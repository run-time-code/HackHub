'use strict';

const User = require('../../models/User');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const AVAILABILITY = ['available', 'limited', 'unavailable'];
const DISCOVERY_FIELDS = [
  'name',
  'headline',
  'bio',
  'college',
  'location',
  'year',
  'avatarUrl',
  'skills',
  'skillProficiency',
  'availability',
  'lookingForTeam',
  'preferences',
  'updatedAt',
].join(' ');

function badRequest(message) {
  return { status: 400, code: 'VALIDATION_ERROR', message };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function exactInsensitive(value) {
  return new RegExp(`^${escapeRegExp(value)}$`, 'i');
}

// Public teammate card. Never expose email, password, tokens or roles here:
// discovery is opt-in (discoverable=true) and contact happens through the
// join-request flow, so no direct contact details leave the server.
function serialize(user, match) {
  return {
    id: String(user._id),
    name: user.name,
    headline: user.headline || '',
    bio: user.bio || '',
    college: user.college || '',
    location: user.location || '',
    year: user.year || '',
    avatarUrl: user.avatarUrl || '',
    skills: user.skills || [],
    skillProficiency: user.skillProficiency || {},
    availability: user.availability,
    lookingForTeam: Boolean(user.lookingForTeam),
    matchCount: match.matchCount,
    matchScore: match.matchScore,
    matchedSkills: match.matchedSkills,
    matchedInterests: match.matchedInterests,
    updatedAt: user.updatedAt || null,
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
  throw badRequest('lookingForTeam must be true or false');
}

function parseList(value, label) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return [];
  }
  const entries = String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length > 10) {
    throw badRequest(`search at most 10 ${label} at once`);
  }
  return entries;
}

function matchUser(user, skills, interests) {
  const haveSkills = new Set(
    (user.skills || []).map((skill) => String(skill).toLowerCase())
  );
  const rawInterests =
    user.preferences && Array.isArray(user.preferences.interests)
      ? user.preferences.interests
      : [];
  const haveInterests = new Set(rawInterests.map((interest) => String(interest).toLowerCase()));

  const matchedSkills = skills.filter((skill) => haveSkills.has(skill.toLowerCase()));
  const matchedInterests = interests.filter((interest) =>
    haveInterests.has(interest.toLowerCase())
  );

  let matchScore = 0;
  if (skills.length > 0 && interests.length > 0) {
    matchScore =
      70 * (matchedSkills.length / skills.length) +
      30 * (matchedInterests.length / interests.length);
  } else if (skills.length > 0) {
    matchScore = 100 * (matchedSkills.length / skills.length);
  } else if (interests.length > 0) {
    matchScore = 100 * (matchedInterests.length / interests.length);
  }

  return {
    matchCount: matchedSkills.length,
    matchScore: Math.round(matchScore),
    matchedSkills,
    matchedInterests,
  };
}

function emptyMatch() {
  return { matchCount: 0, matchScore: 0, matchedSkills: [], matchedInterests: [] };
}

async function searchTeammates(query) {
  const {
    q,
    skills: skillsParam,
    interests: interestsParam,
    availability,
    lookingForTeam: lookingParam,
    page = 1,
    limit = DEFAULT_LIMIT,
  } = query || {};

  const skills = parseList(skillsParam, 'skills');
  const interests = parseList(interestsParam, 'interests');
  const lookingForTeam = parseBool(lookingParam, true);

  // Privacy rule: only users who explicitly opted in are ever returned.
  const filter = { discoverable: true, lookingForTeam, deletedAt: null, banned: { $ne: true } };

  if (availability !== undefined) {
    if (!AVAILABILITY.includes(availability)) {
      throw badRequest(`availability must be one of: ${AVAILABILITY.join(', ')}`);
    }
    filter.availability = availability;
  }

  if (skills.length > 0) {
    filter.skills = { $in: skills.map(exactInsensitive) };
  }

  if (interests.length > 0) {
    filter['preferences.interests'] = { $in: interests.map(exactInsensitive) };
  }

  const search = q === undefined || q === null ? '' : String(q).trim();
  if (search) {
    const pattern = new RegExp(escapeRegExp(search), 'i');
    filter.$or = [{ name: pattern }, { headline: pattern }, { skills: pattern }];
  }

  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const skip = (pageNum - 1) * limitNum;

  // With no match filters every score is zero, so Mongo can do the
  // name-ascending sort and pagination directly.
  if (skills.length === 0 && interests.length === 0) {
    const [users, total] = await Promise.all([
      User.find(filter)
        .select(DISCOVERY_FIELDS)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter),
    ]);
    return {
      items: users.map((user) => serialize(user, emptyMatch())),
      page: pageNum,
      limit: limitNum,
      total,
    };
  }

  // Match scores are computed from case-insensitive overlap counts. Ranking
  // in memory keeps the 70/30 skill/interest weighting (and name tiebreak)
  // across the whole filtered set rather than just the current page.
  const [users, total] = await Promise.all([
    User.find(filter).select(DISCOVERY_FIELDS).lean(),
    User.countDocuments(filter),
  ]);

  const ranked = users
    .map((user) => ({
      user,
      match: matchUser(user, skills, interests),
    }))
    .sort((a, b) => {
      if (b.match.matchScore !== a.match.matchScore) {
        return b.match.matchScore - a.match.matchScore;
      }
      return String(a.user.name || '').localeCompare(String(b.user.name || ''));
    });

  return {
    items: ranked.slice(skip, skip + limitNum).map(({ user, match }) => serialize(user, match)),
    page: pageNum,
    limit: limitNum,
    total,
  };
}

module.exports = { searchTeammates };
