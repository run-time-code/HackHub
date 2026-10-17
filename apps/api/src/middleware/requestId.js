'use strict';

const { randomUUID } = require('node:crypto');

const REQUEST_ID_HEADER = 'x-request-id';
// Only accept client ids that are safe to echo into logs/headers.
const REQUEST_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

function requestId(req, res, next) {
  const candidate = req.headers[REQUEST_ID_HEADER];
  const id = typeof candidate === 'string' && REQUEST_ID_RE.test(candidate) ? candidate : randomUUID();
  req.id = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
}

module.exports = requestId;
module.exports.REQUEST_ID_HEADER = REQUEST_ID_HEADER;
