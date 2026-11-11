'use strict';

// Kept as a stable entry point for the original Devpost-only collector.
// The implementation now lives in the multi-source scraper framework, which
// paginates the feed, normalizes dates/prizes and merges cross-posted events.

const { parseSubmissionPeriod } = require('../scrapers/normalize');
const { runScrapers } = require('../scrapers');

async function syncDevpostHackathons() {
  const summary = await runScrapers({ sources: ['devpost'], trigger: 'manual' });
  const result = summary.sources[0] || { received: 0, inserted: 0, updated: 0, duplicates: 0 };
  return {
    imported: result.received,
    inserted: result.inserted,
    updated: result.updated,
    duplicates: result.duplicates,
    status: result.status,
  };
}

module.exports = { syncDevpostHackathons, parseSubmissionPeriod }; 
