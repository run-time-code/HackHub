'use strict';

const logger = require('../utils/logger');
const { Reminder } = require('../models/reminder');
const User = require('../../models/User');
const { createNotification } = require('./notificationsService');

const LOCK_MS = 5 * 60 * 1000;
const TIME_ZONE = 'Asia/Kolkata';
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function minutes(time) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time || '');
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function isInQuietHours(now, quietHours) {
  const istMinutes = new Date(now.getTime() + IST_OFFSET_MS);
  const localMinutes = istMinutes.getUTCHours() * 60 + istMinutes.getUTCMinutes();
  const start = minutes(quietHours?.start);
  const end = minutes(quietHours?.end);
  if (start === null || end === null) return false;
  return start === end ? false : start < end
    ? localMinutes >= start && localMinutes < end
    : localMinutes >= start || localMinutes < end;
}

function nextQuietHoursEnd(now, quietHours) {
  const end = minutes(quietHours?.end);
  const local = new Date(now.getTime() + IST_OFFSET_MS);
  const currentMinutes = local.getUTCHours() * 60 + local.getUTCMinutes();
  let dayOffset = 0;
  const start = minutes(quietHours?.start);
  if (start !== null && end !== null && start > end && currentMinutes >= start) {
    dayOffset = 1;
  }
  const hour = Math.floor(end / 60);
  const minute = end % 60;
  const utc = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() + dayOffset,
    hour,
    minute
  ) - IST_OFFSET_MS;
  return new Date(utc);
}

function reminderCopy(reminder, hackathonTitle) {
  const labels = {
    registration: 'Registration deadline',
    submission: 'Submission deadline',
    event: 'Event',
  };
  return {
    title: `Hackathon ${labels[reminder.eventType] || 'event'} reminder`,
    message: `${hackathonTitle}: the ${String(labels[reminder.eventType] || 'event').toLowerCase()} is coming up.`,
  };
}

async function claimDueReminder(now = new Date()) {
  return Reminder.findOneAndUpdate(
    {
      active: true,
      deliveredAt: null,
      remindAt: { $lte: now },
      $or: [
        { processingUntil: null },
        { processingUntil: { $lte: now } },
      ],
    },
    {
      $set: {
        processingUntil: new Date(now.getTime() + LOCK_MS),
      },
      $unset: { lastError: 1 },
    },
    { sort: { remindAt: 1 }, returnDocument: 'after' }
  ).populate({
    path: 'hackathon',
    select: 'title',
  });
}

async function processDueReminder(options = {}) {
  const now = options.now || new Date();
  const reminder = await claimDueReminder(now);
  if (!reminder) return null;

  try {
    const user = await User.findById(reminder.user).select('email reminderPreferences').lean();
    if (!user) throw new Error('Reminder user no longer exists');

    const preferences = user.reminderPreferences || {};
    if (!preferences.channels?.includes(reminder.channel)) {
      await Reminder.updateOne(
        { _id: reminder._id, deliveredAt: null },
        { $set: { deliveredAt: now, processingUntil: null } }
      );
      return reminder._id;
    }

    if (isInQuietHours(now, preferences.quietHours)) {
      await Reminder.updateOne(
        { _id: reminder._id, deliveredAt: null },
        {
          $set: {
            remindAt: nextQuietHoursEnd(now, preferences.quietHours),
            processingUntil: null,
          },
        }
      );
      return null;
    }

    const copy = reminderCopy(reminder, reminder.hackathon?.title || 'Hackathon');
    try {
      await createNotification({
        userId: reminder.user,
        type: 'reminder',
        title: copy.title,
        message: copy.message,
        data: {
          reminderId: String(reminder._id),
          hackathonId: String(reminder.hackathon?._id || ''),
          eventType: reminder.eventType,
        },
        email: reminder.channel === 'email',
        reminder: reminder._id,
      });
    } catch (error) {
      if (!error || error.code !== 11000) throw error;
    }

    await Reminder.updateOne(
      { _id: reminder._id, deliveredAt: null },
      { $set: { deliveredAt: now, processingUntil: null }, $unset: { lastError: 1 } }
    );
    return reminder._id;
  } catch (error) {
    await Reminder.updateOne(
      { _id: reminder._id },
      {
        $set: {
          processingUntil: new Date(now.getTime() + LOCK_MS),
          lastError: error.message || 'Reminder delivery failed',
        },
      }
    );
    logger.error({ err: error, reminderId: String(reminder._id) }, 'reminder dispatch failed');
    return null;
  }
}

async function processDueReminders(options = {}) {
  const limit = options.limit || 50;
  const now = options.now || new Date();
  let delivered = 0;
  for (let index = 0; index < limit; index += 1) {
    const result = await processDueReminder({ ...options, now });
    if (result) {
      delivered += 1;
      continue;
    }

    const remaining = await Reminder.exists({
      active: true,
      deliveredAt: null,
      remindAt: { $lte: now },
      $or: [
        { processingUntil: null },
        { processingUntil: { $lte: now } },
      ],
    });
    if (!remaining) break;
  }
  return delivered;
}

module.exports = {
  TIME_ZONE,
  claimDueReminder,
  processDueReminder,
  processDueReminders,
  isInQuietHours,
};
