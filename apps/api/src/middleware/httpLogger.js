'use strict';

const pinoHttp = require('pino-http');
const { stdSerializers } = require('pino-http');
const logger = require('../utils/logger');

// pino-http serializes whole request and response headers. Those carry the
// httpOnly session cookies, the CSRF token and any Authorization bearer
// value, so without redaction every request writes usable credentials to the
// log pipeline (and to anything that ships those logs off the host).
const REDACT_PATHS = [
  'req.headers.cookie',
  'req.headers.authorization',
  'req.headers["x-csrf-token"]',
  'req.query.token',
  'req.query.state',
  'res.headers["set-cookie"]',
];

// The default request serializer logs the full request URL. Verification and
// reset links put their token in the query string, so only the path is kept.
function serializeRequest(req) {
  const serialized = stdSerializers.req(req);
  serialized.url = String(serialized.url || '').split('?')[0];
  return serialized;
}

function createHttpLogger(loggerInstance = logger) {
  return pinoHttp({
    logger: loggerInstance,
    serializers: { req: serializeRequest },
    redact: {
      paths: REDACT_PATHS,
      censor: '[REDACTED]',
    },
    customProps: (req) => ({ requestId: req.id }),
  });
}

module.exports = { createHttpLogger, REDACT_PATHS };
