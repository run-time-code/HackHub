#!/usr/bin/env node
'use strict';

// Hackathon catalogue scraper.
//
//   node scripts/scrape.js                     # every enabled source
//   node scripts/scrape.js --source=devpost    # one source (repeatable)
//   node scripts/scrape.js --source=unstop --dry-run
//   node scripts/scrape.js --list              # show sources and state
//   node scripts/scrape.js --pages=3           # cap pagination per source
//
// Needs MONGODB_URI. Scheduled usage lives in
// .github/workflows/scrape-hackathons.yml and the in-process cron.

const mongoose = require('mongoose');
const config = require('../src/config');
const logger = require('../src/utils/logger');
const { listSources, runScrapers } = require('../src/scrapers');

function parseArgs(argv) {
  const options = { sources: [], dryRun: false, list: false, pages: undefined, trigger: 'cli' };

  for (const arg of argv) {
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--list') options.list = true;
    else if (arg.startsWith('--source=')) {
      options.sources.push(arg.slice('--source='.length).trim().toLowerCase());
    } else if (arg.startsWith('--pages=')) {
      const pages = Number(arg.slice('--pages='.length));
      if (!Number.isFinite(pages) || pages < 1) {
        throw new Error('--pages must be a positive number');
      }
      options.pages = Math.floor(pages);
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printSummary(summary) {
  const rows = summary.sources.map((source) => ({
    source: source.source,
    status: source.status,
    received: source.received,
    inserted: source.inserted,
    updated: source.updated,
    duplicates: source.duplicates,
    deactivated: source.deactivated ?? 0,
    ms: source.durationMs,
    failures: source.failures.length ? source.failures.join('; ') : '',
  }));

  if (rows.length === 0) {
    console.log('No sources selected.');
    return;
  }

  console.table ? console.table(rows) : console.log(rows);

  const failed = rows.filter((row) => row.status === 'failed').length;
  console.log(
    `${summary.dryRun ? 'Dry run' : 'Scrape'} finished: ${rows.length} source(s), ${failed} failed.`
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log('Usage: node scripts/scrape.js [--source=key]... [--pages=N] [--dry-run] [--list]');
    return 0;
  }

  if (options.list) {
    console.table ? console.table(listSources()) : console.log(listSources());
    return 0;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required to store scraped hackathons');
  }

  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });

  try {
    const summary = await runScrapers({
      sources: options.sources,
      dryRun: options.dryRun,
      trigger: options.trigger,
      maxPagesPerSource: options.pages,
    });

    printSummary(summary);

    return summary.sources.every((source) => source.status === 'failed') ? 1 : 0;
  } finally {
    await mongoose.disconnect();
  }
}

main()
  .then((code) => {
    process.exitCode = code || 0;
  })
  .catch((error) => {
    logger.error({ err: error }, '[scraper-cli] failed');
    console.error(`Scrape failed: ${error.message}`);
    process.exitCode = 1;
  });
