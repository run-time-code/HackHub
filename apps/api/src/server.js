'use strict';

const Sentry = require('@sentry/node');
const mongoose = require('mongoose');
const cron = require('node-cron');
const config = require('./config');
const logger = require('./utils/logger');
const createApp = require('./app');
const { purgeDeletedAccounts } = require('../utils/accountPurge');
const { processDueReminders, TIME_ZONE } = require('./services/reminderScheduler');

if (config.sentryDsn) {
  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.env,
    sendDefaultPii: false,
  });
}

let server;
let reminderJob;

// The legacy auth/profile models and the new src models share this
// connection (models register themselves on require).
async function start() {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  logger.info('MongoDB connected');
  reminderJob = cron.schedule(
    '* * * * *',
    async () => {
      try {
        await processDueReminders();
      } catch (error) {
        logger.error({ err: error }, '[reminder-dispatch] failed');
      }
    },
    { timezone: TIME_ZONE }
  );
  await processDueReminders();
  const app = createApp();
  server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.env }, 'hackhub-api listening');
  });
}

// Nightly purge of soft-deleted accounts past their retention window.
let purgeJobRunning = false;

cron.schedule(
  '0 2 * * *',
  async () => {
    if (purgeJobRunning) {
      logger.warn('[account-purge] previous run still in progress, skipping');
      return;
    }

    purgeJobRunning = true;

    try {
      const result = await purgeDeletedAccounts();
      logger.info({ result }, '[account-purge] completed');
    } catch (err) {
      logger.error({ err }, '[account-purge] failed');
    } finally {
      purgeJobRunning = false;
    }
  },
  { timezone: 'Asia/Kolkata' }
);

function shutdown(signal) {
  logger.info({ signal }, 'shutting down');
  if (reminderJob) reminderJob.stop();
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
