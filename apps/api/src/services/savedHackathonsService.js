
'use strict';

const mongoose = require('mongoose');

const SavedHackathon = require('../../models/SavedHackathon');
const Hackathon = require('../../models/Hackathon');
const { serialize: serializeHackathon } = require('./hackathonsService');

const STATUSES = ['saved', 'registered', 'ongoing', 'completed'];

function badRequest(message) {
  return { status: 400, code: 'VALIDATION_ERROR', message };
}

function notFound(message = 'Saved hackathon not found') {
  return { status: 404, code: 'SAVED_NOT_FOUND', message };
}

async function resolveHackathon(idOrSlug) {
  const value = String(idOrSlug || '').trim();

  if (!value) {
    throw badRequest('hackathonId is required');
  }

  let hackathon = null;

  if (mongoose.Types.ObjectId.isValid(value)) {
    hackathon = await Hackathon.findById(value);
  }

  if (!hackathon) {
    hackathon = await Hackathon.findOne({ hackathon_id: value });
  }

  if (!hackathon || hackathon.is_hidden) {
    throw {
      status: 404,
      code: 'HACKATHON_NOT_FOUND',
      message: 'Hackathon not found'
    };
  }

  return hackathon;
}

function serializeSaved(saved, hackathon) {
  if (!saved) {
    throw new Error(
      'Saved hackathon document was not returned by the database'
    );
  }

  const source = typeof saved.toObject === 'function'
    ? saved.toObject()
    : saved;

  const card = hackathon
    ? serializeHackathon(hackathon)
    : {
        id: '',
        slug: source.hackathon,
        title: 'Hackathon'
      };

  return {
    id: String(source._id),
    _id: String(source._id),
    savedId: String(source._id),
    hackathon: card,
    status: STATUSES.includes(source.status)
      ? source.status
      : 'saved',
    notes: source.notes || '',
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

async function hydrate(rows) {
  const slugs = [
    ...new Set(rows.map((row) => row.hackathon))
  ];

  const hackathons = await Hackathon.find({
    hackathon_id: { $in: slugs }
  }).lean();

  const bySlug = new Map(
    hackathons.map((hackathon) => [
      hackathon.hackathon_id,
      hackathon
    ])
  );

  return rows.map((row) =>
    serializeSaved(row, bySlug.get(row.hackathon))
  );
}

async function listSaved(userId) {
  const rows = await SavedHackathon.find({
    user: userId
  })
    .sort({ updatedAt: -1 })
    .lean();

  return {
    items: await hydrate(rows)
  };
}

async function save(userId, hackathonId) {
  const hackathon = await resolveHackathon(hackathonId);

  const filter = {
    user: userId,
    hackathon: hackathon.hackathon_id
  };

  try {
    const saved = await SavedHackathon.findOneAndUpdate(
      filter,
      {
        $setOnInsert: {
          user: userId,
          hackathon: hackathon.hackathon_id,
          status: 'saved',
          notes: '',
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true
      }
    );

    if (!saved) {
      throw new Error(
        'Failed to create or retrieve saved hackathon'
      );
    }

    return serializeSaved(saved, hackathon);

  } catch (error) {
    // Handle simultaneous save requests that race
    // against the unique (user, hackathon) index.

    if (error && error.code === 11000) {
      const existing = await SavedHackathon.findOne(filter);

      if (!existing) {
        throw new Error(
          'Saved hackathon not found after duplicate-key conflict'
        );
      }

      return serializeSaved(existing, hackathon);
    }

    throw error;
  }
}

async function update(userId, id, payload) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw notFound();
  }

  const data = payload && typeof payload === 'object'
    ? payload
    : {};

  const updates = {};

  if (data.status !== undefined) {
    if (!STATUSES.includes(data.status)) {
      throw badRequest(
        `status must be one of ${STATUSES.join(', ')}`
      );
    }

    updates.status = data.status;
  }

  if (data.notes !== undefined) {
    if (typeof data.notes !== 'string') {
      throw badRequest('notes must be a string');
    }

    if (data.notes.length > 2000) {
      throw badRequest('notes cannot exceed 2000 characters');
    }

    updates.notes = data.notes;
  }

  if (!Object.keys(updates).length) {
    throw badRequest('Provide status or notes to update');
  }

  const saved = await SavedHackathon.findOneAndUpdate(
    {
      _id: id,
      user: userId
    },
    {
      $set: updates
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (!saved) {
    throw notFound();
  }

  const hackathon = await Hackathon.findOne({
    hackathon_id: saved.hackathon
  });

  return serializeSaved(saved, hackathon);
}

async function remove(userId, id) {
  const query = {
    user: userId
  };

  if (mongoose.Types.ObjectId.isValid(id)) {
    query._id = id;
  } else {
    query.hackathon = id;
  }

  const removed = await SavedHackathon.findOneAndDelete(query);

  if (!removed) {
    throw notFound();
  }
}

module.exports = {
  STATUSES,
  listSaved,
  save,
  update,
  remove,
};
