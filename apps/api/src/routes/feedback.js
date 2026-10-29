'use strict';

const { Router } = require('express');

const feedbackController = require('../controllers/feedbackController');
const { feedbackLimiter } = require('../../middleware/rateLimitMiddleware');

const router = Router();

// Public feedback intake. Authentication is optional; the route never
// rejects anonymous submissions.
router.post('/', feedbackLimiter, feedbackController.create);

module.exports = router;
