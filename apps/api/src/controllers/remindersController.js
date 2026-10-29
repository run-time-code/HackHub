'use strict';

const service = require('../services/remindersService');

async function list(req, res, next) {
  try {
    const result = await service.listReminders(req.user.id);
    res.status(200).json({ success: true, data: result, requestId: req.id });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const result = await service.createReminder(req.user.id, req.body);
    res.status(201).json({ success: true, data: result, requestId: req.id });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await service.removeReminder(req.user.id, req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function getPreferences(req, res, next) {
  try {
    const result = await service.getPreferences(req.user.id);
    res.status(200).json({ success: true, data: result, requestId: req.id });
  } catch (err) {
    next(err);
  }
}

async function updatePreferences(req, res, next) {
  try {
    const result = await service.updatePreferences(req.user.id, req.body);
    res.status(200).json({ success: true, data: result, requestId: req.id });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, remove, getPreferences, updatePreferences };
