'use strict';

const { Router } = require('express');

const teamsController = require('../controllers/teamsController');
const joinRequestsController = require('../controllers/joinRequestsController');
const requireAuth = require('../middleware/requireAuth');

const router = Router();

// Public: browse teams linked to one hackathon.
// GET /teams?hackathonId=<id>&status=open&page=1&limit=20
router.get('/', teamsController.list);

// Leader creates a team for a hackathon.
router.post('/', requireAuth, teamsController.create);

// Join requests (any authenticated non-member) and invitations (leader).
router.post('/:id/requests', requireAuth, joinRequestsController.sendRequest);
router.get('/:id/requests', requireAuth, joinRequestsController.listForTeam);
router.post('/:id/invitations', requireAuth, joinRequestsController.invite);
router.get('/:id/invitations', requireAuth, joinRequestsController.listInvitations);

router.get('/:id', teamsController.getOne);

// Leader-only from here on (enforced in the service layer).
router.patch('/:id', requireAuth, teamsController.update);
router.patch('/:id/leader', requireAuth, teamsController.transferLeader);
router.delete('/:id', requireAuth, teamsController.remove);

module.exports = router;
