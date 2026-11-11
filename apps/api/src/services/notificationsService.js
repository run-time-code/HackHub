'use strict';

const mongoose = require('mongoose');

const { Notification } = require('../models/notification');
const User = require('../../models/User');
const logger = require('../utils/logger');
const { publishNotification } = require('../utils/eventBus');
const { sendTeamEmail, sendReminderEmail } = require('../../utils/emailUtils');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function badRequest(message) {
  return { status: 400, code: 'VALIDATION_ERROR', message };
}

function notFound() {
  return { status: 404, code: 'NOTIFICATION_NOT_FOUND', message: 'Notification not found' };
}

function serialize(notification) {
  const obj = notification.toObject ? notification.toObject() : notification;
  return {
    id: String(obj._id || obj.id),
    type: obj.type,
    title: obj.title,
    message: obj.message || '',
    data: obj.data || {},
    read: Boolean(obj.read),
    readAt: obj.readAt || null,
    createdAt: obj.createdAt,
  };
}

// Email is best-effort: a missing provider key, unverified sender or an
// provider outage must never fail the API call that triggered it.
async function sendEmailBestEffort(userId, title, message) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    logger.debug({ userId }, 'email notification skipped (Resend not configured)');
    return;
  }
  try {
    const user = await User.findById(userId).select('email').lean();
    if (!user || !user.email) return;
    await sendTeamEmail(user.email, title, message);
  } catch (err) {
    logger.warn({ err, userId }, 'email notification failed');
  }
}

async function sendReminderEmailBestEffort(userId, reminderEmail) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    logger.debug({ userId }, 'reminder email skipped (Resend not configured)');
    return;
  }
  try {
    const user = await User.findById(userId).select('email').lean();
    if (!user || !user.email) return;
    await sendReminderEmail(user.email, reminderEmail);
  } catch (err) {
    logger.warn({ err, userId }, 'reminder email failed');
  }
}

async function createNotification({
  userId,
  type,
  title,
  message = '',
  data = {},
  email = true,
  reminderEmail = null,
  reminder = null,
}) {
  const notificationData = {
    user: userId,
    type,
    title,
    message,
    data,
  };
  if (reminder) notificationData.reminder = reminder;
  const notification = await Notification.create(notificationData);
  const payload = serialize(notification);
  publishNotification(userId, payload);
  if (email) {
    if (reminderEmail) {
      await sendReminderEmailBestEffort(userId, reminderEmail);
    } else {
      await sendEmailBestEffort(userId, title, message);
    }
  }
  return payload;
}

async function listNotifications(userId, query = {}) {
  const pageNum = Math.max(Number(query.page) || 1, 1);
  const limitNum = Math.min(Math.max(Number(query.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const filter = { user: userId };
  if (String(query.unreadOnly).toLowerCase() === 'true') {
    filter.read = false;
  }

  const [items, total, unread] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: userId, read: false }),
  ]);

  return { items: items.map(serialize), page: pageNum, limit: limitNum, total, unread };
}

function assertObjectId(value) {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw badRequest('notification id must be a valid id');
  }
}

async function markRead(userId, notificationId) {
  assertObjectId(notificationId);
  const notification = await Notification.findOne({ _id: notificationId, user: userId });
  if (!notification) {
    throw notFound();
  }
  if (!notification.read) {
    notification.read = true;
    notification.readAt = new Date();
    await notification.save();
  }
  return serialize(notification);
}

async function markAllRead(userId) {
  const result = await Notification.updateMany(
    { user: userId, read: false },
    { $set: { read: true, readAt: new Date() } }
  );
  return { updated: result.modifiedCount || 0 };
}

module.exports = {
  createNotification,
  listNotifications,
  markRead,
  markAllRead,
  serialize,
};
