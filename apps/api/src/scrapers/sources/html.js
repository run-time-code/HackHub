'use strict';

// Configurable HTML adapter.
//
// Platforms that do not expose a public JSON feed can still be aggregated by
// describing the page in `scrapers/sources/htmlSources.json`:
//
//   {
//     "key": "acme-careers",
//     "label": "Acme Careers",
//     "enabled": true,
//     "url": "https://acme.example/hackathons",
//     "itemSelector": ".hackathon-card",
//     "fields": {
//       "title": "h3",
//       "url": "a@href",
//       "startDate": "time@datetime",
//       "location": ".location",
//       "organizer": ".organizer",
//       "prize": ".prize"
//     }
//   }
//
// Values ending in `@attr` read an attribute instead of the element text.
// No selectors ship enabled by default: a source is only ever scraped once an
// operator has checked the markup and confirmed the site permits it.

const { fetchText } = require('../http');
const { buildDedupeKey, cleanText, normalizeMode, parseDateValue, parsePrizeAmount } = require('../normalize');

function readField($, scope, expression) {
  if (!expression) return '';
  const [selector, attribute] = String(expression).split('@');
  const element = selector ? scope.find(selector).first() : scope;
  if (!element || element.length === 0) return '';
  if (attribute) return cleanText(element.attr(attribute));
  return cleanText(element.text());
}

function buildCandidate(source, $, element) {
  const fields = source.fields || {};
  const scope = $(element);
  const title = readField($, scope, fields.title);
  if (!title) return null;

  const href = readField($, scope, fields.url || 'a@href') || source.url;
  let url = href;
  if (url && !/^https?:\/\//i.test(url) && source.baseUrl) {
    url = new URL(url, source.baseUrl).toString();
  }

  const startDate = parseDateValue(readField($, scope, fields.startDate));
  const endDate = parseDateValue(readField($, scope, fields.endDate)) || startDate;
  const location = readField($, scope, fields.location);
  const prizeAmount = parsePrizeAmount(readField($, scope, fields.prize));

  return {
    sourceKey: source.key,
    externalId: readField($, scope, fields.externalId)
      || url
      || buildDedupeKey(title, startDate),
    title,
    description: readField($, scope, fields.description) || title,
    organizerName: readField($, scope, fields.organizer) || source.label,
    url,
    imageUrl: readField($, scope, fields.image || 'img@src'),
    mode: normalizeMode(readField($, scope, fields.mode) || location, 'OFFLINE'),
    location,
    startDate,
    endDate,
    registrationDeadline: parseDateValue(readField($, scope, fields.deadline)) || endDate,
    prizeAmount,
    prizeText: prizeAmount ? readField($, scope, fields.prize) : '',
    tags: source.tags || [],
    themes: [],
    skills: [],
    isOnline: /online|virtual/i.test(location),
    raw: {},
  };
}

async function loadCheerio() {
  // Lazy require keeps cheerio out of the API startup path.
  const cheerio = require('cheerio');
  return cheerio.load ? cheerio : { load: cheerio.load };
}

async function fetchCandidatesFor(source) {
  const html = await fetchText(source.url);
  const { load } = await loadCheerio();
  const $ = load(html);
  const candidates = [];

  $(source.itemSelector).each((_, element) => {
    try {
      const candidate = buildCandidate(source, $, element);
      if (candidate) candidates.push(candidate);
    } catch {
      // A single malformed card should not fail the whole source.
    }
  });

  return candidates;
}

function createHtmlSource(source) {
  return {
    key: source.key,
    label: source.label,
    homepage: source.url,
    enabled: () => source.enabled !== false,
    fetchCandidates: () => fetchCandidatesFor(source),
  };
}

module.exports = { createHtmlSource };
