'use strict';

const mongoose = require('mongoose');

const User = require('../../models/User');
const Hackathon = require('../../models/Hackathon');
const { Reminder, EVENT_TYPES, CHANNELS } = require('../models/reminder');
const { DAY_MS, upcomingDeadline } = require('./calendarService');

const DEFAULT_PREFERENCES = Object.freeze({
  defaultDaysBefore: 1,
  channels: ['email'],
  quietHours: { start: '22:00', end: '08:00' },
});

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function badRequest(message, code = 'VALIDATION_ERROR') {
  return { status: 400, code, message };
}

function notFound(message = 'Reminder not found') {
  return { status: 404, code: 'REMINDER_NOT_FOUND', message };
}

function normalizePreferences(value) {
  const source = value && typeof value === 'object' ? value : {};
  const channels = Array.isArray(source.channels)
    ? source.channels.filter((channel) => CHANNELS.includes(channel))
    : DEFAULT_PREFERENCES.channels;
  const start = TIME_PATTERN.test(String(source.quietHours?.start || ''))
    ? source.quietHours.start
    : DEFAULT_PREFERENCES.quietHours.start;
  const end = TIME_PATTERN.test(String(source.quietHours?.end || ''))
    ? source.quietHours.end
    : DEFAULT_PREFERENCES.quietHours.end;
  const days = Number(source.defaultDaysBefore);

  return {
    defaultDaysBefore: Number.isInteger(days) && days >= 0 && days <= 365
      ? days
      : DEFAULT_PREFERENCES.defaultDaysBefore,
    channels: channels.length ? [...new Set(channels)] : [...DEFAULT_PREFERENCES.channels],
    quietHours: { start, end },
  };
}

function parseDaysBefore(value) {
  const days = Number(value);
  if (!Number.isInteger(days) || days < 0 || days > 365) {
    throw badRequest('daysBefore must be a whole number from 0 to 365');
  }
  return days;
}

function parseChannels(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw badRequest('channels must contain at least one of email or in_app');
  }
  const invalid = value.filter((channel) => !CHANNELS.includes(channel));
  if (invalid.length) {
    throw badRequest(`Unsupported reminder channel: ${invalid.join(', ')}`);
  }
  return [...new Set(value)];
}

function parseQuietHours(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw badRequest('quietHours must include start and end times');
  }
  const { start, end } = value;
  if (!TIME_PATTERN.test(String(start || '')) || !TIME_PATTERN.test(String(end || ''))) {
    throw badRequest('quietHours start and end must use HH:MM (IST)');
  }
  return { start, end };
}

async function resolveHackathon(idOrSlug) {
  const value = String(idOrSlug || '').trim();
  if (!value) throw badRequest('hackathonId is required');

  let hackathon = null;
  if (mongoose.Types.ObjectId.isValid(value)) {
    hackathon = await Hackathon.findById(value);
  }
  if (!hackathon) {
    hackathon = await Hackathon.findOne({ hackathon_id: value });
  }
  if (!hackathon || hackathon.is_hidden) {
    throw { status: 404, code: 'HACKATHON_NOT_FOUND', message: 'Hackathon not found' };
  }
  return hackathon;
}

function reminderTitle(eventType) {
  if (eventType === 'submission') return 'Submission deadline reminder';
  if (eventType === 'event') return 'Hackathon start reminder';
  return 'Registration deadline reminder';
}

function serializeReminder(reminder, hackathon) {
  const source = reminder.toObject ? reminder.toObject() : reminder;
  return {
    id: String(source._id),
    _id: String(source._id),
    title: `${reminderTitle(source.eventType)} · ${hackathon.title || 'Hackathon'}`,
    hackathonId: String(hackathon._id),
    hackathonSlug: hackathon.hackathon_id || '',
    hackathonTitle: hackathon.title || '',
    eventType: source.eventType,
    daysBefore: source.daysBefore,
    channel: source.channel,
    eventAt: source.eventAt || null,
    remindAt: source.remindAt,
    active: source.active !== false,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

async function listReminders(userId) {
  const rows = await Reminder.find({ user: userId, active: true })
    .sort({ remindAt: 1 })
    .populate({
      path: 'hackathon',
      select: 'hackathon_id title registration_deadline submission_deadline event_start_date is_hidden',
    })
    .lean();

  return {
    items: rows
      .filter((row) => row.hackathon && !row.hackathon.is_hidden)
      .map((row) => serializeReminder(row, row.hackathon)),
  };
}

async function createReminder(userId, payload) {
  const data = payload && typeof payload === 'object' ? payload : {};
  const { hackathonId, eventType = 'registration', channel = 'email' } = data;
  if (!EVENT_TYPES.includes(eventType)) {
    throw badRequest(`eventType must be one of ${EVENT_TYPES.join(', ')}`);
  }
  if (!CHANNELS.includes(channel)) {
    throw badRequest(`channel must be one of ${CHANNELS.join(', ')}`);
  }
  const daysBefore = parseDaysBefore(data.daysBefore);

  const hackathon = await resolveHackathon(hackathonId);
  const deadline = upcomingDeadline(hackathon, eventType);
  if (!deadline) {
    throw badRequest(
      'This hackathon does not have a date for that reminder type',
      'NO_DEADLINE'
    );
  }

  const remindAt = new Date(deadline.getTime() - daysBefore * DAY_MS);
  try {
    const reminder = await Reminder.create({
      user: userId,
      hackathon: hackathon._id,
      eventType,
      daysBefore,
      channel,
      eventAt: deadline,
      remindAt,
    });
    return serializeReminder(reminder, hackathon);
  } catch (error) {
    if (error && error.code === 11000) {
      throw { status: 409, code: 'REMINDER_EXISTS', message: 'That reminder already exists' };
    }
    throw error;
  }
}

async function removeReminder(userId, id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw notFound();
  const removed = await Reminder.findOneAndDelete({ _id: id, user: userId });
  if (!removed) throw notFound();
}

async function getPreferences(userId) {
  const user = await User.findById(userId).select('reminderPreferences');
  if (!user) throw { status: 404, code: 'USER_NOT_FOUND', message: 'User not found' };
  return normalizePreferences(user.reminderPreferences);
}

async function updatePreferences(userId, payload) {
  const data = payload && typeof payload === 'object' ? payload : {};
  const current = await getPreferences(userId);
  const next = { ...current };

  if (data.defaultDaysBefore !== undefined) {
    next.defaultDaysBefore = parseDaysBefore(data.defaultDaysBefore);
  }
  if (data.channels !== undefined) {
    next.channels = parseChannels(data.channels);
  }
  if (data.quietHours !== undefined) {
    next.quietHours = parseQuietHours(data.quietHours);
  }

  const user = await User.findById(userId);
  if (!user) throw { status: 404, code: 'USER_NOT_FOUND', message: 'User not found' };
  user.reminderPreferences = next;
  await user.save();
  return normalizePreferences(user.reminderPreferences);
}

module.exports = {
  DEFAULT_PREFERENCES,
  normalizePreferences,
  listReminders,
  createReminder,
  removeReminder,
  getPreferences,
  updatePreferences,
};
