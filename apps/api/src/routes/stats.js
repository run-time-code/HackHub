'use strict';

const { Router } = require('express');

const statsController = require('../controllers/statsController');

const router = Router();

// Public: no authentication, same global CORS as every other src route.
router.get('/', statsController.getStats);

module.exports = router;
