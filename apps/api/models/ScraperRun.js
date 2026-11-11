'use strict';

const mongoose = require('mongoose');

// One row per source per scrape run, so operators can see whether the daily
// job is healthy without digging through logs.
const scraperRunSchema = new mongoose.Schema(
  {
    source: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['success', 'partial', 'failed'],
      default: 'success',
    },
    trigger: {
      type: String,
      enum: ['cron', 'cli', 'admin', 'manual'],
      default: 'manual',
    },
    startedAt: { type: Date, required: true },
    finishedAt: Date,
    durationMs: Number,
    received: { type: Number, default: 0 },
    inserted: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    duplicates: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    // Named `failures` rather than `errors`, which Mongoose reserves.
    failures: { type: [String], default: [] },
  },
  {
    collection: 'ScraperRuns',
    timestamps: true,
  }
);

scraperRunSchema.index({ startedAt: -1 });

module.exports = mongoose.models.ScraperRun
  || mongoose.model('ScraperRun', scraperRunSchema);
