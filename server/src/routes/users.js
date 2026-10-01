'use strict';

const { Router } = require('express');

const usersController = require('../controllers/usersController');
const requireAuth = require('../middleware/requireAuth');

const router = Router();

// Teammate discovery. Login required; only opt-in users are listed.
// GET /users/discover?skills=react,node&availability=available&lookingForTeam=true
router.get('/discover', requireAuth, usersController.discover);

module.exports = router;
