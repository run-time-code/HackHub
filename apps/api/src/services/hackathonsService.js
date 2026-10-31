'use strict';

const mongoose = require('mongoose');

const Hackathon = require('../../models/Hackathon');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const CACHE_TTL_MS = 60_000;
const MAX_CACHE_ENTRIES = 500;
const listCache = new Map();

function badRequest(message) {
  return { status: 400, code: 'VALIDATION_ERROR', message };
}

function notFound() {
  return { status: 404, code: 'HACKATHON_NOT_FOUND', message: 'Hackathon not found' };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseList(value, name) {
  if (value === undefined || value === '') return [];
  const values = Array.isArray(value) ? value : String(value).split(',');
  if (values.some((item) => typeof item !== 'string')) {
    throw badRequest(`${name} must be a comma-separated string`);
  }
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

function parseNumber(value, name) {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw badRequest(`${name} must be a single number`);
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw badRequest(`${name} must be a non-negative number`);
  }
  return number;
}

function parseDate(value, name) {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string') throw badRequest(`${name} must be a single date`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw badRequest(`${name} must be a valid date`);
  return date;
}

function serialize(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  const slug = obj.hackathon_id || obj.slug || String(obj._id || obj.id);
  const registrationDeadline = obj.registrationDeadline || obj.registration_deadline || null;
  const rawOrganizer = obj.organizerName || obj.organizer?.name || obj.organizer || '';
  const rawSource = obj.sourceName || obj.source?.name || obj.source || '';
  const domains = Array.isArray(obj.domains) && obj.domains.length ? obj.domains : (obj.domain || []);
  const prizeValue = obj.prize ?? obj.prize_pool;
  return {
    id: String(obj._id || obj.id),
    _id: String(obj._id || obj.id),
    slug,
    hackathonId: slug,
    title: obj.title,
    description: obj.description || '',
    organizer: typeof rawOrganizer === 'string' ? rawOrganizer : '',
    source: typeof rawSource === 'string' ? rawSource : '',
    url: obj.url || obj.sourceUrl || obj.source_url || '',
    skills: obj.skills || [],
    domain: domains,
    domains,
    theme: obj.theme || '',
    tags: (obj.tagNames || obj.tags || [])
      .map((tag) => (typeof tag === 'string' ? tag : tag?.name))
      .filter(Boolean),
    mode: obj.mode || 'ONLINE',
    location: obj.location || '',
    registrationDeadline,
    registration_deadline: registrationDeadline,
    submissionDeadline: obj.submissionDeadline || obj.submission_deadline || null,
    submission_deadline: obj.submissionDeadline || obj.submission_deadline || null,
    eventStartDate: obj.eventStartDate || obj.event_start_date || obj.event_start || null,
    eventEndDate: obj.eventEndDate || obj.event_end_date || obj.event_end || null,
    prize: prizeValue === null || prizeValue === undefined ? null : String(prizeValue),
    prizePool: prizeValue === null || prizeValue === undefined ? '' : String(prizeValue),
    status: obj.status || 'upcoming',
    sourceUrl: obj.sourceUrl || obj.source_url || '',
    source_url: obj.source_url || obj.sourceUrl || '',
    sourceId: obj.source && typeof obj.source !== 'string' ? String(obj.source) : '',
    externalId: obj.externalId || obj.external_id || '',
    external_id: obj.external_id || obj.externalId || '',
    isActive: obj.is_active !== undefined ? obj.is_active !== false : obj.isActive !== false,
    is_active: obj.is_active !== undefined ? obj.is_active !== false : obj.isActive !== false,
    isHidden: Boolean(obj.is_hidden || obj.isHidden),
    isFeatured: Boolean(obj.is_featured || obj.isFeatured),
    createdAt: obj.createdAt || null,
    updatedAt: obj.updatedAt || null,
  };
}

function addCondition(filter, condition) {
  filter.$and = [...(filter.$and || []), condition];
}

function invalidateHackathonCache() {
  listCache.clear();
}

function getCached(key) {
  const entry = listCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    listCache.delete(key);
    return null;
  }
  return entry.value;
}

function setCached(key, value) {
  if (listCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = listCache.keys().next().value;
    if (oldestKey !== undefined) listCache.delete(oldestKey);
  }
  listCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function listHackathons(query = {}) {
  const values = query || {};
  const stringParams = [
    'q', 'search', 'skills', 'skill', 'domain', 'mode', 'location', 'status',
    'sort', 'page', 'limit', 'active', 'source', 'upcoming', 'hasPrize',
    'minPrize', 'maxPrize', 'fromDate', 'toDate',
  ];
  const invalidParam = stringParams.find((key) => values[key] !== undefined && typeof values[key] !== 'string');
  if (invalidParam) throw badRequest(`${invalidParam} must be a single value`);
  const requestedPage = values.page === undefined ? 1 : Number(values.page);
  if (!Number.isInteger(requestedPage) || requestedPage < 1) throw badRequest('page must be a positive integer');
  const requestedLimit = values.limit === undefined ? DEFAULT_LIMIT : Number(values.limit);
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1) throw badRequest('limit must be a positive integer');
  const pageNum = requestedPage;
  const limitNum = Math.min(requestedLimit, MAX_LIMIT);
  const search = String(values.q || values.search || '').trim();
  if (search.length > 100) throw badRequest('q must be at most 100 characters');
  const cacheKey = JSON.stringify(Object.keys(values).sort().map((key) => [key, values[key]]));
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const filter = {
    is_hidden: { $ne: true },
    isHidden: { $ne: true },
  };
  const statuses = parseList(values.status, 'status');
  if (!statuses.includes('inactive')) {
    filter.is_active = { $ne: false };
    filter.isActive = { $ne: false };
  }
  const skills = parseList(values.skills ?? values.skill, 'skills');
  const domains = parseList(values.domain, 'domain');
  const modes = parseList(values.mode, 'mode').map((mode) =>
    mode.toLowerCase() === 'in-person' ? 'OFFLINE' : mode.toUpperCase()
  );
  const locations = parseList(values.location, 'location');
  const sources = parseList(values.source, 'source');
  const minPrize = parseNumber(values.minPrize, 'minPrize');
  const maxPrize = parseNumber(values.maxPrize, 'maxPrize');
  const fromDate = parseDate(values.fromDate, 'fromDate');
  const toDate = parseDate(values.toDate, 'toDate');

  if (search) {
    const pattern = { $regex: escapeRegExp(search), $options: 'i' };
    addCondition(filter, {
      $or: [
        { title: pattern },
        { description: pattern },
        { organizerName: pattern },
        { organizer: pattern },
        { slug: pattern },
        { hackathon_id: pattern },
      ],
    });
  }
  if (skills.length) {
    addCondition(filter, { skills: { $in: skills.map((skill) => new RegExp(`^${escapeRegExp(skill)}$`, 'i')) } });
  }
  if (domains.length) {
    const patterns = domains.map((domain) => new RegExp(escapeRegExp(domain), 'i'));
    addCondition(filter, {
      $or: [
        { domain: { $in: patterns } },
        { domains: { $in: patterns } },
        { theme: { $in: patterns } },
      ],
    });
  }
  if (modes.length) {
    if (modes.some((mode) => !['ONLINE', 'OFFLINE', 'HYBRID'].includes(mode))) {
      throw badRequest('mode must be ONLINE, OFFLINE, or HYBRID');
    }
    filter.mode = modes.length === 1 ? modes[0] : { $in: modes };
  }
  if (locations.length) {
    addCondition(filter, {
      $or: locations.map((location) => ({
        location: { $regex: escapeRegExp(location), $options: 'i' },
      })),
    });
  }
  if (sources.length) {
    const patterns = sources.map((source) => new RegExp(`^${escapeRegExp(source)}$`, 'i'));
    addCondition(filter, {
      $or: [
        { sourceName: { $in: patterns } },
        { source: { $in: patterns } },
      ],
    });
  }
  if (values.active !== undefined && values.active !== '') {
    if (!['true', 'false'].includes(values.active)) throw badRequest('active must be true or false');
    const isActive = values.active === 'true';
    filter.is_active = isActive;
    filter.isActive = isActive;
  }
  if (values.upcoming !== undefined && values.upcoming !== '' && values.upcoming !== 'false') {
    if (values.upcoming !== 'true') throw badRequest('upcoming must be true or false');
    const now = new Date();
    addCondition(filter, {
      $or: [
        { registrationDeadline: { $gte: now } },
        { registration_deadline: { $gte: now } },
        { submissionDeadline: { $gte: now } },
        { submission_deadline: { $gte: now } },
        { eventStartDate: { $gte: now } },
        { event_start_date: { $gte: now } },
        { event_start: { $gte: now } },
      ],
    });
  }
  if (values.hasPrize !== undefined) {
    if (!['true', 'false'].includes(values.hasPrize)) throw badRequest('hasPrize must be true or false');
    const present = [
      { prize: { $nin: ['', null] } },
      { prize_pool: { $nin: ['', null] } },
    ];
    addCondition(filter, values.hasPrize === 'true'
      ? { $or: present }
      : { $and: [{ prize: { $in: ['', null] } }, { prize_pool: { $in: ['', null] } }] });
  }
  if (statuses.length) {
    if (statuses.some((status) => !['upcoming', 'ongoing', 'completed', 'inactive'].includes(status))) {
      throw badRequest('status must be upcoming, ongoing, completed, or inactive');
    }
    filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
  }
  if (minPrize !== undefined || maxPrize !== undefined) {
    if (minPrize !== undefined && maxPrize !== undefined && minPrize > maxPrize) {
      throw badRequest('minPrize cannot exceed maxPrize');
    }
    filter.prize = {
      ...(minPrize === undefined ? {} : { $gte: minPrize }),
      ...(maxPrize === undefined ? {} : { $lte: maxPrize }),
    };
  }
  if (fromDate || toDate) {
    const deadlineFilter = {
      ...(fromDate ? { $gte: fromDate } : {}),
      ...(toDate ? { $lte: toDate } : {}),
    };
    const legacyDeadlineFilter = {
      ...(fromDate ? { $gte: fromDate.toISOString() } : {}),
      ...(toDate ? { $lte: toDate.toISOString() } : {}),
    };
    addCondition(filter, {
      $or: [
        { registrationDeadline: deadlineFilter },
        { registration_deadline: legacyDeadlineFilter },
      ],
    });
  }

  const sortBy = String(values.sort || 'title');
  const sorts = {
    title: { title: 1, _id: 1 },
    newest: { createdAt: -1, _id: -1 },
    prize_high: { prize: -1, _id: 1 },
    prize_low: { prize: 1, _id: 1 },
  };
  if (!sorts[sortBy] && sortBy !== 'deadline') {
    throw badRequest('sort must be title, newest, deadline, prize_high, or prize_low');
  }

  const listQuery = sortBy === 'deadline'
    ? Hackathon.aggregate([
      { $match: filter },
      {
        $addFields: {
          _sortDeadline: {
            $ifNull: [
              '$registrationDeadline',
              { $ifNull: ['$registration_deadline', { $ifNull: ['$submissionDeadline', '$submission_deadline'] }] },
            ],
          },
        },
      },
      { $sort: { _sortDeadline: 1, title: 1, _id: 1 } },
      { $skip: (pageNum - 1) * limitNum },
      { $limit: limitNum },
      { $project: { _sortDeadline: 0 } },
    ])
    : Hackathon.find(filter)
      .sort(sorts[sortBy])
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);
  const [items, total, groupedFacets] = await Promise.all([
    listQuery,
    Hackathon.countDocuments(filter),
    Hackathon.aggregate([
      { $match: filter },
      {
        $facet: {
          modes: [{ $group: { _id: '$mode', count: { $sum: 1 } } }],
          statuses: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          domains: [{ $unwind: '$domain' }, { $group: { _id: '$domain', count: { $sum: 1 } } }],
          skills: [{ $unwind: '$skills' }, { $group: { _id: '$skills', count: { $sum: 1 } } }],
          locations: [{ $match: { location: { $nin: ['', null] } } }, { $group: { _id: '$location', count: { $sum: 1 } } }],
        },
      },
    ]),
  ]);
  const facets = Object.fromEntries(
    Object.entries(groupedFacets[0] || {}).map(([name, groups]) => [
      name,
      groups.filter((item) => item._id !== null && item._id !== '').map((item) => ({ value: item._id, count: item.count })),
    ])
  );
  const result = {
    items: items.map(serialize),
    page: pageNum,
    limit: limitNum,
    total,
    facets,
  };
  setCached(cacheKey, result);
  return result;
}

async function getHackathonFacets() {
  const filter = {
    is_hidden: { $ne: true },
    isHidden: { $ne: true },
    is_active: { $ne: false },
    isActive: { $ne: false },
  };
  const [domainRows, skillRows, modeRows, sourceRows] = await Promise.all([
    Hackathon.aggregate([
      { $match: filter },
      {
        $project: {
          values: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ['$domains', []] } }, 0] },
              '$domains',
              { $ifNull: ['$domain', []] },
            ],
          },
        },
      },
      { $unwind: '$values' },
      { $group: { _id: '$values', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Hackathon.aggregate([
      { $match: filter },
      { $unwind: '$skills' },
      { $group: { _id: '$skills', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Hackathon.aggregate([
      { $match: { ...filter, mode: { $nin: ['', null] } } },
      { $group: { _id: '$mode', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Hackathon.aggregate([
      { $match: filter },
      {
        $project: {
          value: {
            $cond: [
              { $and: [{ $ne: ['$sourceName', null] }, { $ne: ['$sourceName', ''] }] },
              '$sourceName',
              {
                $cond: [
                  { $eq: [{ $type: '$source' }, 'string'] },
                  '$source',
                  '$source.name',
                ],
              },
            ],
          },
        },
      },
      { $match: { value: { $nin: ['', null] } } },
      { $group: { _id: '$value', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);
  const facet = (rows) => rows
    .filter((row) => typeof row._id === 'string' && row._id.trim())
    .map((row) => ({ value: row._id, count: row.count }));
  return {
    domains: facet(domainRows),
    skills: facet(skillRows),
    modes: facet(modeRows),
    sources: facet(sourceRows),
  };
}

async function getHackathonById(idOrSlug) {
  if (!idOrSlug) throw badRequest('hackathon id is required');
  let doc = null;
  if (mongoose.Types.ObjectId.isValid(idOrSlug)) doc = await Hackathon.findById(idOrSlug);
  if (!doc) {
    doc = await Hackathon.findOne({
      $or: [{ hackathon_id: idOrSlug }, { slug: idOrSlug }],
    });
  }
  if (!doc || doc.is_hidden || doc.isHidden) throw notFound();
  return serialize(doc);
}

async function hackathonExists(hackathonId) {
  if (!hackathonId || !mongoose.Types.ObjectId.isValid(hackathonId)) return false;
  return (await Hackathon.exists({ _id: hackathonId })) !== null;
}

module.exports = {
  listHackathons,
  getHackathonById,
  getHackathonFacets,
  hackathonExists,
  serialize,
  invalidateHackathonCache,
};
