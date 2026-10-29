'use strict';

const { Router } = require('express');

const controller = require('../controllers/calendarController');
const requireAuth = require('../middleware/requireAuth');

const router = Router();

// The month grid is built from visible hackathon deadlines.
// GET /calendar?month=YYYY-MM
router.get('/', requireAuth, controller.list);

module.exports = router;
