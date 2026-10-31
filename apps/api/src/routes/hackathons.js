'use strict';

const { Router } = require('express');

const controller = require('../controllers/hackathonsController');
const requireAuth = require('../middleware/requireAuth');

const router = Router();

// Public catalogue used by the team feature. GET /hackathons?q=&page=&limit=
// and GET /hackathons/:id (ObjectId or slug).
router.get('/facets', controller.getFacets);
router.get('/recommendations', requireAuth, controller.getRecommendations);
router.get('/', controller.list);
router.get('/:id', controller.getOne);

module.exports = router;