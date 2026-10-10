'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const pinoHttp = require('pino-http');
const Sentry = require('@sentry/node');

const config = require('./config');
const logger = require('./utils/logger');
const requestId = require('./middleware/requestId');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const metrics = require('./utils/metrics');
const routes = require('./routes');

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
  app.use(cors({ origin: config.corsOrigin }));
  app.use(cookieParser());
  app.use(express.json({ limit: '100kb' }));
  app.get('/metrics', metrics.serveMetrics);

  // Served at both /health and /api/health (frontend calls /api/*).
  app.use('/', routes);
  app.use('/api', routes);

  if (config.sentryDsn) Sentry.setupExpressErrorHandler(app);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
