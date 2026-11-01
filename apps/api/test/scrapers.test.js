'use strict';

// Scraper tests: parser unit tests with captured fixtures (no network) plus
// ingest/dedupe behaviour against an in-memory MongoDB.

process.env.LOG_LEVEL = 'fatal';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Hackathon = require('../models/Hackathon');
const {
  buildDedupeKey,
  computeStatus,
  parsePrizeAmount,
  parseSubmissionPeriod,
} = require('../src/scrapers/normalize');
const devpost = require('../src/scrapers/sources/devpost');
const devfolio = require('../src/scrapers/sources/devfolio');
const unstop = require('../src/scrapers/sources/unstop');
const hackerearth = require('../src/scrapers/sources/hackerearth');
const {
  candidateToDocument,
  deactivateMissing,
  expirePastEvents,
  ingestCandidates,
} = require('../src/scrapers/ingest');

const DEVPOST_ITEM = {
  id: 31302,
  title: 'PayPal AI Hackathon',
  displayed_location: { icon: 'globe', location: 'Online' },
  open_state: 'open',
  thumbnail_url: '//d112y698adiu2z.cloudfront.net/photos/production/thumb.png',
  url: 'https://paypalaihackathon.devpost.com/',
  submission_period_dates: 'Oct 01 - Nov 12, 2026',
  themes: [{ id: 17, name: 'Low/No Code' }, { id: 6, name: 'Machine Learning/AI' }],
  prize_amount: '$<span data-currency-value>67,500</span>',
  registrations_count: 25692,
  organization_name: 'PayPal',
  featured: false,
  invite_only: false,
};

const DEVFOLIO_ITEM = {
  uuid: 'd957bc2099f945e99edfae0c2972bed9',
  name: 'DevNexus 2.0',
  slug: 'devnexus2',
  starts_at: '2026-11-27T18:30:00.000Z',
  ends_at: '2026-11-28T18:30:00.000Z',
  city: 'Kolkata',
  state: 'West Bengal',
  country: 'India',
  location: 'Government College of Engineering, Kolkata',
  is_online: false,
  hackathon_setting: {
    subdomain: 'devnexus2',
    reg_ends_at: '2026-11-01T18:30:00.000Z',
  },
  themes: [{ name: 'No Restrictions' }],
};

const UNSTOP_ITEM = {
  id: 1786387,
  public_url: 'hackathons/code-shift-2026-infotechiezz-1786387',
  title: 'CODE SHIFT 2026',
  region: 'online',
  subtype: 'online_coding_challenge',
  regn_open: 1,
  status: 'LIVE',
  details: '<p><strong>CODE SHIFT 2026</strong> is an online coding competition.</p>',
  organisation: { name: 'InfoTechiezz' },
  seo_url: 'https://unstop.com/hackathons/code-shift-2026-infotechiezz-1786387',
  logoUrl2: '',
  start_date: '2026-10-30T00:00:00+05:30',
  end_date: '2026-11-08T23:00:00+05:30',
  prizes: [{ cash: 20000, rank: 'Winner' }, { cash: 12000, rank: '1st Runner Up' }],
  required_skills: [{ skill_name: 'React' }, { skill_name: 'Node.js' }],
  filters: [{ name: 'All' }],
  actively_hiring: true,
  viewsCount: 900,
  registerCount: 120,
};

const HACKEREARTH_ITEM = {
  title: 'IBM Z Day',
  description: 'Hacking is building things that you always wanted to have.',
  url: 'https://www.hackerearth.com/challenges/hackathon/ibm-z-day/',
  status: 'ONGOING',
  college: false,
  challenge_type: 'Monthly Challenges',
  thumbnail: 'https://media.hackerearth.com/media/hackathon/ibm-z-day/images/thumb.jpg',
  start_utc_tz: '2026-10-30 04:30:00+00:00',
  end_utc_tz: '2026-11-18 18:29:00+00:00',
};

describe('scraper parsers', () => {
  it('parses Devpost submission periods, including year rollover', () => {
    const sameYear = parseSubmissionPeriod('Oct 01 - Nov 12, 2026');
    assert.equal(sameYear.start.toISOString(), '2026-10-01T00:00:00.000Z');
    assert.equal(sameYear.end.toISOString(), '2026-11-12T00:00:00.000Z');

    const rollover = parseSubmissionPeriod('Dec 20, 2026 - Jan 05, 2027');
    assert.equal(rollover.start.toISOString(), '2026-12-20T00:00:00.000Z');
    assert.equal(rollover.end.toISOString(), '2027-01-05T00:00:00.000Z');

    assert.deepEqual(parseSubmissionPeriod(''), { start: null, end: null });
  });

  it('extracts numeric prizes from decorated strings', () => {
    assert.equal(parsePrizeAmount('$<span data-currency-value>67,500</span>'), 67500);
    assert.equal(parsePrizeAmount('₹1,00,000'), 100000);
    assert.equal(parsePrizeAmount('TBD'), null);
    assert.equal(parsePrizeAmount(''), null);
  });

  it('builds a stable dedupe key per title and start month', () => {
    const a = buildDedupeKey('PayPal AI Hackathon', new Date('2026-11-12T00:00:00Z'));
    const b = buildDedupeKey('paypal ai hackathon!', new Date('2026-11-01T00:00:00Z'));
    const differentMonth = buildDedupeKey('PayPal AI Hackathon', new Date('2026-12-02T00:00:00Z'));

    assert.equal(a, b);
    assert.notEqual(a, differentMonth);
    assert.equal(a, 'paypal-ai-hackathon|2026-11');
  });

  it('derives upcoming/ongoing/completed from dates', () => {
    const now = new Date('2026-11-01T00:00:00Z');
    assert.equal(computeStatus({ startDate: '2026-11-05', endDate: '2026-11-07' }, now), 'upcoming');
    assert.equal(computeStatus({ startDate: '2026-10-30', endDate: '2026-11-07' }, now), 'ongoing');
    assert.equal(computeStatus({ startDate: '2026-10-01', endDate: '2026-10-20' }, now), 'completed');
  });
});

describe('source adapters map fixture payloads', () => {
  it('maps a Devpost listing', () => {
    const candidate = devpost.mapHackathon(DEVPOST_ITEM);

    assert.equal(candidate.sourceKey, 'devpost');
    assert.equal(candidate.externalId, '31302');
    assert.equal(candidate.mode, 'ONLINE');
    assert.equal(candidate.organizerName, 'PayPal');
    assert.equal(candidate.url, 'https://paypalaihackathon.devpost.com/');
    assert.equal(candidate.prizeAmount, 67500);
    assert.equal(candidate.startDate.toISOString(), '2026-10-01T00:00:00.000Z');
    assert.ok(candidate.tags.includes('Machine Learning/AI'));
    assert.match(candidate.imageUrl, /^https:\/\//);
  });

  it('maps a Devfolio listing', () => {
    const candidate = devfolio.mapHackathon(DEVFOLIO_ITEM);

    assert.equal(candidate.mode, 'OFFLINE');
    assert.equal(candidate.url, 'https://devnexus2.devfolio.co/');
    assert.equal(candidate.location, 'Kolkata, West Bengal, India');
    assert.equal(candidate.registrationDeadline.toISOString(), '2026-11-01T18:30:00.000Z');
  });

  it('maps an Unstop listing with summed prize and hiring flag', () => {
    const candidate = unstop.mapHackathon(UNSTOP_ITEM);

    assert.equal(candidate.prizeAmount, 32000);
    assert.equal(candidate.organizerName, 'InfoTechiezz');
    assert.ok(candidate.tags.includes('Hiring'));
    assert.deepEqual(candidate.skills, ['React', 'Node.js']);
    assert.equal(candidate.description, 'CODE SHIFT 2026 is an online coding competition.');
    assert.equal(candidate.raw.registrationOpen, true);
  });

  it('maps a HackerEarth listing from UTC timestamps', () => {
    const candidate = hackerearth.mapHackathon(HACKEREARTH_ITEM);

    assert.equal(candidate.externalId, 'ibm-z-day');
    assert.equal(candidate.startDate.toISOString(), '2026-10-30T04:30:00.000Z');
    assert.equal(candidate.endDate.toISOString(), '2026-11-18T18:29:00.000Z');
    assert.ok(candidate.tags.includes('Monthly Challenges'));
  });

  it('rejects listings without a title', () => {
    assert.equal(devpost.mapHackathon({ id: 1 }), null);
    assert.equal(unstop.mapHackathon({ id: 2, title: '   ' }), null);
    assert.equal(hackerearth.mapHackathon({ title: '' }), null);
  });
});

describe('candidate mapping', () => {
  it('produces both catalogue field styles and a status', () => {
    const candidate = {
      ...devpost.mapHackathon(DEVPOST_ITEM),
      sourceName: 'Devpost',
    };
    const { set } = candidateToDocument(candidate, new Date('2026-10-15T00:00:00Z'));

    assert.equal(set.hackathon_id, 'devpost-31302');
    assert.equal(set.slug, set.hackathon_id);
    assert.equal(set.source, 'devpost');
    assert.equal(set.sourceName, 'Devpost');
    assert.equal(set.registration_deadline.toISOString(), '2026-11-12T00:00:00.000Z');
    assert.equal(set.event_end.toISOString(), '2026-11-12T00:00:00.000Z');
    assert.equal(set.status, 'ongoing');
    assert.deepEqual(set.domains, set.domain);
    assert.equal(set.dedupeKey, 'paypal-ai-hackathon|2026-10');
  });
});

describe('ingest', () => {
  let mongo;

  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  after(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  beforeEach(async () => {
    await Hackathon.deleteMany({});
  });

  function devpostCandidate(overrides = {}) {
    return {
      ...devpost.mapHackathon(DEVPOST_ITEM),
      sourceName: 'Devpost',
      ...overrides,
    };
  }

  it('inserts a listing, then updates it in place on the next run', async () => {
    const first = await ingestCandidates([devpostCandidate()]);
    assert.equal(first.inserted, 1);
    assert.equal(first.updated, 0);

    const second = await ingestCandidates([devpostCandidate({ title: 'PayPal AI Hackathon 2026' })]);
    assert.equal(second.inserted, 0);
    assert.equal(second.updated, 1);

    const rows = await Hackathon.find({});
    assert.equal(rows.length, 1);
    assert.equal(rows[0].title, 'PayPal AI Hackathon 2026');
    assert.equal(rows[0].sourceRecords.length, 1);
  });

  it('merges cross-posted events instead of duplicating them', async () => {
    await ingestCandidates([devpostCandidate()]);

    const unstopTwin = {
      ...unstop.mapHackathon({
        ...UNSTOP_ITEM,
        title: 'PayPal AI Hackathon',
        start_date: '2026-10-05T00:00:00+05:30',
        end_date: '2026-10-20T00:00:00+05:30',
      }),
      sourceName: 'Unstop',
    };

    const result = await ingestCandidates([unstopTwin]);
    assert.equal(result.inserted, 0);
    assert.equal(result.duplicates, 1);

    const rows = await Hackathon.find({});
    assert.equal(rows.length, 1);
    assert.equal(rows[0].source, 'devpost');
    assert.deepEqual(
      rows[0].sourceRecords.map((record) => record.source).sort(),
      ['devpost', 'unstop']
    );
  });

  it('keeps moderator hiding across re-scrapes', async () => {
    await ingestCandidates([devpostCandidate()]);
    await Hackathon.updateOne({}, { $set: { isHidden: true, is_hidden: true } });

    await ingestCandidates([devpostCandidate()]);

    const row = await Hackathon.findOne({});
    assert.equal(row.isHidden, true);
  });

  it('skips malformed candidates and supports dry runs', async () => {
    const result = await ingestCandidates(
      [{ sourceKey: 'devpost', title: '', externalId: 'x' }, devpostCandidate()],
      { dryRun: true }
    );

    assert.equal(result.skipped, 1);
    assert.equal(result.inserted, 1);
    assert.equal(await Hackathon.countDocuments({}), 0);
  });

  it('deactivates rows a source no longer returns, and expires past events', async () => {
    await ingestCandidates([devpostCandidate()]);

    assert.equal(await deactivateMissing('devpost', ['31302']), 0);
    assert.equal(await deactivateMissing('devpost', ['other-id']), 1);
    assert.equal((await Hackathon.findOne({})).is_active, false);

    await Hackathon.updateOne(
      {},
      { $set: { status: 'ongoing', event_end: new Date('2020-01-01T00:00:00Z') } }
    );
    assert.equal(await expirePastEvents(new Date('2026-01-01T00:00:00Z')), 1);
    assert.equal((await Hackathon.findOne({})).status, 'completed');
  });
});
