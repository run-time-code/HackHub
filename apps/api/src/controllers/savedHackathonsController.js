'use strict';

const service = require('../services/savedHackathonsService');

async function list(req, res, next) {
  try {
    const result = await service.listSaved(req.user.id);
    res.status(200).json({ success: true, data: result, requestId: req.id });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const result = await service.save(req.user.id, req.body?.hackathonId);
    res.status(201).json({ success: true, data: result, requestId: req.id });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const result = await service.update(req.user.id, req.params.id, req.body);
    res.status(200).json({ success: true, data: result, requestId: req.id });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await service.remove(req.user.id, req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
