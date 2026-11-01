
'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('passport');
const Sentry = require('@sentry/node');
const rateLimit = require('express-rate-limit');
const rateLimitIdentity = require('./middleware/rateLimitIdentity');

const config = require('./config');
const { createHttpLogger } = require('./middleware/httpLogger');
const requestId = require('./middleware/requestId');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const metrics = require('./utils/metrics');
const routes = require('./routes');
const sanitizeMiddleware = require('../middleware/sanitizeMiddleware');
const auditMiddleware = require('../middleware/auditMiddleware');

require('../config/passport');

// Legacy feature routers mounted by the production API entrypoint.
const legacyAuthRoutes = require('../routes/authRoutes');
const legacySavedHackathonRoutes = require('../routes/savedHackathonRoutes');
const legacyUserRoutes = require('../routes/userRoutes');
const legacyDashboardRoutes = require('../routes/dashboardRoutes');

// Admin routers.
const { doubleCsrfProtection } = require('../middleware/csrfMiddleware');
const adminHackathonRoutes = require('../routes/adminHackathonRoutes');
const adminUserRoutes = require('../routes/adminUserRoutes');
const adminReportRoutes = require('../routes/adminReportRoutes');
const adminScraperRoutes = require('../routes/adminScraperRoutes');

// General API protection against excessive request rates.
//
// Bucketing by IP alone means every user behind one NAT shares a bucket; with
// 500k users that is a permanent source of false 429s. rateLimitIdentity
// attaches the signed-in account id first, so authenticated traffic is limited
// per user and only anonymous traffic is limited per IP.
const apiLimiter = rateLimit({
  windowMs: config.apiRateLimit.windowMs,
  limit: (req) => (req.user && req.user.id
    ? config.apiRateLimit.perUser
    : config.apiRateLimit.perIp),
  keyGenerator: (req) => (req.user && req.user.id
    ? `user:${req.user.id}`
    : rateLimit.ipKeyGenerator(req.ip)),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many requests. Please try again later.',
  },
  skip: (req) =>
    req.path === '/health' ||
    req.path === '/api/health' ||
    req.path === '/metrics',
});

function createApp() {
  const app = express();

  // Trust the production proxy so client IP-based protections work.
  app.set('trust proxy', 1);

  app.use(requestId);

  app.use(createHttpLogger());

  app.use(metrics.recordRequest);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-CSRF-Token',
      ],
    })
  );

  app.use(
    cookieParser(process.env.COOKIE_SECRET || config.jwtSecret)
  );

  app.use(express.json({ limit: '100kb' }));
  app.use(sanitizeMiddleware);
  app.use(passport.initialize());
  app.use(auditMiddleware);

  app.get('/metrics', metrics.serveMetrics);

  // Identify the account (signature check only) before bucketing requests.
  app.use(rateLimitIdentity);

  // Apply the global limiter once, before every API mount. Mounting it only
  // on '/api' left the duplicate root-mounted read routes (app.use('/', ...))
  // unprotected.
  app.use(apiLimiter);

  // Health and other src routes are available at both paths.
  app.use('/', routes);
  app.use('/api', routes);

  // Legacy feature routes.
  app.use('/api/auth', legacyAuthRoutes);
  app.use('/api/saved-hackathons', legacySavedHackathonRoutes);
  app.use('/api/users', legacyUserRoutes);
  app.use('/api/dashboard', legacyDashboardRoutes);

  // Admin routes with CSRF protection.
  app.use(
    '/api/admin/hackathons',
    doubleCsrfProtection,
    adminHackathonRoutes
  );

  app.use(
    '/api/admin/users',
    doubleCsrfProtection,
    adminUserRoutes
  );

  app.use(
    '/api/admin/reports',
    doubleCsrfProtection,
    adminReportRoutes
  );

  app.use(
    '/api/admin/scrapers',
    doubleCsrfProtection,
    adminScraperRoutes
  );

  if (config.sentryDsn) {
    Sentry.setupExpressErrorHandler(app);
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
