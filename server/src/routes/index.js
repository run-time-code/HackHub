'use strict';

const { Router } = require('express');
const healthRoutes = require('./health');
const teamsRoutes = require('./teams');
const usersRoutes = require('./users');

const router = Router();

router.use('/health', healthRoutes);
router.use('/teams', teamsRoutes);
router.use('/users', usersRoutes);

// Future feature routers plug in here, e.g.:
// router.use('/auth', require('./auth'));
// router.use('/hackathons', require('./hackathons'));

// Future feature routers plug in here, e.g.:
// router.use('/auth', require('./auth'));
// router.use('/hackathons', require('./hackathons'));
// router.use('/teams', require('./teams'));

module.exports = router;
