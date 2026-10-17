'use strict';

const service = require('../services/hackathonsService');

async function list(req, res, next) {
  try {
    const result = await service.listHackathons(req.query);
    res.status(200).json({ success: true, data: result, requestId: req.id });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const hackathon = await service.getHackathonById(req.params.id);
    res.status(200).json({ success: true, data: hackathon, requestId: req.id });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne };