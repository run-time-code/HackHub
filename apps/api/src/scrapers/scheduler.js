'use strict';

const cron = require('node-cron');
const config = require('../config');
const logger = require('../utils/logger');
const { isRunning, runScrapers } = require('./run');

let task;

/**
 * Registers the daily catalogue refresh. Opt-in via SCRAPER_ENABLED=true so
 * development servers and read-only deployments never call third-party sites.
 * On hosts that sleep (free tiers) use the GitHub Actions workflow instead —
 * it runs the same CLI against the same database.
 */
function startScraperScheduler() {
  if (!config.scrapers.enabled) {
    logger.info('[scraper] disabled (set SCRAPER_ENABLED=true to enable the daily job)');
    return null;
  }

  if (task) return task;

  task = cron.schedule(
    config.scrapers.cron,
    async () => {
      if (isRunning()) {
        logger.warn('[scraper] previous run still in progress, skipping this tick');
        return;
      }

      try {
        const summary = await runScrapers({ trigger: 'cron' });
        logger.info(
          {
            sources: summary.sources.length,
            inserted: summary.sources.reduce((sum, source) => sum + source.inserted, 0),
            updated: summary.sources.reduce((sum, source) => sum + source.updated, 0),
            failed: summary.sources.filter((source) => source.status === 'failed').length,
          },
          '[scraper] scheduled run finished'
        );
      } catch (error) {
        logger.error({ err: error }, '[scraper] scheduled run failed');
      }
    },
    { timezone: config.scrapers.timezone }
  );

  logger.info(
    { cron: config.scrapers.cron, timezone: config.scrapers.timezone },
    '[scraper] daily schedule enabled'
  );

  return task;
}

function stopScraperScheduler() {
  if (task) {
    task.stop();
    task = undefined;
  }
}

module.exports = { startScraperScheduler, stopScraperScheduler };
