# Monitoring and alerting (owner: Senthil Raja)

Three signals cover the live site: errors (Sentry), availability (uptime
checks) and capacity (Prometheus metrics + logs). All of them are already
wired into the app; this page lists the one-time setup and where each alert
goes.

## 1. Error tracking (Sentry)

| Surface | Where it is configured | What to set |
|---------|------------------------|-------------|
| API     | `apps/api/src/server.js` (`Sentry.init`) | Render env `SENTRY_DSN` |
| Web     | `apps/web/src/main.jsx` (`Sentry.init`) | Vercel/GitHub env `VITE_SENTRY_DSN` |

Create two projects in Sentry (Node/Express and React), one environment per
deployment stage (`staging`, `production`). The API sends no default PII.

Recommended alert rules, routed to the on-call email **and** the team Slack
channel:

1. **New issue** in either project — notify immediately.
2. **Error rate** above 5 events/min for 5 minutes in production.
3. **Crash-free sessions** below 99% for 30 minutes in the web project.
4. **Throughput drop** (API transactions) below 50% of the trailing week.

Verify by loading a route that throws in staging and confirming the event
appears with its `requestId` tag (the API logs include the same id).

## 2. Uptime monitoring

`.github/workflows/uptime.yml` runs every 10 minutes and checks:

- staging API `/health`
- production API `/health` and `/api/health`
- production frontend `/`

A failing check fails the workflow (GitHub emails the maintainers) and, when
`SLACK_WEBHOOK_URL` is configured, posts a message to Slack. Re-run it
manually with **Actions > Uptime checks > Run workflow**.

Add these repository secrets:

| Secret | Purpose |
|--------|---------|
| `STAGING_API_URL` | staging API base URL (no trailing slash) |
| `PRODUCTION_API_URL` | live API base URL (no trailing slash) |
| `PRODUCTION_FRONTEND_URL` | live frontend origin |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook for alerts (optional) |

For a hosted status page or SMS escalation, point an external monitor such
as Better Stack, UptimeRobot or Checkly at the same URLs. Use two regions
and alert after two consecutive failures to avoid flapping on free-tier
cold starts.

## 3. Metrics

`GET /metrics` exposes Prometheus text format:

- `hackhub_process_uptime_seconds`
- `hackhub_process_resident_memory_bytes`
- `hackhub_http_requests_total{method,status}`
- `hackhub_reminder_scheduler_runs_total`,
  `hackhub_reminder_scheduler_last_run_timestamp_seconds`,
  `hackhub_reminder_scheduler_last_success_timestamp_seconds`,
  `hackhub_reminder_scheduler_last_duration_ms`, and
  `hackhub_reminder_scheduler_running`
- `hackhub_reminder_jobs_processed_total`, `hackhub_reminder_jobs_sent_total`,
  `hackhub_reminder_jobs_failed_total`,
  `hackhub_reminder_jobs_deferred_total`, and
  `hackhub_reminder_scheduler_errors_total`

The endpoint is hidden (404) unless `METRICS_TOKEN` is set, and requires
`Authorization: Bearer <token>`. Counters are per process and reset on
deploy/restart.

1. Set `METRICS_TOKEN` in the Render service (staging and production).
2. Configure a Prometheus/Alloy/Grafana Cloud scrape job with that bearer
   token, scraping every 30s.
3. Import `tools/monitoring/grafana-dashboard.json`. It charts request
   rate, 5xx ratio, process memory and uptime.
4. Alert when the 5xx ratio stays above 1% for five minutes or memory
   exceeds 80% of the instance limit.
5. Alert when the scheduler's last successful run is more than three minutes
   old, or reminder delivery failures increase for five minutes. Verify these
   alert rules and their notification routing in staging before production.

## 4. Logs

The API logs structured JSON (Pino) to stdout with `requestId`, method,
status and latency per request. Render keeps recent logs; for retention and
search, add a Render **log drain** to the team's central provider (Grafana
Loki, Datadog, Better Stack, etc.) and set a 30-day retention.

Useful searches:

- `"level":50` — server errors
- `"code":"JOIN_REQUEST_LIMIT"` — users hitting the daily request cap
- a `requestId` from a user report to see every log line for that request

## 5. What to watch after a release

For the first 30 minutes after a production deploy, check Sentry (new
issues), `/metrics` (5xx ratio), the uptime workflow and Render logs. If any
of them regress, follow the rollback section in
[production-operations.md](production-operations.md).
