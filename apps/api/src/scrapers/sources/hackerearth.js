'use strict';

// HackerEarth publishes a compact JSON feed for its own browser extension:
//   GET https://www.hackerearth.com/chrome-extension/events/
// It contains the sponsored/featured hackathons with UTC start and end
// timestamps. The main directory page is a Next.js app without a public JSON
// API, so this feed is the reliable, low-risk source.

const { fetchJson } = require('../http');
const { cleanText, expandTags, parseDateValue, truncate } = require('../normalize');

const FEED_URL = 'https://www.hackerearth.com/chrome-extension/events/';

function externalIdFromUrl(url) {
  const match = String(url || '').match(/\/challenges\/hackathon\/([^/?#]+)/i);
  return match ? match[1] : '';
}

function mapHackathon(item) {
  if (!item || !cleanText(item.title)) return null;

  const externalId = externalIdFromUrl(item.url)
    || cleanText(item.url).replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
  if (!externalId) return null;

  const tags = expandTags([
    item.challenge_type,
    item.college ? 'College' : 'Open',
  ]);

  return {
    sourceKey: 'hackerearth',
    externalId,
    title: cleanText(item.title),
    description: truncate(cleanText(item.description), 1200),
    organizerName: cleanText(item.organizer) || 'HackerEarth',
    url: cleanText(item.url),
    imageUrl: cleanText(item.thumbnail),
    mode: 'ONLINE',
    location: 'Online',
    startDate: parseDateValue(item.start_utc_tz || item.start_tz),
    endDate: parseDateValue(item.end_utc_tz || item.end_tz),
    registrationDeadline: parseDateValue(item.end_utc_tz || item.end_tz),
    prizeAmount: null,
    prizeText: '',
    tags,
    themes: [],
    skills: [],
    isOnline: true,
    raw: {
      status: item.status || null,
      college: Boolean(item.college),
      challengeType: item.challenge_type || null,
    },
  };
}

async function fetchCandidates() {
  const payload = await fetchJson(FEED_URL);
  const items = Array.isArray(payload?.response) ? payload.response : [];
  return items.map(mapHackathon).filter(Boolean);
}

module.exports = {
  key: 'hackerearth',
  label: 'HackerEarth',
  homepage: 'https://www.hackerearth.com/challenges/hackathon/',
  enabled: () => true,
  fetchCandidates,
  mapHackathon,
};
