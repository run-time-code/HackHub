'use strict';

const statsService = require('../services/statsService');

async function getStats(req, res, next) {
  try {
    const stats = await statsService.getStats();
    res.status(200).json({ success: true, data: stats, requestId: req.id });
  } catch (err) {
    next(err);
  }
}

module.exports = { getStats };
