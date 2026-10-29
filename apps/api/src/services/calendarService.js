'use strict';

const Hackathon = require('../../models/Hackathon');
const { serialize: serializeHackathon } = require('./hackathonsService');

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DAY_MS = 24 * 60 * 60 * 1000;
// The calendar UI is explicitly Asia/Kolkata (UTC+05:30) and groups events
// by IST day, so the backend month window must use the same boundary.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function badRequest(message, code = 'VALIDATION_ERROR') {
  return { status: 400, code, message };
}

function parseMonth(value) {
  const month = String(value || '').trim();
  const match = MONTH_PATTERN.exec(month);
  if (!match) {
    throw badRequest('month must use the YYYY-MM format');
  }
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  return {
    month,
    start: new Date(Date.UTC(year, monthIndex, 1) - IST_OFFSET_MS),
    end: new Date(Date.UTC(year, monthIndex + 1, 1) - IST_OFFSET_MS),
  };
}

function parseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function inRange(date, start, end) {
  return date.getTime() >= start.getTime() && date.getTime() < end.getTime();
}

function eventLabel(type) {
  if (type === 'registration') return 'Registration deadline';
  if (type === 'submission') return 'Submission deadline';
  return 'Event date';
}

function buildEvent(hackathon, type, date) {
  const label = eventLabel(type);
  return {
    id: `${hackathon._id}:${type}`,
    type,
    label,
    title: label,
    date: date.toISOString(),
    hackathonId: String(hackathon._id),
    hackathonSlug: hackathon.hackathon_id || '',
    description: hackathon.description || '',
    hackathon: serializeHackathon(hackathon),
  };
}

// A calendar is hackathon deadlines, not a second event store. The public
// hackathon catalogue is the source of truth for both the month grid and the
// reminder picker.
async function listEvents(monthValue) {
  const { month, start, end } = parseMonth(monthValue);
  const hackathons = await Hackathon.find({ is_hidden: { $ne: true } }).lean();
  const items = [];

  for (const hackathon of hackathons) {
    const registration = parseDate(hackathon.registration_deadline);
    if (registration && inRange(registration, start, end)) {
      items.push(buildEvent(hackathon, 'registration', registration));
    }

    const submission = parseDate(hackathon.submission_deadline);
    if (submission && inRange(submission, start, end)) {
      items.push(buildEvent(hackathon, 'submission', submission));
    }

    const startDate = parseDate(hackathon.event_start_date);
    if (startDate && inRange(startDate, start, end)) {
      items.push(buildEvent(hackathon, 'event', startDate));
    }
  }

  items.sort((a, b) => new Date(a.date) - new Date(b.date) || a.title.localeCompare(b.title));
  return { month, items };
}

function upcomingDeadline(hackathon, eventType) {
  const candidates = eventType === 'submission'
    ? [hackathon.submission_deadline]
    : eventType === 'event'
      ? [hackathon.event_start_date, hackathon.registration_deadline]
      : [hackathon.registration_deadline];

  for (const candidate of candidates) {
    const parsed = parseDate(candidate);
    if (parsed) return parsed;
  }
  return null;
}

module.exports = {
  DAY_MS,
  parseMonth,
  parseDate,
  listEvents,
  upcomingDeadline,
  eventLabel,
};
