'use strict';

const jwt = require('jsonwebtoken');

const config = require('../config');

// Buckets the global rate limiter by identity, not just by IP.
//
// Keying the general API limiter on the client IP means every user behind one
// campus/office/CGNAT address shares a single bucket: at a few hundred users
// per NAT a perfectly legitimate browse session exhausts it and everyone gets
// 429s. This middleware verifies only the token *signature* (no database
// round-trip) and exposes the subject so the limiter can bucket per account.
// A forged token cannot produce a valid signature, so it cannot be used to
// escape into a private bucket; unauthenticated traffic still falls back to IP.
function verifySubject(token) {
  const secrets = [config.accessTokenSecret, config.jwtSecret].filter(
    (secret) => typeof secret === 'string' && secret.length > 0
  );

  for (const secret of secrets) {
    try {
      const payload = jwt.verify(token, secret);
      const id = String(payload.id || payload.sub || '');
      if (id) return id;
    } catch {
      // Try the next configured secret; the route-level auth reports the
      // failure if the token is genuinely invalid.
    }
  }

  return null;
}

function rateLimitIdentity(req, _res, next) {
  const header = req.headers.authorization;
  const token = typeof header === 'string' && header.startsWith('Bearer ')
    ? header.slice('Bearer '.length).trim()
    : req.cookies && req.cookies.accessToken;

  if (typeof token === 'string' && token) {
    const subject = verifySubject(token);
    if (subject) {
      req.user = { ...(req.user || {}), id: subject };
    }
  }

  next();
}

module.exports = rateLimitIdentity;
