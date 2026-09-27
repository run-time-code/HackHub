'use strict';

const { Router } = require('express');
const { getHealthStatus } = require('../controllers/healthController');

const router = Router();

router.get('/', getHealthStatus);

module.exports = router;
