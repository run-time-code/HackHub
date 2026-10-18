'use strict';

const { getHealth } = require('../services/healthService');

function getHealthStatus(req, res) {
  const health = getHealth();
  const status = health.db === 'up' ? 200 : 503;
  res.status(status).json({ success: health.db === 'up', data: health, requestId: req.id });
}

module.exports = { getHealthStatus };
