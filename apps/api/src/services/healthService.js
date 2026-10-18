'use strict';

const mongoose = require('mongoose');

const config = require('../config');

const startedAt = Date.now();

// DB-aware health: deploy gates on /health, so it must fail when Mongo is
// unreachable instead of reporting uptime alone.
function getHealth(readyState) {
  const state = readyState === undefined ? mongoose.connection.readyState : readyState;
  const db = state === 1 ? 'up' : 'down';
  return {
    status: db === 'up' ? 'ok' : 'degraded',
    service: 'hackhub-api',
    env: config.env,
    db,
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  };
}

module.exports = { getHealth };
