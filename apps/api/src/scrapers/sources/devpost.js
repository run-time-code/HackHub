'use strict';

// Devpost exposes the same JSON feed its own hackathon browser uses:
//   GET https://devpost.com/api/hackathons?status[]=open&status[]=upcoming&page=1
// It paginates 9 records at a time and needs no API key.

const { fetchJson } = require('../http');
const {
  cleanText,
  expandTags,
  normalizeMode,
  parseSubmissionPeriod,
  parsePrizeAmount,
} = require('../normalize');

const BASE_URL = 'https://devpost.com/api/hackathons';
const PER_PAGE = 9;

function eventUrl(item) {
  const url = cleanText(item.url);
  if (url) return url;
  const subdomain = cleanText(item.analytics_identifier).match(/\((\d+)\)$/)?.[1];
  return subdomain ? `https://devpost.com/hackathons/${subdomain}` : 'https://devpost.com/hackathons';
}

function mapHackathon(item) {
  if (!item || item.id == null || !cleanText(item.title)) return null;

  const themes = Array.isArray(item.themes) ? item.themes.map((theme) => theme?.name) : [];
  const tags = expandTags(themes);
  const period = parseSubmissionPeriod(item.submission_period_dates);
  const location = cleanText(item.displayed_location?.location) || 'Online';
  const prizeAmount = parsePrizeAmount(item.prize_amount);

  return {
    sourceKey: 'devpost',
    externalId: String(item.id),
    title: cleanText(item.title),
    description: [
      cleanText(item.title),
      tags.length ? `— ${tags.join(', ')}.` : '',
      item.registrations_count ? `${item.registrations_count} registered on Devpost.` : '',
    ].filter(Boolean).join(' '),
    organizerName: cleanText(item.organization_name) || 'Devpost community',
    url: eventUrl(item),
    imageUrl: cleanText(item.thumbnail_url).replace(/^\/\//, 'https://'),
    mode: /online|virtual/i.test(location) ? 'ONLINE' : 'OFFLINE',
    location,
    startDate: period.start,
    endDate: period.end,
    registrationDeadline: period.end,
    prizeAmount,
    prizeText: prizeAmount ? cleanText(item.prize_amount) : '',
    tags,
    themes,
    skills: expandTags(item.eligible_skills || []),
    isOnline: /online|virtual/i.test(location),
    raw: {
      openState: item.open_state,
      featured: Boolean(item.featured),
      registrations: item.registrations_count ?? null,
      inviteOnly: Boolean(item.invite_only),
    },
  };
}

async function fetchPage(page) {
  const payload = await fetchJson(
    `${BASE_URL}?status[]=open&status[]=upcoming&page=${page}`
  );
  return {
    items: Array.isArray(payload.hackathons) ? payload.hackathons : [],
    total: Number(payload.meta?.total_count) || 0,
  };
}

async function fetchCandidates({ maxPages = 10 } = {}) {
  const candidates = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const { items, total } = await fetchPage(page);
    candidates.push(...items.map(mapHackathon).filter(Boolean));
    if (items.length < PER_PAGE) break;
    if (total && page * PER_PAGE >= total) break;
  }

  return candidates;
}

module.exports = {
  key: 'devpost',
  label: 'Devpost',
  homepage: 'https://devpost.com/hackathons',
  enabled: () => true,
  fetchCandidates,
  mapHackathon,
  normalizeMode,
};
