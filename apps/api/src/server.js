'use strict';

const Sentry = require('@sentry/node');
const mongoose = require('mongoose');
const cron = require('node-cron');
const config = require('./config');
const logger = require('./utils/logger');
const { withJobLock } = require('./utils/jobLock');
const createApp = require('./app');
const { purgeDeletedAccounts } = require('../utils/accountPurge');
const { processDueReminders, TIME_ZONE } = require('./services/reminderScheduler');
const { startScraperScheduler, stopScraperScheduler } = require('./scrapers');

if (config.sentryDsn) {
  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.env,
    sendDefaultPii: false,
  });
}

let server;
let reminderJob;
let purgeJob;
let purgeJobRunning = false;

// Reminder/purge/scraper work is process-wide but not request work. Every
// instance may run it (the locks make it safe) or the deployment can set
// RUN_BACKGROUND_JOBS=false on web instances and keep one worker.
function startBackgroundJobs() {
  if (!config.runBackgroundJobs) {
    logger.info('[background-jobs] disabled on this instance');
    return;
  }

  const runReminderSweep = async () => {
    try {
      const lock = await withJobLock('reminder-dispatch', 55_000, () =>
        processDueReminders()
      );

      if (!lock.acquired) {
        logger.debug('[reminder-dispatch] another instance is running the sweep');
      }
    } catch (error) {
      logger.error({ err: error }, '[reminder-dispatch] failed');
    }
  };

  reminderJob = cron.schedule('* * * * *', runReminderSweep, {
    timezone: TIME_ZONE,
  });

  runReminderSweep();

  purgeJob = cron.schedule(
    '0 2 * * *',
    async () => {
      if (purgeJobRunning) {
        logger.warn('[account-purge] previous run still in progress, skipping');
        return;
      }

      purgeJobRunning = true;

      try {
        const lock = await withJobLock('account-purge', 10 * 60 * 1000, () =>
          purgeDeletedAccounts()
        );

        if (lock.acquired) {
          logger.info({ result: lock.value }, '[account-purge] completed');
        } else {
          logger.debug('[account-purge] another instance is running the purge');
        }
      } catch (err) {
        logger.error({ err }, '[account-purge] failed');
      } finally {
        purgeJobRunning = false;
      }
    },
    { timezone: 'Asia/Kolkata' }
  );

  startScraperScheduler();
}

// The legacy auth/profile models and the new src models share this
// connection (models register themselves on require).
async function start() {
  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: config.mongoMaxPoolSize,
    minPoolSize: config.mongoMinPoolSize,
  });
  logger.info(
    { maxPoolSize: config.mongoMaxPoolSize },
    'MongoDB connected'
  );

  startBackgroundJobs();

  const app = createApp();
  server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.env }, 'hackhub-api listening');
  });
}

function shutdown(signal) {
  logger.info({ signal }, 'shutting down');
  if (reminderJob) reminderJob.stop();
  if (purgeJob) purgeJob.stop();
  stopScraperScheduler();
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
