'use strict';

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const config = require('../config');
const User = require('../../models/User');

// Verifies the login session for the new API surface and attaches
// req.user = { id, email, role }.
//
// Accepts the httpOnly `accessToken` cookie issued by the login API as well
// as `Authorization: Bearer <token>`, verified against every configured
// secret so both token issuers keep working until auth is unified.
// Failures use the shared { success:false, error:{code,message} } envelope.
function extractToken(req) {
  const header = req.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }
  if (req.cookies && typeof req.cookies.accessToken === 'string') {
    return req.cookies.accessToken;
  }
  return null;
}

function secrets() {
  return [config.jwtSecret, process.env.ACCESS_TOKEN_SECRET].filter(
    (s) => typeof s === 'string' && s.length > 0
  );
}

async function requireAuth(req, _res, next) {
  const token = extractToken(req);
  if (!token) {
    return next({ status: 401, code: 'UNAUTHENTICATED', message: 'Authentication required' });
  }
  let payload;
  for (const secret of secrets()) {
    try {
      payload = jwt.verify(token, secret);
      break;
    } catch {
      // Try the next configured secret.
    }
  }
  if (!payload) {
    return next({ status: 401, code: 'UNAUTHENTICATED', message: 'Invalid or expired token' });
  }

  const id = String(payload.id || payload.sub || '');
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next({ status: 401, code: 'UNAUTHENTICATED', message: 'Invalid or expired token' });
  }

  try {
    const user = await User.findById(id).select('_id email role tokenVersion deletedAt banned');
    if (!user || user.deletedAt) {
      return next({ status: 401, code: 'UNAUTHENTICATED', message: 'Account not found or deactivated' });
    }
    if (user.banned) {
      return next({ status: 403, code: 'FORBIDDEN', message: 'Your account has been banned' });
    }
    if ((payload.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
      return next({ status: 401, code: 'UNAUTHENTICATED', message: 'Session revoked. Please log in again.' });
    }
    req.user = {
      id: String(user._id),
      email: user.email,
      role: user.role,
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = requireAuth;
