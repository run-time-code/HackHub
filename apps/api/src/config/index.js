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
  // Each API instance keeps its own pool. Keep instances x pool below the
  // cluster connection limit; the defaults suit a 2-4 instance deployment on
  // a small Atlas tier.
  mongoMaxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 50),
  mongoMinPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 0),
  // F-16: Redis is declared nowhere and used nowhere (the SSE bus and rate
  // limits are in-process). Keep the field undefined so nothing reads a
  // stale REDIS_URL; deployment is single-instance by design.
  redisUrl: undefined,
  jwtSecret: process.env.JWT_SECRET || 'change_me',
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || '',
  logLevel: process.env.LOG_LEVEL || (env === 'production' ? 'info' : 'debug'),
  sentryDsn: process.env.SENTRY_DSN || '',
  metricsToken: process.env.METRICS_TOKEN || '',
  // Local-development escape hatch: when Resend is unavailable, skip the
  // verification email and treat new accounts as verified. Never enable in
  // staging or production.
  devAutoVerify:
    env === 'development' && process.env.DEV_AUTO_VERIFY === 'true',
  maxJoinRequestsPerDay: Number(process.env.MAX_JOIN_REQUESTS_PER_DAY || 10),
  // Ranked teammate discovery scores at most this many recent candidates so a
  // broad skill filter cannot turn one request into a full-collection scan.
  // 0 means unbounded (not recommended in production).
  discoveryMaxCandidates: Number(process.env.DISCOVERY_MAX_CANDIDATES || 2000),
  // Public landing counters are cached briefly; they are global numbers that
  // do not need to be live to the second.
  statsCacheTtlMs: Number(process.env.STATS_CACHE_TTL_MS ?? 30000),
  // Run reminder/purge/scraper crons on this instance. Set false on web
  // instances that sit behind a load balancer and keep one worker process.
  runBackgroundJobs: process.env.RUN_BACKGROUND_JOBS !== 'false',
  corsOrigin: (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  // Daily hackathon catalogue scraping. Disabled unless explicitly enabled so
  // local servers and read-only deployments never call third-party sites.
  scrapers: {
    enabled: process.env.SCRAPER_ENABLED === 'true',
    cron: process.env.SCRAPER_CRON || '30 2 * * *',
    timezone: process.env.SCRAPER_TIMEZONE || 'Asia/Kolkata',
    userAgent: process.env.SCRAPER_USER_AGENT
      || 'HackHubBot/1.0 (+https://github.com/run-time-code/HackHub; hackathon catalogue aggregation)',
    timeoutMs: Number(process.env.SCRAPER_TIMEOUT_MS || 20000),
    maxPagesPerSource: Number(process.env.SCRAPER_MAX_PAGES || 10),
    sources: (process.env.SCRAPER_SOURCES || '')
      .split(',')
      .map((source) => source.trim().toLowerCase())
      .filter(Boolean),
    serpApiKey: process.env.SERPAPI_KEY || '',
    searchQueries: (process.env.SCRAPER_SEARCH_QUERIES || '')
      .split('|')
      .map((query) => query.trim())
      .filter(Boolean),
  },
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
