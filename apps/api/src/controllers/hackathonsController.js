'use strict';

const service = require('../services/hackathonsService');
const rankingService = require('../services/hackathonRankingService');

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

async function getFacets(req, res, next) {
  try {
    const facets = await service.getHackathonFacets();
    res.status(200).json({ success: true, data: facets, requestId: req.id });
  } catch (err) {
    next(err);
  }
}

async function getRecommendations(req, res, next) {
  try {
    const result = await rankingService.getRecommendations(req.user.id, req.query);
    res.status(200).json({ success: true, data: result, requestId: req.id });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, getFacets, getRecommendations };