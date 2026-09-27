'use strict';

function notFound(req, res, _next) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
    requestId: req.id,
  });
}

module.exports = notFound;
