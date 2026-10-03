'use strict';

const { Router } = require('express');
const healthRoutes = require('./health');

const router = Router();

router.use('/health', healthRoutes);

// Future feature routers plug in here, e.g.:
// router.use('/auth', require('./auth'));
// router.use('/hackathons', require('./hackathons'));
// router.use('/teams', require('./teams'));

module.exports = router;
