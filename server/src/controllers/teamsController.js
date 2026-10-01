'use strict';

const teamsService = require('../services/teamsService');

function send(res, status, data, req) {
  res.status(status).json({ success: true, data, requestId: req.id });
}

async function create(req, res, next) {
  try {
    const team = await teamsService.createTeam(req.body, req.user.id);
    send(res, 201, team, req);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const result = await teamsService.listTeams(req.query);
    send(res, 200, result, req);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const team = await teamsService.getTeamById(req.params.id);
    send(res, 200, team, req);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const team = await teamsService.updateTeam(req.params.id, req.body, req.user.id);
    send(res, 200, team, req);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await teamsService.deleteTeam(req.params.id, req.user.id);
    send(res, 200, { deleted: true }, req);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getOne, update, remove };
