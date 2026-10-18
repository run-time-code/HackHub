'use strict';

const { Router } = require('express');

const controller = require('../controllers/notificationsController');
const requireAuth = require('../middleware/requireAuth');

const router = Router();

router.get('/', requireAuth, controller.list);
// Instant delivery. EventSource must send the session cookie
// (`withCredentials: true` on cross-origin clients).
router.get('/stream', requireAuth, controller.stream);
// Registered before /:id/read so "read-all" is not parsed as an id.
router.patch('/read-all', requireAuth, controller.markAllRead);
router.patch('/:id/read', requireAuth, controller.markRead);

module.exports = router;
