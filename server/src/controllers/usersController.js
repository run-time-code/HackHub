'use strict';

const usersService = require('../services/usersService');

async function discover(req, res, next) {
  try {
    const result = await usersService.searchTeammates(req.query);
    res.status(200).json({ success: true, data: result, requestId: req.id });
  } catch (err) {
    next(err);
  }
}

module.exports = { discover };
