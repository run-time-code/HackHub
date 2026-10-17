'use strict';

const { Router } = require('express');

const controller = require('../controllers/hackathonsController');

const router = Router();

// Public catalogue used by the team feature. GET /hackathons?q=&page=&limit=
// and GET /hackathons/:id (ObjectId or slug).
router.get('/', controller.list);
router.get('/:id', controller.getOne);

module.exports = router;