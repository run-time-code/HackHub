'use strict';

const Feedback = require('../models/feedback');

const TYPES = ['general', 'bug', 'feature', 'content'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function badRequest(message) {
  return { status: 400, code: 'VALIDATION_ERROR', message };
}

function optionalText(value, name, maxLength) {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value !== 'string') {
    throw badRequest(`${name} must be a string`);
  }
  const text = value.trim();
  if (text.length > maxLength) {
    throw badRequest(`${name} must be at most ${maxLength} characters`);
  }
  return text;
}

async function create(req, res, next) {
  try {
    const body = req.body || {};
    const type = body.type === undefined ? 'general' : body.type;

    if (!TYPES.includes(type)) {
      throw badRequest(`type must be one of: ${TYPES.join(', ')}`);
    }

    if (typeof body.message !== 'string') {
      throw badRequest('message is required');
    }
    const message = body.message.trim();
    if (message.length < 5 || message.length > 2000) {
      throw badRequest('message must be between 5 and 2000 characters');
    }

    const page = optionalText(body.page, 'page', 300);
    const email = optionalText(body.email, 'email', 200);
    if (email && !EMAIL_PATTERN.test(email)) {
      throw badRequest('email must be a valid email address');
    }

    const feedback = await Feedback.create({
      user: req.user && req.user.id ? req.user.id : undefined,
      type,
      message,
      page,
      email,
      userAgent: String(req.get('user-agent') || '').slice(0, 300),
    });

    res.status(201).json({
      success: true,
      data: { id: String(feedback._id), createdAt: feedback.createdAt },
      requestId: req.id,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { create };
