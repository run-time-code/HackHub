'use strict';

const logger = require('../utils/logger');

// Central error handler. Must be registered last, after all routes.
// Any controller/service can call next(err) with err.status / err.code.
function errorHandler(err, req, res, _next) {
  const status = Number(err.status || err.statusCode || 500);
  const code = status >= 500 ? 'INTERNAL_ERROR' : err.code || 'REQUEST_ERROR';

  logger.error(
    {
      requestId: req.id,
      status,
      code,
      errorType: err.name || 'Error',
    },
    'request failed'
  );

  res.status(status).json({
    success: false,
    error: {
      code,
      message: status >= 500 ? 'Something went wrong' : err.message || 'Something went wrong',
    },
    requestId: req.id,
  });
}

module.exports = errorHandler;
