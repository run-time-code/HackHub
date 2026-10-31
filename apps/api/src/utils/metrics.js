'use strict';

const { timingSafeEqual } = require('node:crypto');
const config = require('../config');
const { getReminderMetrics } = require('./reminderMetrics');

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
  const reminders = getReminderMetrics();
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

  lines.push(
    '# HELP hackhub_reminder_scheduler_runs_total Reminder scheduler runs.',
    '# TYPE hackhub_reminder_scheduler_runs_total counter',
    `hackhub_reminder_scheduler_runs_total ${reminders.runsTotal}`,
    '# HELP hackhub_reminder_scheduler_errors_total Reminder scheduler runs that failed.',
    '# TYPE hackhub_reminder_scheduler_errors_total counter',
    `hackhub_reminder_scheduler_errors_total ${reminders.schedulerErrorsTotal}`,
    '# HELP hackhub_reminder_jobs_processed_total Reminder jobs claimed for processing.',
    '# TYPE hackhub_reminder_jobs_processed_total counter',
    `hackhub_reminder_jobs_processed_total ${reminders.jobsProcessedTotal}`,
    '# HELP hackhub_reminder_jobs_sent_total Reminder jobs delivered successfully.',
    '# TYPE hackhub_reminder_jobs_sent_total counter',
    `hackhub_reminder_jobs_sent_total ${reminders.jobsSentTotal}`,
    '# HELP hackhub_reminder_jobs_failed_total Reminder delivery attempts that failed.',
    '# TYPE hackhub_reminder_jobs_failed_total counter',
    `hackhub_reminder_jobs_failed_total ${reminders.jobsFailedTotal}`,
    '# HELP hackhub_reminder_jobs_deferred_total Reminder jobs deferred by quiet hours.',
    '# TYPE hackhub_reminder_jobs_deferred_total counter',
    `hackhub_reminder_jobs_deferred_total ${reminders.jobsDeferredTotal}`,
    '# HELP hackhub_reminder_scheduler_last_run_timestamp_seconds Unix timestamp of the last scheduler run.',
    '# TYPE hackhub_reminder_scheduler_last_run_timestamp_seconds gauge',
    `hackhub_reminder_scheduler_last_run_timestamp_seconds ${reminders.lastRunAt / 1000}`,
    '# HELP hackhub_reminder_scheduler_last_success_timestamp_seconds Unix timestamp of the last successful scheduler run.',
    '# TYPE hackhub_reminder_scheduler_last_success_timestamp_seconds gauge',
    `hackhub_reminder_scheduler_last_success_timestamp_seconds ${reminders.lastSuccessfulRunAt / 1000}`,
    '# HELP hackhub_reminder_scheduler_last_duration_ms Duration of the last scheduler run.',
    '# TYPE hackhub_reminder_scheduler_last_duration_ms gauge',
    `hackhub_reminder_scheduler_last_duration_ms ${reminders.lastRunDurationMs}`,
    '# HELP hackhub_reminder_scheduler_running Whether a scheduler run is in progress.',
    '# TYPE hackhub_reminder_scheduler_running gauge',
    `hackhub_reminder_scheduler_running ${reminders.running ? 1 : 0}`
  );

  return `${lines.join('\n')}\n`;
}

function serveMetrics(req, res) {
  if (!isAuthorized(req)) return res.status(404).end();

  res.type('text/plain; version=0.0.4; charset=utf-8').send(renderMetrics());
}

module.exports = { recordRequest, serveMetrics, renderMetrics };