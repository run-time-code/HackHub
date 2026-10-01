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
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'change_me',
  logLevel: process.env.LOG_LEVEL || (env === 'production' ? 'info' : 'debug'),
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};

if ((base.isProd || base.isStaging) && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change_me')) {
  throw new Error('JWT_SECRET must be set to a strong value in staging/production');
}

module.exports = base;
