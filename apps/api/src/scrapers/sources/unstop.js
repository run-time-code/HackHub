'use strict';

// Unstop (formerly Dare2Compete) serves its hackathon directory from a public
// search endpoint used by unstop.com itself:
//   GET https://unstop.com/api/public/opportunity/search-new?opportunity=hackathons&page=1&per_page=20
// It also lists hiring hackathons (`actively_hiring`), which is why Unstop is
// our primary source for companies that recruit interns through hackathons.

const { fetchJson } = require('../http');
const {
  cleanText,
  expandTags,
  parseDateValue,
  truncate,
} = require('../normalize');

const BASE_URL = 'https://unstop.com/api/public/opportunity/search-new';
const PER_PAGE = 20;

function prizeDetails(item) {
  const prizes = Array.isArray(item.prizes) ? item.prizes : [];
  const cash = prizes
    .map((prize) => Number(prize?.cash))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!cash.length) return { amount: null, text: '' };
  const total = cash.reduce((sum, value) => sum + value, 0);
  return { amount: total, text: `₹${total.toLocaleString('en-IN')}` };
}

function mapHackathon(item) {
  if (!item || item.id == null) return null;

  const title = cleanText(item.title);
  if (!title) return null;

  const region = cleanText(item.region).toLowerCase();
  const filters = Array.isArray(item.filters) ? item.filters.map((filter) => filter?.name) : [];
  const skills = Array.isArray(item.required_skills)
    ? item.required_skills.map((skill) => skill?.skill_name || skill?.skill)
    : [];
  const locations = Array.isArray(item.locations)
    ? item.locations.map((location) => location?.name || location?.city)
    : [];
  const tags = expandTags([
    ...filters,
    item.subtype ? String(item.subtype).replace(/_/g, ' ') : '',
    item.actively_hiring ? 'Hiring' : '',
  ]);
  const prize = prizeDetails(item);
  const mode = region === 'online' ? 'ONLINE' : region === 'offline' ? 'OFFLINE' : 'HYBRID';

  return {
    sourceKey: 'unstop',
    externalId: String(item.id),
    title,
    description: truncate(cleanText(item.details), 1200),
    organizerName: cleanText(item.organisation?.name) || 'Unstop community',
    url: cleanText(item.seo_url)
      || `https://unstop.com/${cleanText(item.public_url)}`,
    imageUrl: cleanText(item.logoUrl2 || item.thumb),
    mode,
    location: mode === 'ONLINE' ? 'Online' : (locations.join(', ') || ''),
    startDate: parseDateValue(item.start_date),
    endDate: parseDateValue(item.end_date),
    // Unstop closes registrations when the event ends; there is no separate
    // registration deadline in the public payload.
    registrationDeadline: parseDateValue(item.end_date),
    prizeAmount: prize.amount,
    prizeText: prize.text,
    tags,
    themes: [],
    skills: expandTags(skills),
    isOnline: mode === 'ONLINE',
    isHiring: Boolean(item.actively_hiring),
    raw: {
      status: item.status || null,
      registrationOpen: Boolean(item.regn_open),
      views: item.viewsCount ?? null,
      registrations: item.registerCount ?? null,
      subtype: item.subtype || null,
      internshipPrizes: Array.isArray(item.prizes)
        ? item.prizes.filter((p) => p?.pre_placement_internship || p?.pre_placement_opportunity).length
        : 0,
    },
  };
}

async function fetchCandidates({ maxPages = 10 } = {}) {
  const candidates = [];
  const now = Date.now();
  let lastPage = maxPages;

  for (let page = 1; page <= Math.min(maxPages, lastPage); page += 1) {
    const payload = await fetchJson(`${BASE_URL}?opportunity=hackathons&page=${page}&per_page=${PER_PAGE}`);
    const listing = payload?.data;
    const items = Array.isArray(listing?.data) ? listing.data : [];
    if (!items.length) break;

    for (const item of items) {
      const candidate = mapHackathon(item);
      if (!candidate) continue;
      const endsAt = (candidate.endDate || candidate.registrationDeadline)?.getTime();
      if (endsAt && endsAt < now) continue;
      candidates.push(candidate);
    }

    if (typeof listing?.last_page === 'number') {
      lastPage = Math.min(lastPage, listing.last_page);
    }
    if (page >= lastPage) break;
  }

  return candidates;
}

module.exports = {
  key: 'unstop',
  label: 'Unstop',
  homepage: 'https://unstop.com/hackathons',
  enabled: () => true,
  fetchCandidates,
  mapHackathon,
};
