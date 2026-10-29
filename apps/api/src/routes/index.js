'use strict';

const { Router } = require('express');
const healthRoutes = require('./health');
const teamsRoutes = require('./teams');
const teamRequestsRoutes = require('./teamRequests');
const usersRoutes = require('./users');
const notificationsRoutes = require('./notifications');
const hackathonsRoutes = require('./hackathons');
const statsRoutes = require('./stats');
const feedbackRoutes = require('./feedback');

const router = Router();

router.use('/health', healthRoutes);
router.use('/teams', teamsRoutes);
router.use('/team-requests', teamRequestsRoutes);
router.use('/users', usersRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/hackathons', hackathonsRoutes);
router.use('/stats', statsRoutes);
router.use('/feedback', feedbackRoutes);

// Future feature routers plug in here, e.g.:
// router.use('/auth', require('./auth'));

module.exports = router;
