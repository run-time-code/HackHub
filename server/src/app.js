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
const authRoutes = require('../routes/authRoutes');
const savedHackathonRoutes = require('../routes/savedHackathonRoutes');
const userRoutes = require('../routes/userRoutes');
const dashboardRoutes = require('../routes/dashboardRoutes');
const sanitizeMiddleware = require('../middleware/sanitizeMiddleware');
const auditMiddleware = require('../middleware/auditMiddleware');

require('../config/passport');

function createApp() {
  const app = express();

  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      customProps: (req) => ({ requestId: req.id }),
    })
  );
  app.use(metrics.recordRequest);
  app.use(helmet());
  app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  }));
  app.use(cookieParser());
  app.use(express.json({ limit: '100kb' }));
  app.use(sanitizeMiddleware);
  app.use(passport.initialize());
  app.use(auditMiddleware);
  app.get('/metrics', metrics.serveMetrics);

  app.use('/api/auth', authRoutes);
  app.use('/api/saved-hackathons', savedHackathonRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  // Served at both /health and /api/health (frontend calls /api/*).
  app.use('/', routes);
  app.use('/api', routes);

  if (config.sentryDsn) Sentry.setupExpressErrorHandler(app);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
