'use strict';

const { randomUUID } = require('node:crypto');

const REQUEST_ID_HEADER = 'x-request-id';

function requestId(req, res, next) {
  const id = req.headers[REQUEST_ID_HEADER] || randomUUID();
  req.id = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
}

module.exports = requestId;
module.exports.REQUEST_ID_HEADER = REQUEST_ID_HEADER;
