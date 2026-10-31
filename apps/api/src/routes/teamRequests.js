'use strict';

const { Router } = require('express');

const { doubleCsrfProtection } = require('../../middleware/csrfMiddleware');

const controller = require('../controllers/joinRequestsController');
const requireAuth = require('../middleware/requireAuth');
const { teamWriteLimiter } = require('../../middleware/rateLimitMiddleware');

const router = Router();

// GET /team-requests/mine?status=pending — requests I sent and invitations
// I received/sent.
router.get('/mine', requireAuth, controller.listMine);
// PATCH /team-requests/:id { action: "accept" | "decline" }
router.patch('/:id', requireAuth, teamWriteLimiter, doubleCsrfProtection, controller.respond);
// DELETE /team-requests/:id — cancel a pending request/invitation.
router.delete('/:id', requireAuth, teamWriteLimiter, doubleCsrfProtection, controller.cancel);

module.exports = router;
