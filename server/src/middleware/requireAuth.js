'use strict';

const jwt = require('jsonwebtoken');

const config = require('../config');

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

function requireAuth(req, _res, next) {
  const token = extractToken(req);
  if (!token) {
    return next({ status: 401, code: 'UNAUTHENTICATED', message: 'Authentication required' });
  }
  for (const secret of secrets()) {
    try {
      const payload = jwt.verify(token, secret);
      req.user = {
        id: String(payload.id || payload.sub || ''),
        email: payload.email,
        role: payload.role,
      };
      if (!req.user.id) {
        break;
      }
      return next();
    } catch {
      // Try the next configured secret.
    }
  }
  return next({ status: 401, code: 'UNAUTHENTICATED', message: 'Invalid or expired token' });
}

module.exports = requireAuth;
