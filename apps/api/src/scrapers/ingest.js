'use strict';

// Turns normalized scraper candidates into catalogue rows.
//
// Two kinds of duplicate are handled here:
//   1. Same source, same external id -> update in place (upsert on
//      { source, external_id }).
//   2. Same hackathon cross-posted on another platform -> keep one canonical
//      row and attach the other listing to `sourceRecords` instead of creating
//      a second card.
//
// Editorial fields (isHidden, isFeatured) are only written on insert so a
// nightly scrape never undoes a moderator's decision.

const Hackathon = require('../../models/Hackathon');
const {
  buildDedupeKey,
  cleanText,
  computeStatus,
  formatPrize,
  normalizeMode,
  parseDateValue,
  safeHttpUrl,
  slugify,
  truncate,
} = require('./normalize');

function listValues(values) {
  return Array.isArray(values)
    ? values.map(cleanText).filter(Boolean)
    : [];
}

function candidateToDocument(candidate, now = new Date()) {
  const title = truncate(cleanText(candidate.title), 200);
  if (!title) return null;

  const startDate = parseDateValue(candidate.startDate);
  const endDate = parseDateValue(candidate.endDate) || startDate;
  const registrationDeadline = parseDateValue(candidate.registrationDeadline) || endDate;
  const mode = normalizeMode(candidate.mode, candidate.isOnline ? 'ONLINE' : 'OFFLINE');
  const prizeAmount = Number.isFinite(candidate.prizeAmount) && candidate.prizeAmount > 0
    ? candidate.prizeAmount
    : null;
  const prizeText = cleanText(candidate.prizeText) || formatPrize(prizeAmount);
  const tags = listValues(candidate.tags);
  const themes = listValues(candidate.themes);
  const skills = listValues(candidate.skills);
  const domains = [...new Set([...tags, ...themes])];
  const externalId = cleanText(candidate.externalId);
  const stableId = `${candidate.sourceKey}-${slugify(externalId || title, 'listing').slice(0, 100)}`;

  return {
    set: {
      hackathon_id: stableId,
      slug: stableId,
      title,
      description: truncate(cleanText(candidate.description), 2000) || title,
      organizerName: cleanText(candidate.organizerName) || 'Community',
      sourceName: cleanText(candidate.sourceName) || candidate.sourceKey,
      source: candidate.sourceKey,
      externalId,
      external_id: externalId,
      url: safeHttpUrl(candidate.url),
      sourceUrl: safeHttpUrl(candidate.url),
      source_url: safeHttpUrl(candidate.url),
      imageUrl: safeHttpUrl(candidate.imageUrl),
      mode,
      location: cleanText(candidate.location) || (mode === 'ONLINE' ? 'Online' : ''),
      registrationDeadline,
      registration_deadline: registrationDeadline,
      submissionDeadline: registrationDeadline,
      submission_deadline: registrationDeadline,
      eventStartDate: startDate,
      event_start_date: startDate,
      event_start: startDate,
      eventEndDate: endDate,
      event_end_date: endDate,
      event_end: endDate,
      prize: prizeAmount,
      prize_pool: prizeText,
      tags,
      tagNames: tags,
      themes,
      domain: domains,
      domains,
      skills,
      theme: themes[0] || '',
      status: computeStatus({ startDate, endDate, registrationDeadline }, now),
      isActive: true,
      is_active: true,
      dedupeKey: buildDedupeKey(title, startDate),
      lastScrapedAt: now,
    },
    // No timestamps here: the record is merged with $addToSet, and a changing
    // timestamp would append a new duplicate entry on every run.
    sourceRecord: {
      source: candidate.sourceKey,
      externalId,
      url: safeHttpUrl(candidate.url),
    },
  };
}

async function ingestCandidates(candidates, { now = new Date(), dryRun = false } = {}) {
  const stats = { received: candidates.length, inserted: 0, updated: 0, duplicates: 0, skipped: 0 };
  if (!Array.isArray(candidates) || candidates.length === 0) return stats;

  const prepared = [];
  for (const candidate of candidates) {
    try {
      const document = candidateToDocument(candidate, now);
      if (!document) {
        stats.skipped += 1;
        continue;
      }
      prepared.push(document);
    } catch {
      stats.skipped += 1;
    }
  }

  if (prepared.length === 0) return stats;

  // Which dedupe keys already belong to a row from a *different* source?
  const owners = new Map();
  const keys = prepared.map((entry) => entry.set.dedupeKey);
  const existing = await Hackathon.find({ dedupeKey: { $in: keys } })
    .select('_id dedupeKey source')
    .lean();

  for (const row of existing) {
    if (row.source && !owners.has(row.dedupeKey)) {
      owners.set(row.dedupeKey, row);
    }
  }

  const operations = [];

  for (const { set, sourceRecord } of prepared) {
    const owner = owners.get(set.dedupeKey);

    if (owner && owner.source !== set.source) {
      stats.duplicates += 1;
      operations.push({
        updateOne: {
          filter: { _id: owner._id },
          update: {
            $addToSet: { sourceRecords: sourceRecord },
            $set: { lastScrapedAt: now },
          },
        },
      });
      continue;
    }

    operations.push({
      updateOne: {
        filter: { source: set.source, external_id: set.external_id },
        update: {
          $set: set,
          $addToSet: { sourceRecords: sourceRecord },
          $setOnInsert: {
            isHidden: false,
            is_hidden: false,
            isFeatured: false,
            is_featured: false,
            createdAt: now,
          },
        },
        upsert: true,
      },
    });
  }

  if (dryRun) {
    stats.inserted = prepared.length;
    return stats;
  }

  const result = await Hackathon.bulkWrite(operations, { ordered: false });
  stats.inserted = result.upsertedCount || 0;
  // Drivers differ on whether an upsert also counts as a match, so clamp
  // instead of subtracting and risking a negative count.
  stats.updated = Math.max(0, (result.matchedCount || 0) - stats.inserted);
  return stats;
}

/**
 * Marks rows from this source that were not seen in the latest run inactive.
 * Skipped when a run returns nothing, so a transient failure never blanks the
 * catalogue.
 */
async function deactivateMissing(sourceKey, seenExternalIds) {
  if (!sourceKey || !seenExternalIds?.length) return 0;
  const result = await Hackathon.updateMany(
    {
      source: sourceKey,
      external_id: { $nin: seenExternalIds },
      is_active: true,
    },
    { $set: { is_active: false, isActive: false } }
  );
  return result.modifiedCount || 0;
}

/** Flips events whose end date has passed to `completed`. */
async function expirePastEvents(now = new Date()) {
  const result = await Hackathon.updateMany(
    {
      lastScrapedAt: { $exists: true, $ne: null },
      event_end: { $ne: null, $lt: now },
      status: { $in: ['upcoming', 'ongoing'] },
    },
    { $set: { status: 'completed' } }
  );
  return result.modifiedCount || 0;
}

module.exports = {
  candidateToDocument,
  deactivateMissing,
  expirePastEvents,
  ingestCandidates,
};
