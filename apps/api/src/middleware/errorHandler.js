'use strict';

const config = require('../config');
const logger = require('../utils/logger');

// Central error handler. Must be registered last, after all routes.
// Any controller/service can call next(err) with err.status / err.code.
 // eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const status = Number(err.status || err.statusCode || 500);
  const code = err.code || (status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR');

  logger.error({ err, requestId: req.id, status, code }, 'request failed');

  res.status(status).json({
    success: false,
    error: {
      code,
      message: status === 500 && !config.isDev ? 'Something went wrong' : err.message || 'Something went wrong',
      ...(config.isDev && err.stack ? { stack: err.stack } : {}),
    },
    requestId: req.id,
  });
}

module.exports = errorHandler;
