const CRLF = '\r\n';
const encoder = new TextEncoder();

function escapeText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function foldLine(line) {
  let folded = '';
  let size = 0;
  for (const character of line) {
    const characterSize = encoder.encode(character).length;
    if (size + characterSize > 75) {
      folded += CRLF + ' ';
      size = 1;
    }
    folded += character;
    size += characterSize;
  }
  return folded;
}

function icsDate(value) {
  if (!(value instanceof Date || typeof value === 'string' || typeof value === 'number')) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function eventDate(event) {
  if (!event || typeof event !== 'object') return null;
  return event.start || event.date || event.startsAt || event.startDate ||
    event.registrationDeadline || event.submissionDeadline || null;
}

function eventUrl(value) {
  if (typeof value !== 'string' || /[\r\n]/.test(value)) return '';
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

export function generateCalendarIcs(events, options = {}) {
  if (!Array.isArray(events)) throw new TypeError('Calendar events must be an array.');
  const stamp = icsDate(options.now || new Date()) || icsDate(new Date().toISOString());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HackHub//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const [index, event] of events.entries()) {
    const start = icsDate(eventDate(event));
    if (!start) continue;
    const title = event.title || event.name || event.label || 'Hackathon event';
    const hackathonTitle = event.hackathon?.title || event.hackathonTitle || '';
    const summary = hackathonTitle && !title.includes(hackathonTitle)
      ? `${title} — ${hackathonTitle}`
      : title;
    const endValue = event.end || event.endDate || event.endsAt;
    const end = icsDate(endValue);
    const description = event.description || event.hackathon?.description || '';
    const url = eventUrl(event.url || event.eventUrl || event.hackathon?.url || '');
    const uid = `${event.id || event.hackathonId || index}@hackhub.local`;
    const content = [
      'BEGIN:VEVENT',
      `UID:${escapeText(uid)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${start}`,
      end ? `DTEND:${end}` : '',
      `SUMMARY:${escapeText(summary)}`,
      description ? `DESCRIPTION:${escapeText(description)}` : '',
      url ? `URL:${url.replace(/[\r\n]/g, '')}` : '',
      'END:VEVENT',
    ].filter(Boolean).map(foldLine);
    lines.push(...content);
  }
  lines.push('END:VCALENDAR');
  return `${lines.join(CRLF)}${CRLF}`;
}

export function downloadCalendarIcs(events, filename = 'hackhub-calendar.ics') {
  const blob = new Blob([generateCalendarIcs(events)], {
    type: 'text/calendar;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
