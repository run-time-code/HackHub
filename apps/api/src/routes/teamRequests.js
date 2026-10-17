'use strict';

const { Router } = require('express');

const controller = require('../controllers/joinRequestsController');
const requireAuth = require('../middleware/requireAuth');
const { teamWriteLimiter } = require('../../middleware/rateLimitMiddleware');

const router = Router();

// GET /team-requests/mine?status=pending — requests I sent and invitations
// I received/sent.
router.get('/mine', requireAuth, controller.listMine);
// PATCH /team-requests/:id { action: "accept" | "decline" }
router.patch('/:id', requireAuth, teamWriteLimiter, controller.respond);
// DELETE /team-requests/:id — cancel a pending request/invitation.
router.delete('/:id', requireAuth, teamWriteLimiter, controller.cancel);

module.exports = router;
