'use strict';

// Devfolio powers the devfolio.co hackathon directory through this public
// endpoint:
//   GET https://api.devfolio.co/api/hackathons?filter=all&page=1
// The response contains `result`, `count` and `pages`.

const { fetchJson } = require('../http');
const { cleanText, expandTags, parseDateValue } = require('../normalize');

const BASE_URL = 'https://api.devfolio.co/api/hackathons';

function eventUrl(item) {
  const subdomain = cleanText(item.hackathon_setting?.subdomain);
  if (subdomain) return `https://${subdomain}.devfolio.co/`;
  if (item.slug) return `https://devfolio.co/hackathons/${item.slug}`;
  return 'https://devfolio.co/hackathons';
}

function mapHackathon(item) {
  if (!item || !cleanText(item.name)) return null;

  const setting = item.hackathon_setting || {};
  const themes = Array.isArray(item.themes) ? item.themes.map((theme) => theme?.name) : [];
  const locationParts = [item.city, item.state, item.country].map(cleanText).filter(Boolean);
  const isOnline = Boolean(item.is_online);

  return {
    sourceKey: 'devfolio',
    externalId: String(item.uuid || item.slug || cleanText(item.name)),
    title: cleanText(item.name),
    description: [
      cleanText(item.name),
      themes.length ? `— ${themes.join(', ')}.` : '',
      cleanText(item.location) ? `Venue: ${cleanText(item.location)}.` : '',
    ].filter(Boolean).join(' '),
    organizerName: cleanText(item.hackathon_brand?.name)
      || cleanText(item.hackathon_brand?.brand_name)
      || 'Devfolio community',
    url: eventUrl(item),
    imageUrl: cleanText(item.cover_img),
    mode: isOnline ? 'ONLINE' : 'OFFLINE',
    location: isOnline ? 'Online' : (locationParts.join(', ') || cleanText(item.location) || ''),
    startDate: parseDateValue(item.starts_at),
    endDate: parseDateValue(item.ends_at),
    registrationDeadline: parseDateValue(setting.reg_ends_at),
    prizeAmount: null,
    prizeText: '',
    tags: expandTags(themes),
    themes,
    skills: [],
    isOnline,
    raw: {
      slug: item.slug || null,
      edition: item.edition_name || null,
      website: cleanText(setting.site) || null,
    },
  };
}

async function fetchCandidates({ maxPages = 10 } = {}) {
  const candidates = [];
  const now = Date.now();
  // `filter=all` includes the archive and returns up to 1000 rows per page,
  // so we cap the number of pages and drop events that already ended.
  let pages = Math.min(maxPages, 3);

  for (let page = 1; page <= pages; page += 1) {
    const payload = await fetchJson(`${BASE_URL}?filter=all&page=${page}`);
    const items = Array.isArray(payload.result) ? payload.result : [];
    if (!items.length) break;

    for (const item of items) {
      const candidate = mapHackathon(item);
      if (!candidate) continue;
      const endsAt = (candidate.endDate || candidate.registrationDeadline)?.getTime();
      if (endsAt && endsAt < now) continue;
      candidates.push(candidate);
    }

    if (typeof payload.pages === 'number') {
      pages = Math.min(pages, payload.pages);
    }
    if (page >= pages) break;
  }

  return candidates;
}

module.exports = {
  key: 'devfolio',
  label: 'Devfolio',
  homepage: 'https://devfolio.co/hackathons',
  enabled: () => true,
  fetchCandidates,
  mapHackathon,
};
