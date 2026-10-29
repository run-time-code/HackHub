'use strict';

const Hackathon = require('../../models/Hackathon');
const logger = require('../utils/logger');

const DEVPOST_API = 'https://devpost.com/api/hackathons.json?page=1';

function cleanText(value) {
  return String(value || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function parseSubmissionPeriod(value) {
  if (!value) return { start: null, end: null };
  const normalized = cleanText(value).replace(/\u00a0/g, ' ');
  const parts = normalized.split('-').map((part) => part.trim());
  if (parts.length !== 2) return { start: null, end: null };
  const endMatch = parts[1].match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/);
  const year = endMatch?.[3];
  const startMatch = parts[0].match(/([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?/);
  const start = startMatch && utcDate(startMatch[1], Number(startMatch[2]), Number(startMatch[3] || year));
  const end = endMatch && utcDate(endMatch[1], Number(endMatch[2]), Number(endMatch[3]));
  return { start: isValidDate(start) ? start : null, end: isValidDate(end) ? end : null };
}

function utcDate(monthName, day, year) {
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const month = months.indexOf(monthName.toLowerCase().slice(0, 3));
  return month >= 0 ? new Date(Date.UTC(year, month, day)) : new Date(NaN);
}

function isValidDate(value) {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

async function syncDevpostHackathons() {
  const response = await fetch(DEVPOST_API, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Devpost returned HTTP ${response.status}`);
  const payload = await response.json();
  const external = Array.isArray(payload.hackathons) ? payload.hackathons : [];
  const seenIds = [];

  for (const item of external) {
    const externalId = String(item.id);
    seenIds.push(externalId);
    const period = parseSubmissionPeriod(item.submission_period_dates);
    const location = item.displayed_location?.location || 'Online';
    const themes = Array.isArray(item.themes) ? item.themes.map((theme) => theme.name).filter(Boolean) : [];
    const update = {
      hackathon_id: `devpost-${externalId}`,
      title: item.title || `Devpost hackathon ${externalId}`,
      description: `${item.title || 'Hackathon'}${themes.length ? ` — ${themes.join(', ')}` : ''}.`,
      organizer: item.organization_name || 'Devpost',
      url: item.url || '',
      mode: /online/i.test(location) ? 'online' : 'offline',
      location,
      domains: themes,
      skills: themes,
      prize_pool: cleanText(item.prize_amount),
      registration_deadline: period.end,
      submission_deadline: period.end,
      event_start: period.start,
      event_end: period.end,
      source: 'devpost',
      external_id: externalId,
      is_featured: Boolean(item.featured),
      is_active: item.open_state !== 'closed',
    };
    await Hackathon.updateOne({ source: 'devpost', external_id: externalId }, { $set: update }, { upsert: true });
  }

  if (seenIds.length) {
    await Hackathon.updateMany(
      { source: 'devpost', external_id: { $nin: seenIds } },
      { $set: { is_active: false } }
    );
  }

  logger.info({ imported: external.length }, '[devpost-ingestion] completed');
  return { imported: external.length };
}

module.exports = { syncDevpostHackathons, parseSubmissionPeriod }; 
