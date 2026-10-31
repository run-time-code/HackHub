'use strict';

const { Router } = require('express');

const teamsController = require('../controllers/teamsController');
const joinRequestsController = require('../controllers/joinRequestsController');
const { doubleCsrfProtection } = require('../../middleware/csrfMiddleware');

const requireAuth = require('../middleware/requireAuth');
const { teamWriteLimiter } = require('../../middleware/rateLimitMiddleware');

const router = Router();

// Public: browse teams linked to one hackathon.
// GET /teams?hackathonId=<id>&status=open&page=1&limit=20
router.get('/', teamsController.list);

// Must stay above GET /:id so "mine" is never parsed as a team id.
router.get('/mine', requireAuth, teamsController.listMine);

// Leader creates a team for a hackathon.
router.post('/', requireAuth, teamWriteLimiter, doubleCsrfProtection, teamsController.create);

// Join requests (any authenticated non-member) and invitations (leader).
router.post('/:id/requests', requireAuth, teamWriteLimiter, doubleCsrfProtection, joinRequestsController.sendRequest);
router.get('/:id/requests', requireAuth, joinRequestsController.listForTeam);
router.post('/:id/invitations', requireAuth, teamWriteLimiter, doubleCsrfProtection, joinRequestsController.invite);
router.get('/:id/invitations', requireAuth, joinRequestsController.listInvitations);

router.get('/:id', teamsController.getOne);

// Leader-only from here on (enforced in the service layer).
router.patch('/:id', requireAuth, teamWriteLimiter, doubleCsrfProtection, teamsController.update);
router.patch('/:id/leader', requireAuth, teamWriteLimiter, doubleCsrfProtection, teamsController.transferLeader);
// F-17: members can leave, leaders can remove; freed seat reopens a closed team.
router.delete('/:id/members/:userId', requireAuth, teamWriteLimiter, doubleCsrfProtection, teamsController.removeMember);
router.delete('/:id', requireAuth, teamWriteLimiter, doubleCsrfProtection, teamsController.remove);

module.exports = router;
