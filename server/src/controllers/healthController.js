'use strict';

const { getHealth } = require('../services/healthService');

function getHealthStatus(req, res) {
  res.json({ success: true, data: getHealth(), requestId: req.id });
}

module.exports = { getHealthStatus };
