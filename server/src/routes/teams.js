'use strict';

const { Router } = require('express');

const teamsController = require('../controllers/teamsController');
const requireAuth = require('../middleware/requireAuth');

const router = Router();

// Public: browse teams linked to one hackathon.
// GET /teams?hackathonId=<id>&status=open&page=1&limit=20
router.get('/', teamsController.list);

// Leader creates a team for a hackathon.
router.post('/', requireAuth, teamsController.create);

router.get('/:id', teamsController.getOne);

// Leader-only from here on (enforced in the service layer).
router.patch('/:id', requireAuth, teamsController.update);
router.delete('/:id', requireAuth, teamsController.remove);

module.exports = router;
