'use strict';

// Mongoose models live here.
// Berwin owns User/session models (auth), Nandhini owns Hackathon/organizer
// models. Import and re-export them from this file once added, e.g.:
//
// const User = require('./User');
// const Hackathon = require('./Hackathon');
// module.exports = { User, Hackathon };

const { Team } = require('./team');
const { JoinRequest } = require('./joinRequest');
const { Notification } = require('./notification');
const { Reminder, EVENT_TYPES, CHANNELS } = require('./reminder');

module.exports = { Team, JoinRequest, Notification, Reminder, EVENT_TYPES, CHANNELS };
