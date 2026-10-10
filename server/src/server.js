'use strict';

const Sentry = require('@sentry/node');
const mongoose = require('mongoose');
const config = require('./config');
const logger = require('./utils/logger');
const createApp = require('./app');

if (config.sentryDsn) {
  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.env,
    sendDefaultPii: false,
  });
}

let server;

async function start() {
  await mongoose.connect(config.mongoUri);
  const app = createApp();
  server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.env }, 'hackhub-api listening');
  });
}

function shutdown(signal) {
  logger.info({ signal }, 'shutting down');
  if (!server) {
    mongoose.disconnect().finally(() => process.exit());
    return;
  }
  server.close((err) => {
    mongoose.disconnect().finally(() => {
      if (err) {
        logger.error({ err }, 'error during shutdown');
        process.exitCode = 1;
      }
      process.exit();
    });
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'unhandled rejection');
});

start().catch((err) => {
  logger.fatal({ err }, 'failed to start hackhub-api');
  process.exit(1);
});
