'use strict';

const mongoose = require('mongoose');

const Hackathon = require('../../models/Hackathon');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function badRequest(message) {
  return { status: 400, code: 'VALIDATION_ERROR', message };
}

function notFound() {
  return { status: 404, code: 'HACKATHON_NOT_FOUND', message: 'Hackathon not found' };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function serialize(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(obj._id || obj.id),
    slug: obj.hackathon_id,
    title: obj.title,
    registrationDeadline: obj.registration_deadline || null,
    isActive: obj.is_active !== false,
    isHidden: Boolean(obj.is_hidden),
    isFeatured: Boolean(obj.is_featured),
  };
}

// F-05a: public read surface for the team feature. Hidden rows are excluded;
// teams reference the same rows by ObjectId (see `id`), while saved/
// registration records keep the long-lived `slug`.
async function listHackathons(query = {}) {
  const { q, page = 1, limit = DEFAULT_LIMIT } = query || {};
  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const filter = { is_hidden: { $ne: true } };
  if (q !== undefined && String(q).trim() !== '') {
    const needle = escapeRegExp(String(q).trim());
    filter.title = { $regex: needle, $options: 'i' };
  }
  const [items, total] = await Promise.all([
    Hackathon.find(filter).sort({ title: 1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
    Hackathon.countDocuments(filter),
  ]);
  return { items: items.map(serialize), page: pageNum, limit: limitNum, total };
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

// F-05a: teams must reference a real hackathon row instead of persisting
// orphan teams with a random ObjectId.
async function hackathonExists(hackathonId) {
  if (!hackathonId || !mongoose.Types.ObjectId.isValid(hackathonId)) return false;
  const count = await Hackathon.countDocuments({ _id: hackathonId });
  return count > 0;
}

module.exports = { listHackathons, getHackathonById, hackathonExists, serialize };