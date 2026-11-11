'use strict';

const User = require('../../models/User');
const config = require('../config');

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

  // Rank in the database instead of loading every matching user into memory.
  // Scores keep the 70/30 skill/interest weighting (100 when only one
  // dimension is supplied) and the name tiebreak, but only one page of
  // documents crosses the wire.
  const matchedField = (field) => ({
    $map: {
      input: { $cond: [{ $isArray: field }, field, []] },
      as: 'value',
      in: { $toLower: { $toString: '$$value' } },
    },
  });

  const scoreTerms = [];
  if (skills.length > 0) {
    scoreTerms.push({
      $multiply: [
        interests.length > 0 ? 70 : 100,
        { $divide: [{ $size: '$matchedSkills' }, skills.length] },
      ],
    });
  }
  if (interests.length > 0) {
    scoreTerms.push({
      $multiply: [
        skills.length > 0 ? 30 : 100,
        { $divide: [{ $size: '$matchedInterests' }, interests.length] },
      ],
    });
  }

  // $floor(x + 0.5) mirrors Math.round for the non-negative scores here.
  const matchScoreExpression = {
    $floor: { $add: [...scoreTerms, 0.5] },
  };

  const projection = Object.fromEntries(
    DISCOVERY_FIELDS.split(' ').map((field) => [field, 1])
  );

  // Even with database-side scoring, a broad filter can match hundreds of
  // thousands of users. Score at most the newest N candidates (0 disables the
  // cap) so one request has a bounded cost; this is reported to the client as
  // `truncated` rather than silently pretending the page is complete.
  const maxCandidates = Number(config.discoveryMaxCandidates) || 0;
  const candidateStages = maxCandidates > 0
    ? [{ $sort: { _id: -1 } }, { $limit: maxCandidates }]
    : [];

  const [users, total] = await Promise.all([
    User.aggregate([
      { $match: filter },
      ...candidateStages,
      {
        $addFields: {
          matchedSkills: {
            $setIntersection: [
              matchedField('$skills'),
              skills.map((skill) => skill.toLowerCase()),
            ],
          },
          matchedInterests: {
            $setIntersection: [
              matchedField('$preferences.interests'),
              interests.map((interest) => interest.toLowerCase()),
            ],
          },
        },
      },
      {
        $addFields: {
          matchCount: { $size: '$matchedSkills' },
          matchScore: matchScoreExpression,
        },
      },
      { $sort: { matchScore: -1, name: 1, _id: 1 } },
      { $skip: skip },
      { $limit: limitNum },
      {
        $project: {
          ...projection,
          matchedSkills: 1,
          matchedInterests: 1,
          matchCount: 1,
          matchScore: 1,
        },
      },
    ]),
    User.countDocuments(filter),
  ]);

  return {
    items: users.map((user) => {
      const haveSkills = new Set(user.matchedSkills || []);
      const haveInterests = new Set(user.matchedInterests || []);

      return serialize(user, {
        matchCount: user.matchCount || 0,
        matchScore: user.matchScore || 0,
        matchedSkills: skills.filter((skill) => haveSkills.has(skill.toLowerCase())),
        matchedInterests: interests.filter((interest) =>
          haveInterests.has(interest.toLowerCase())
        ),
      });
    }),
    page: pageNum,
    limit: limitNum,
    total,
    truncated: maxCandidates > 0 && total > maxCandidates,
  };
}

module.exports = { searchTeammates };
