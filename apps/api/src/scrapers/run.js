'use strict';

// Orchestrates a scrape across every enabled source.
//
// Each source is isolated: a platform changing its markup records a failed
// ScraperRun row and the remaining sources still run. Concurrency is guarded
// by a module-level flag so a cron tick and an admin trigger cannot overlap.

const config = require('../config');
const logger = require('../utils/logger');
const { withJobLock } = require('../utils/jobLock');
const ScraperRun = require('../../models/ScraperRun');
const { resolveSources } = require('./sources');
const { deactivateMissing, expirePastEvents, ingestCandidates } = require('./ingest');

let running = false;
// Long enough for the slowest full sweep; the lock is released on completion
// and expires automatically if the holder dies mid-run.
const SCRAPER_LOCK_TTL_MS = 30 * 60 * 1000;

function isRunning() {
  return running;
}

async function runSource(adapter, options) {
  const startedAt = new Date();
  const base = {
    source: adapter.key,
    trigger: options.trigger,
    startedAt,
    received: 0,
    inserted: 0,
    updated: 0,
    duplicates: 0,
    skipped: 0,
    failures: [],
  };

  try {
    const candidates = await adapter.fetchCandidates({
      maxPages: options.maxPagesPerSource,
    });

    const withLabels = candidates.map((candidate) => ({
      ...candidate,
      sourceName: adapter.label,
    }));

    const stats = await ingestCandidates(withLabels, {
      now: startedAt,
      dryRun: options.dryRun,
    });

    const deactivated = options.dryRun
      ? 0
      : await deactivateMissing(
        adapter.key,
        withLabels.map((candidate) => String(candidate.externalId || '')).filter(Boolean)
      );

    const summary = {
      ...base,
      ...stats,
      deactivated,
      status: 'success',
      finishedAt: new Date(),
    };
    summary.durationMs = summary.finishedAt - startedAt;

    logger.info(
      {
        source: adapter.key,
        received: summary.received,
        inserted: summary.inserted,
        updated: summary.updated,
        duplicates: summary.duplicates,
        deactivated,
        durationMs: summary.durationMs,
      },
      '[scraper] source finished'
    );

    if (!options.dryRun) {
      await ScraperRun.create(summary);
    }

    return summary;
  } catch (error) {
    const finishedAt = new Date();
    const summary = {
      ...base,
      status: 'failed',
      finishedAt,
      durationMs: finishedAt - startedAt,
      failures: [error.message || String(error)],
    };

    logger.error({ err: error, source: adapter.key }, '[scraper] source failed');

    if (!options.dryRun) {
      await ScraperRun.create(summary).catch((writeError) => {
        logger.error({ err: writeError }, '[scraper] could not record run');
      });
    }

    return summary;
  }
}

async function runScrapers({
  sources = [],
  dryRun = false,
  trigger = 'manual',
  maxPagesPerSource,
} = {}) {
  if (running) {
    throw new Error('A scrape is already running');
  }

  const adapters = resolveSources({ sources });
  if (adapters.length === 0) {
    return { dryRun, trigger, startedAt: new Date(), finishedAt: new Date(), sources: [] };
  }

  running = true;
  const startedAt = new Date();

  try {
    // A module-level flag only protects this process. Across several API
    // instances the database lock is what stops concurrent sweeps from
    // hammering the same sources and fighting over the same rows.
    const lock = await withJobLock('scraper-run', SCRAPER_LOCK_TTL_MS, async () => {
      const results = [];
      for (const adapter of adapters) {
        results.push(
          await runSource(adapter, {
            dryRun,
            trigger,
            maxPagesPerSource: maxPagesPerSource || config.scrapers.maxPagesPerSource,
          })
        );
      }

      if (!dryRun) {
        await expirePastEvents(new Date()).catch((error) => {
          logger.error({ err: error }, '[scraper] could not expire past events');
        });
      }

      return results;
    });

    if (!lock.acquired) {
      throw new Error('A scrape is already running');
    }

    return {
      dryRun,
      trigger,
      startedAt,
      finishedAt: new Date(),
      sources: lock.value,
    };
  } finally {
    running = false;
  }
}

async function recentRuns({ limit = 20 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  return ScraperRun.find({}).sort({ startedAt: -1 }).limit(safeLimit).lean();
}

module.exports = { isRunning, recentRuns, runScrapers };
