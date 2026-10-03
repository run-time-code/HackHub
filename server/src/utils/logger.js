'use strict';

const pino = require('pino');
const config = require('../config');

const logger = pino({
  level: config.logLevel,
  base: { service: 'hackhub-api', env: config.env },
});

module.exports = logger;
