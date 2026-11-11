'use strict';

// Optional discovery adapter for platforms that publish no feed and cannot be
// crawled politely (Google's own event pages, LinkedIn posts, one-off company
// hiring pages). It uses a licensed search API — SerpAPI — and is skipped
// entirely unless SERPAPI_KEY is set.
//
// This is deliberately a *discovery* source: results are marked with the
// "Search discovered" tag so operators can review them, and an event is only
// imported when its title and snippet look like a hackathon announcement.

const config = require('../../config');
const { fetchJson } = require('../http');
const { cleanText, parseDateValue, truncate } = require('../normalize');

const ENDPOINT = 'https://serpapi.com/search.json';

const DEFAULT_QUERIES = [
  'site:mlh.com hackathon season',
  'site:hack2skill.com hackathon',
  'hackathon internship hiring 2026 apply',
  'company hackathon 2026 registrations open',
];

const HACKATHON_PATTERN = /hackathon|hack ?day|codefest|buildathon|datathon|ideathon|innovation challenge/i;

function queries() {
  return config.scrapers.searchQueries.length
    ? config.scrapers.searchQueries
    : DEFAULT_QUERIES;
}

function mapResult(result, query) {
  const title = cleanText(result.title);
  const url = cleanText(result.link);
  const snippet = truncate(cleanText(result.snippet), 600);
  if (!title || !url) return null;
  if (!HACKATHON_PATTERN.test(`${title} ${snippet}`)) return null;

  // Google results rarely carry a machine-readable date. We take the first
  // parseable date out of the snippet and otherwise import the event undated.
  const dateMatch = snippet.match(
    /(\d{1,2}\s+[A-Za-z]{3,9},?\s+\d{4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2})/
  );
  const startDate = dateMatch ? parseDateValue(dateMatch[1]) : null;

  return {
    sourceKey: 'google',
    externalId: url.replace(/[?#].*$/, ''),
    title,
    description: snippet || title,
    organizerName: cleanText(result.source) || new URL(url).hostname.replace(/^www\./, ''),
    url,
    imageUrl: '',
    mode: 'ONLINE',
    location: 'Online',
    startDate,
    endDate: startDate,
    registrationDeadline: startDate,
    prizeAmount: null,
    prizeText: '',
    tags: ['Search discovered'],
    themes: [],
    skills: [],
    isOnline: true,
    raw: { query, position: result.position ?? null },
  };
}

async function fetchCandidates() {
  if (!config.scrapers.serpApiKey) return [];

  const candidates = [];

  for (const query of queries()) {
    const params = new URLSearchParams({
      engine: 'google',
      q: query,
      num: '20',
      api_key: config.scrapers.serpApiKey,
    });

    const payload = await fetchJson(`${ENDPOINT}?${params.toString()}`);
    const results = Array.isArray(payload.organic_results) ? payload.organic_results : [];
    candidates.push(...results.map((result) => mapResult(result, query)).filter(Boolean));
  }

  return candidates;
}

module.exports = {
  key: 'google',
  label: 'Google / web search',
  homepage: 'https://serpapi.com/',
  enabled: () => Boolean(config.scrapers.serpApiKey),
  fetchCandidates,
  mapResult,
};
