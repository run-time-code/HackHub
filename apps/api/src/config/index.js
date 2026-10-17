'use strict';

require('dotenv').config();

const env = process.env.NODE_ENV || 'development';

const base = {
  env,
  isDev: env === 'development',
  isStaging: env === 'staging',
  isProd: env === 'production',
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/hackhub',
  // F-16: Redis is declared nowhere and used nowhere (the SSE bus and rate
  // limits are in-process). Keep the field undefined so nothing reads a
  // stale REDIS_URL; deployment is single-instance by design.
  redisUrl: undefined,
  jwtSecret: process.env.JWT_SECRET || 'change_me',
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || '',
  logLevel: process.env.LOG_LEVEL || (env === 'production' ? 'info' : 'debug'),
  sentryDsn: process.env.SENTRY_DSN || '',
  metricsToken: process.env.METRICS_TOKEN || '',
  maxJoinRequestsPerDay: Number(process.env.MAX_JOIN_REQUESTS_PER_DAY || 10),
  corsOrigin: (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};

if ((base.isProd || base.isStaging) && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change_me')) {
  throw new Error('JWT_SECRET must be set to a strong value in staging/production');
}
if ((base.isProd || base.isStaging) && !base.accessTokenSecret) {
  throw new Error('ACCESS_TOKEN_SECRET must be set in staging/production');
}
if ((base.isProd || base.isStaging) && !process.env.CSRF_SECRET) {
  throw new Error('CSRF_SECRET must be set in staging/production');
}

module.exports = base;
