'use strict';

const { Router } = require('express');

const controller = require('../controllers/savedHackathonsController');
const requireAuth = require('../middleware/requireAuth');
const { doubleCsrfProtection } = require('../../middleware/csrfMiddleware');

const router = Router();

router.get('/', requireAuth, controller.list);
router.post('/', requireAuth, doubleCsrfProtection, controller.create);
router.patch('/:id', requireAuth, doubleCsrfProtection, controller.update);
router.delete('/:id', requireAuth, doubleCsrfProtection, controller.remove);

module.exports = router;
