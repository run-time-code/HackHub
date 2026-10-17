'use strict';

const { timingSafeEqual } = require('node:crypto');
const config = require('../config');

const requests = new Map();
const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']);

function recordRequest(req, res, next) {
  res.once('finish', () => {
    const method = METHODS.has(req.method) ? req.method : 'OTHER';
    const key = `${method} ${res.statusCode}`;
    requests.set(key, (requests.get(key) || 0) + 1);
  });
  next();
}

function isAuthorized(req) {
  const token = config.metricsToken;
  if (!token) return false;

  const supplied = Buffer.from(req.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${token}`);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function renderMetrics() {
  const memory = process.memoryUsage();
  const lines = [
    '# HELP hackhub_process_uptime_seconds Process uptime in seconds.',
    '# TYPE hackhub_process_uptime_seconds gauge',
    `hackhub_process_uptime_seconds ${process.uptime()}`,
    '# HELP hackhub_process_resident_memory_bytes Resident memory in bytes.',
    '# TYPE hackhub_process_resident_memory_bytes gauge',
    `hackhub_process_resident_memory_bytes ${memory.rss}`,
    '# HELP hackhub_http_requests_total Completed HTTP requests.',
    '# TYPE hackhub_http_requests_total counter',
  ];

  for (const [key, count] of requests) {
    const [method, status] = key.split(' ');
    lines.push(`hackhub_http_requests_total{method="${method}",status="${status}"} ${count}`);
  }

  return `${lines.join('\n')}\n`;
}

function serveMetrics(req, res) {
  if (!isAuthorized(req)) return res.status(404).end();

  res.type('text/plain; version=0.0.4; charset=utf-8').send(renderMetrics());
}

module.exports = { recordRequest, serveMetrics };