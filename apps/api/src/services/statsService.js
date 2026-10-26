'use strict';

const Hackathon = require('../../models/Hackathon');
const User = require('../../models/User');
const { Team } = require('../models/team');
const { JoinRequest } = require('../models/joinRequest');

// Public product counters. No user-identifying data leaves this endpoint.
async function getStats() {
  const [hackathons, teams, builders, openTeams, matches] = await Promise.all([
    Hackathon.countDocuments({ is_hidden: { $ne: true } }),
    Team.countDocuments({}),
    User.countDocuments({ discoverable: true, deletedAt: null }),
    Team.countDocuments({ status: 'open' }),
    JoinRequest.countDocuments({ status: 'accepted' }),
  ]);

  return { hackathons, teams, builders, openTeams, matches };
}

module.exports = { getStats };
