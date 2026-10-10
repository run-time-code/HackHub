'use strict';

const config = require('../config');

const startedAt = Date.now();

function getHealth() {
  return {
    status: 'ok',
    service: 'hackhub-api',
    env: config.env,
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  };
}

module.exports = { getHealth };
