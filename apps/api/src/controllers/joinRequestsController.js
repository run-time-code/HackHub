'use strict';

const service = require('../services/joinRequestsService');

function send(res, status, data, req) {
  res.status(status).json({ success: true, data, requestId: req.id });
}

async function sendRequest(req, res, next) {
  try {
    const request = await service.sendJoinRequest(req.params.id, req.user.id, req.body);
    send(res, 201, request, req);
  } catch (err) {
    next(err);
  }
}

async function invite(req, res, next) {
  try {
    const invitation = await service.sendInvitation(req.params.id, req.user.id, req.body);
    send(res, 201, invitation, req);
  } catch (err) {
    next(err);
  }
}

async function listForTeam(req, res, next) {
  try {
    const result = await service.listTeamRequests(
      req.params.id,
      req.user.id,
      req.query.type || 'request'
    );
    send(res, 200, result, req);
  } catch (err) {
    next(err);
  }
}

async function listInvitations(req, res, next) {
  try {
    const result = await service.listTeamRequests(req.params.id, req.user.id, 'invite');
    send(res, 200, result, req);
  } catch (err) {
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const result = await service.listMine(req.user.id, req.query);
    send(res, 200, result, req);
  } catch (err) {
    next(err);
  }
}

async function respond(req, res, next) {
  try {
    const request = await service.respond(req.params.id, req.user.id, req.body);
    send(res, 200, request, req);
  } catch (err) {
    next(err);
  }
}

async function cancel(req, res, next) {
  try {
    const request = await service.cancel(req.params.id, req.user.id);
    send(res, 200, request, req);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  sendRequest,
  invite,
  listForTeam,
  listInvitations,
  listMine,
  respond,
  cancel,
};
