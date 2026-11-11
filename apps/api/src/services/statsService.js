'use strict';

const Hackathon = require('../../models/Hackathon');
const User = require('../../models/User');
const { Team } = require('../models/team');
const { JoinRequest } = require('../models/joinRequest');
const { visibleFilter } = require('./hackathonsService');
const config = require('../config');

// The landing page reads these counters on every visit. They are global,
// non-personal numbers, so a short cache (default 30s) removes five
// collection counts per page view without exposing anyone's data. Every API
// instance keeps its own copy; staleness is bounded by the TTL.
let cached = null;

function invalidateStatsCache() {
  cached = null;
}

async function computeStats() {
  const [hackathons, teams, builders, openTeams, matches] = await Promise.all([
    Hackathon.countDocuments(visibleFilter()),
    Team.countDocuments({}),
    // Discovery excludes banned accounts, so the public counter must too.
    User.countDocuments({ discoverable: true, deletedAt: null, banned: { $ne: true } }),
    Team.countDocuments({ status: 'open' }),
    JoinRequest.countDocuments({ status: 'accepted' }),
  ]);

  return { hackathons, teams, builders, openTeams, matches };
}

async function getStats() {
  const ttl = Number(config.statsCacheTtlMs) || 0;

  if (ttl > 0 && cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const value = await computeStats();

  if (ttl > 0) {
    cached = { value, expiresAt: Date.now() + ttl };
  }

  return value;
}

module.exports = { getStats, invalidateStatsCache };
