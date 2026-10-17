'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('passport');
const pinoHttp = require('pino-http');
const Sentry = require('@sentry/node');

const config = require('./config');
const logger = require('./utils/logger');
const requestId = require('./middleware/requestId');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const metrics = require('./utils/metrics');
const routes = require('./routes');
const sanitizeMiddleware = require('../middleware/sanitizeMiddleware');
const auditMiddleware = require('../middleware/auditMiddleware');

require('../config/passport');

// Legacy (flat) feature routers: this is where the auth API (register,
// login, OAuth, CSRF), user profiles, saved hackathons and dashboards
// still live. They are mounted on the production entrypoint (src/server.js)
// so `npm start`, the Dockerfile and Render actually serve them.
const legacyAuthRoutes = require('../routes/authRoutes');
const legacySavedHackathonRoutes = require('../routes/savedHackathonRoutes');
const legacyUserRoutes = require('../routes/userRoutes');
const legacyDashboardRoutes = require('../routes/dashboardRoutes');

function createApp() {
  const app = express();

  // Behind Render's proxy, req.ip must come from X-Forwarded-For —
  // otherwise rate limiting, CSRF binding and audit logs see the proxy
  // IP for every user (and the login limiter becomes a global bucket).
  app.set('trust proxy', 1);

  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      customProps: (req) => ({ requestId: req.id }),
    })
  );
  app.use(metrics.recordRequest);
  app.use(
    helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })
  );
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    })
  );
  app.use(cookieParser(process.env.COOKIE_SECRET || config.jwtSecret));
  app.use(express.json({ limit: '100kb' }));
  app.use(sanitizeMiddleware);
  app.use(passport.initialize());
  app.use(auditMiddleware);
  app.get('/metrics', metrics.serveMetrics);

  // Served at both /health and /api/health (frontend calls /api/*).
  app.use('/', routes);
  app.use('/api', routes);

  // Legacy routers. Mounted after the src routers; there are no path
  // overlaps (src's /users only defines /discover).
  app.use('/api/auth', legacyAuthRoutes);
  app.use('/api/saved-hackathons', legacySavedHackathonRoutes);
  app.use('/api/users', legacyUserRoutes);
  app.use('/api/dashboard', legacyDashboardRoutes);

  if (config.sentryDsn) Sentry.setupExpressErrorHandler(app);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
