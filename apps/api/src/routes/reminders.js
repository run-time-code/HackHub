'use strict';

const { Router } = require('express');

const controller = require('../controllers/remindersController');
const requireAuth = require('../middleware/requireAuth');
const { doubleCsrfProtection } = require('../../middleware/csrfMiddleware');

const router = Router();

// Reminder preferences must stay above /:id so they are never parsed as ids.
router.get('/preferences', requireAuth, controller.getPreferences);
router.put('/preferences', requireAuth, doubleCsrfProtection, controller.updatePreferences);

router.get('/', requireAuth, controller.list);
router.post('/', requireAuth, doubleCsrfProtection, controller.create);
router.delete('/:id', requireAuth, doubleCsrfProtection, controller.remove);

module.exports = router;
