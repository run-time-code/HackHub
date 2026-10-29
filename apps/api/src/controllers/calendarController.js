'use strict';

const service = require('../services/calendarService');

async function list(req, res, next) {
  try {
    const result = await service.listEvents(req.query.month);
    res.status(200).json({ success: true, data: result, requestId: req.id });
  } catch (err) {
    next(err);
  }
}

module.exports = { list };
