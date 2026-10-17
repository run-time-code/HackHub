'use strict';

const service = require('../services/notificationsService');
const { subscribeToUser } = require('../utils/eventBus');

async function list(req, res, next) {
  try {
    const result = await service.listNotifications(req.user.id, req.query);
    res.status(200).json({ success: true, data: result, requestId: req.id });
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    const notification = await service.markRead(req.user.id, req.params.id);
    res.status(200).json({ success: true, data: notification, requestId: req.id });
  } catch (err) {
    next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    const result = await service.markAllRead(req.user.id);
    res.status(200).json({ success: true, data: result, requestId: req.id });
  } catch (err) {
    next(err);
  }
}

// Server-Sent Events stream. Clients that cannot hold a stream open should
// poll GET /notifications?unreadOnly=true as the fallback.
function stream(req, res) {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  // Subscribe before announcing readiness so anything created after the
  // client sees `ready` is guaranteed to be delivered.
  const unsubscribe = subscribeToUser(req.user.id, (notification) => {
    res.write(`event: notification\ndata: ${JSON.stringify(notification)}\n\n`);
  });
  const heartbeat = setInterval(() => res.write(': keep-alive\n\n'), 25000);
  res.write(`event: ready\ndata: ${JSON.stringify({ requestId: req.id })}\n\n`);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  });
}

module.exports = { list, markRead, markAllRead, stream };
