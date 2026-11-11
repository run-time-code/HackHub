'use strict';

// Shared normalizers for every scraper source. Keeping date/prize/text parsing
// in one place means a new adapter only has to map raw fields onto the
// "candidate" shape and stays consistent with the catalogue schema.

const MONTHS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

const HTML_ENTITIES = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&apos;': "'",
  '&lt;': '<',
  '&gt;': '>',
  '&hellip;': '…',
  '&mdash;': '—',
  '&ndash;': '–',
};

function stripHtml(value) {
  return String(value == null ? '' : value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, (entity) => HTML_ENTITIES[entity.toLowerCase()] ?? ' ')
    .replace(/\u00a0/g, ' ');
}

function cleanText(value) {
  return stripHtml(value).replace(/\s+/g, ' ').trim();
}

function truncate(value, max) {
  const text = String(value || '').trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function slugify(value, fallback = 'hackathon') {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

function monthIndex(name) {
  const index = MONTHS.indexOf(String(name || '').toLowerCase().slice(0, 3));
  return index >= 0 ? index : -1;
}

function utcDate(monthName, day, year) {
  const month = monthIndex(monthName);
  const dayNumber = Number(day);
  const yearNumber = Number(year);
  if (month < 0 || !Number.isFinite(dayNumber) || !Number.isFinite(yearNumber)) {
    return null;
  }
  const value = new Date(Date.UTC(yearNumber, month, dayNumber));
  return Number.isNaN(value.getTime()) ? null : value;
}

/**
 * Devpost publishes a human string such as "Oct 01 - Nov 12, 2026" or
 * "Dec 20, 2026 - Jan 05, 2027". Returns UTC dates for both ends.
 */
function parseSubmissionPeriod(value) {
  const normalized = cleanText(value);
  if (!normalized) return { start: null, end: null };

  const parts = normalized.split(/\s+[-–]\s+/);
  if (parts.length !== 2) return { start: null, end: null };

  const endMatch = parts[1].match(/([A-Za-z]{3,})\s+(\d{1,2})(?:,\s*(\d{4}))?/);
  const startMatch = parts[0].match(/([A-Za-z]{3,})\s+(\d{1,2})(?:,\s*(\d{4}))?/);
  const year = endMatch?.[3] || startMatch?.[3];
  if (!year) return { start: null, end: null };

  return {
    start: startMatch ? utcDate(startMatch[1], startMatch[2], startMatch[3] || year) : null,
    end: endMatch ? utcDate(endMatch[1], endMatch[2], endMatch[3] || year) : null,
  };
}

/**
 * Accepts Date objects, ISO strings, "YYYY-MM-DD HH:mm:ss+HH:mm" and
 * "Oct 30, 2026" style values. Returns a Date or null — never throws.
 */
function parseDateValue(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const fromNumber = new Date(value);
    return Number.isNaN(fromNumber.getTime()) ? null : fromNumber;
  }

  const text = cleanText(value);
  if (!text) return null;

  const isoLike = text.includes('T') ? text : text.replace(/^(\d{4}-\d{2}-\d{2})\s+/, '$1T');
  const direct = new Date(isoLike);
  if (!Number.isNaN(direct.getTime())) return direct;

  const named = text.match(/([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{4})/);
  if (named) {
    return utcDate(named[1], named[2], named[3]);
  }

  const dayFirst = text.match(/(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/);
  if (dayFirst) {
    return utcDate(dayFirst[2], dayFirst[1], dayFirst[3]);
  }

  return null;
}

/**
 * Extracts a numeric grand prize from strings like
 * "$<span>67,500</span>", "₹1,00,000", "USD 25,000" or "TBD".
 */
function parsePrizeAmount(value) {
  const text = cleanText(value);
  if (!text) return null;

  const match = text.match(/(\d[\d,.\s]*\d|\d)/);
  if (!match) return null;

  const digits = match[1].replace(/\s/g, '');
  const numeric = Number(digits.replace(/,/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;

  // "$1.5M" / "1.5 million" style values.
  if (/m(illion)?\b/i.test(text) && numeric < 1000) return Math.round(numeric * 1_000_000);
  if (/k\b/i.test(text) && numeric < 1000) return Math.round(numeric * 1000);
  return numeric;
}

function formatPrize(value) {
  if (!Number.isFinite(value) || value <= 0) return '';
  return `$${value.toLocaleString('en-US')}`;
}

// External listings are untrusted input. Only http(s) URLs may be stored so
// a malicious or malformed scrape cannot persist javascript:/data: values
// that later break (or, outside React's URL sanitisation, execute in) another
// consumer such as the calendar export.
function safeHttpUrl(value) {
  const text = cleanText(value);
  if (!text) return '';

  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function normalizeMode(value, fallback = 'ONLINE') {
  const text = cleanText(value).toUpperCase();
  if (/HYBRID|BOTH/.test(text)) return 'HYBRID';
  if (/OFFLINE|IN-PERSON|ONSITE|PHYSICAL/.test(text)) return 'OFFLINE';
  if (/ONLINE|VIRTUAL|REMOTE/.test(text)) return 'ONLINE';
  return fallback;
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Dedupe key shared by every source: the title plus the month the event
 * starts in. Cross-posting the same hackathon on Unstop and Devpost therefore
 * collapses into one catalogue row, while annual repeats stay distinct.
 */
function buildDedupeKey(title, startDate) {
  const slug = slugify(truncate(title, 120));
  const start = parseDateValue(startDate);
  const period = start
    ? `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`
    : 'undated';
  return `${slug}|${period}`;
}

function computeStatus({ startDate, endDate, registrationDeadline } = {}, now = new Date()) {
  const start = parseDateValue(startDate);
  const end = parseDateValue(endDate) || start;
  const deadline = parseDateValue(registrationDeadline);

  if (end && end < now) return 'completed';
  if (start && start <= now && (!end || end >= now)) return 'ongoing';
  if (start && start > now) return 'upcoming';
  if (deadline && deadline < now && !end) return 'completed';
  return 'upcoming';
}

function uniqueStrings(values, { max = 12, transform } = {}) {
  const seen = new Set();
  const out = [];
  for (const value of values || []) {
    const text = cleanText(Array.isArray(value) ? value[0] : value);
    if (!text) continue;
    const final = transform ? transform(text) : text;
    const key = final.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(final);
    if (out.length >= max) break;
  }
  return out;
}

/** Turns ["Machine Learning/AI", "Web"] into distinct search-friendly tags. */
function expandTags(values) {
  const split = [];
  for (const value of values || []) {
    if (!value) continue;
    split.push(String(value));
    String(value)
      .split(/[/,&]|\band\b/i)
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => split.push(part));
  }
  return uniqueStrings(split, { max: 10 });
}

module.exports = {
  buildDedupeKey,
  cleanText,
  computeStatus,
  expandTags,
  formatPrize,
  normalizeMode,
  parseDateValue,
  parsePrizeAmount,
  parseSubmissionPeriod,
  safeHttpUrl,
  slugify,
  startOfUtcDay,
  stripHtml,
  truncate,
  uniqueStrings,
};
