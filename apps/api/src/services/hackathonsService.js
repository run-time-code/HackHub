'use strict';

const mongoose = require('mongoose');

const Hackathon = require('../../models/Hackathon');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const SORTS = ['title', 'newest', 'deadline'];

function badRequest(message) {
  return { status: 400, code: 'VALIDATION_ERROR', message };
}

function notFound() {
  return { status: 404, code: 'HACKATHON_NOT_FOUND', message: 'Hackathon not found' };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function filterTerms(value) {
  const values = Array.isArray(value) ? value : String(value || '').split(',');
  return values.map((term) => String(term).trim()).filter(Boolean);
}

function serialize(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  const prize = obj.prize ?? obj.prize_pool ?? null;
  return {
    id: String(obj._id || obj.id),
    _id: String(obj._id || obj.id),
    slug: obj.hackathon_id,
    hackathonId: obj.hackathon_id,
    title: obj.title,
    description: obj.description || '',
    organizer: obj.organizer || '',
    url: obj.url || obj.sourceUrl || '',
    mode: obj.mode || '',
    location: obj.location || '',
    prize: prize === null ? null : String(prize),
    prizePool: prize === null ? '' : String(prize),
    skills: Array.isArray(obj.skills) ? obj.skills : [],
    domains: Array.isArray(obj.domains) && obj.domains.length
      ? obj.domains
      : (Array.isArray(obj.domain) ? obj.domain : []),
    theme: obj.theme || '',
    registrationDeadline: obj.registration_deadline || null,
    submissionDeadline: obj.submission_deadline || null,
    eventStartDate: obj.event_start_date ?? (obj.event_start || null),
    eventEndDate: obj.event_end_date ?? (obj.event_end || null),
    source: obj.source || '',
    externalId: obj.external_id || '',
    isActive: obj.is_active !== false,
    isHidden: Boolean(obj.is_hidden),
    isFeatured: Boolean(obj.is_featured),
    createdAt: obj.createdAt || null,
    updatedAt: obj.updatedAt || null,
  };
}

// Public read surface for the team/discovery features. Hidden rows are excluded;
// teams reference the same rows by ObjectId (see `id`), while saved/registration
// records keep the long-lived `slug`.
async function listHackathons(query = {}) {
  const {
    q, domain, mode, skill, active, location, source, upcoming, hasPrize,
    sort = 'title', page = 1, limit = DEFAULT_LIMIT,
  } = query || {};
  if (!SORTS.includes(sort)) throw badRequest(`sort must be one of: ${SORTS.join(', ')}`);
  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const filter = { is_hidden: { $ne: true } };
  const conditions = [];

  if (q !== undefined && String(q).trim() !== '') {
    const needle = escapeRegExp(String(q).trim());
    conditions.push({
      $or: [
        { title: { $regex: needle, $options: 'i' } },
        { organizer: { $regex: needle, $options: 'i' } },
        { description: { $regex: needle, $options: 'i' } },
      ],
    });
  }
  const domains = filterTerms(domain).filter((term) => term.toLowerCase() !== 'all');
  if (domains.length) {
    conditions.push({ $or: domains.flatMap((term) => {
      const needle = { $regex: escapeRegExp(term), $options: 'i' };
      return [{ domains: needle }, { domain: needle }, { theme: needle }];
    }) });
  }
  if (mode !== undefined && String(mode).trim() !== '' && String(mode).toLowerCase() !== 'all') {
    const normalizedMode = String(mode).trim().toLowerCase() === 'in-person'
      ? 'offline'
      : String(mode).trim().toLowerCase();
    filter.mode = { $regex: `^${escapeRegExp(normalizedMode)}$`, $options: 'i' };
  }
  const skills = filterTerms(skill);
  if (skills.length) {
    filter.skills = { $in: skills.map((term) => new RegExp(escapeRegExp(term), 'i')) };
  }
  if (location !== undefined && String(location).trim() !== '') {
    filter.location = { $regex: escapeRegExp(String(location).trim()), $options: 'i' };
  }
  if (source !== undefined && String(source).trim() !== '') {
    filter.source = { $regex: `^${escapeRegExp(String(source).trim())}$`, $options: 'i' };
  }
  if (upcoming !== undefined && String(upcoming) !== 'false') {
    if (String(upcoming) !== 'true') throw badRequest('upcoming must be true or false');
    const now = new Date();
    conditions.push({
      $or: [
        { registration_deadline: { $gte: now } },
        { submission_deadline: { $gte: now } },
        { event_start_date: { $gte: now } },
        { event_start: { $gte: now } },
      ],
    });
  }
  if (hasPrize !== undefined) {
    if (!['true', 'false'].includes(String(hasPrize))) {
      throw badRequest('hasPrize must be true or false');
    }
    const prizeIsPresent = [
      { prize_pool: { $nin: ['', null] } },
      { prize: { $nin: ['', null] } },
    ];
    conditions.push(String(hasPrize) === 'true'
      ? { $or: prizeIsPresent }
      : { $and: prizeIsPresent.map((condition) => {
        const field = Object.keys(condition)[0];
        return { [field]: { $in: ['', null] } };
      }) });
  }
  if (active !== undefined && active !== '') {
    filter.is_active = String(active) === 'true';
  }
  if (conditions.length) filter.$and = conditions;

  const listQuery = sort === 'deadline'
    ? Hackathon.aggregate([
      { $match: filter },
      {
        $addFields: {
          _sortDeadline: {
            $ifNull: [
              '$registration_deadline',
              {
                $ifNull: [
                  '$submission_deadline',
                  {
                    $ifNull: [
                      '$event_start_date',
                      { $ifNull: ['$event_start', new Date('9999-12-31T23:59:59.999Z')] },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      { $sort: { _sortDeadline: 1, title: 1 } },
      { $skip: (pageNum - 1) * limitNum },
      { $limit: limitNum },
      { $project: { _sortDeadline: 0 } },
    ])
    : Hackathon.find(filter)
      .sort(sort === 'newest' ? { createdAt: -1, title: 1 } : { title: 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);
  const [items, total] = await Promise.all([listQuery, Hackathon.countDocuments(filter)]);
  return { items: items.map(serialize), page: pageNum, limit: limitNum, total };
}

async function getHackathonFacets() {
  const filter = { is_hidden: { $ne: true } };
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
      { $match: { ...filter, source: { $nin: ['', null] } } },
      { $group: { _id: '$source', count: { $sum: 1 } } },
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
  if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
    doc = await Hackathon.findById(idOrSlug);
  }
  if (!doc) {
    doc = await Hackathon.findOne({ hackathon_id: idOrSlug });
  }
  if (!doc || doc.is_hidden) throw notFound();
  return serialize(doc);
}

// Teams must reference a real hackathon row instead of persisting orphan teams
// with a random ObjectId.
async function hackathonExists(hackathonId) {
  if (!hackathonId || !mongoose.Types.ObjectId.isValid(hackathonId)) return false;
  const count = await Hackathon.countDocuments({ _id: hackathonId });
  return count > 0;
}

module.exports = {
  listHackathons,
  getHackathonById,
  getHackathonFacets,
  hackathonExists,
  serialize,
};