# Production operations

## Release gate and deployment

The production workflow runs on pushes to `main` and manual dispatch. Before the first release, create a GitHub Environment named `production`, restrict it to `main`, and require an independent reviewer. The deployment job waits at that environment after backend tests and frontend lint/build pass.

Provision a dedicated Render API service from `apps/api/` on `main`, with automatic deploys disabled. Use a paid instance plan that supports zero-downtime deploys. Provision a separate production Atlas database and configure `MONGODB_URI`, `JWT_SECRET`, `ACCESS_TOKEN_SECRET`, `CSRF_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `FRONTEND_URL`, `CORS_ORIGIN`, `SENTRY_DSN`, and a random `METRICS_TOKEN` directly in Render. Do not copy staging credentials. OAuth credentials are optional; configure each provider's client ID, secret, and callback URL to enable it. Set the Vercel project production branch to `main`, attach the live domain, and disable provider-side automatic production deployment so the approval gate remains authoritative. (No Redis: rate limits and the SSE bus are in-process, single instance.)

Add these secrets to the GitHub `production` environment:

| Secret | Purpose |
| --- | --- |
| `RENDER_API_KEY_PRODUCTION` | Triggers and polls the API deployment |
| `RENDER_SERVICE_ID_PRODUCTION` | Identifies the live API service |
| `PRODUCTION_API_URL` | API base URL, without `/api` |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | Builds and promotes the frontend |
| `SENTRY_DSN_FRONTEND` | Frontend error reporting DSN |

The workflow deploys the API, waits for `/health`, deploys the Vercel production build, then checks `/health` and `/api/health`. Render and Vercel provide HTTPS; configure the custom domain and DNS in those providers. Their edge networks serve the static frontend. Confirm the API CORS origin matches the final frontend domain.

## Monitoring and alerts

End-to-end setup (Sentry projects, scheduled uptime checks, Slack alerts,
log drain, metrics scrape and dashboard import) is in
[monitoring.md](monitoring.md).

Create separate Sentry projects for the browser and Node API. Set the frontend DSN as `SENTRY_DSN_FRONTEND` in the GitHub `staging` and `production` environments. Set the backend `SENTRY_DSN` in each Render service. Add Sentry alert rules for new issues and a sustained error-rate increase, and route notifications to the on-call email and team Slack channel.

Use an external uptime monitor for both the frontend root URL and API `/health`; alert by email and Slack on consecutive failures. The API emits structured Pino JSON to stdout, which Render retains. Configure a Render log drain to the team's central log provider and set retention there. `/metrics` exposes per-process uptime, resident memory, and request counts in Prometheus text format only when `METRICS_TOKEN` is configured; counters reset when an instance restarts. Configure the collector with `Authorization: Bearer <token>` and build a dashboard for those metrics. Keep the token in the collector's secret store.

## Backup and restore drill

Enable Atlas automated backups with a retention period that meets the recovery objective. Store periodic `mongodump` archives in encrypted object storage with restricted access; do not keep the only copy on the API host. Pause writers for the count comparison and run the repository drill against an isolated, non-production restore database with a distinct database name:

```sh
MONGODB_URI='...' \
RESTORE_MONGODB_URI='...' \
RESTORE_TARGET_CONFIRMATION=isolated-non-production \
BACKUP_DIR='/secure/backup/path' \
bash apps/api/scripts/backup-restore-drill.sh
```

The drill writes and hashes a compressed archive, restores into the target database, then compares collection names and document counts. Never point `RESTORE_MONGODB_URI` at production: the restore uses `--drop` on the target collections. Copy verified archives to encrypted off-host storage and record the drill date, checksum, operator, and restore duration. Repeat after schema migrations and on a regular schedule.

## Rollback

Before go-live, rehearse both rollback paths in staging and record the operator, steps, and recovery time. For an API regression, use Render's Deploys view to roll back to the last healthy release; check `/health` and the Sentry issue rate afterward. For a frontend regression, promote the last known-good Vercel deployment and verify the live domain. Keep the previous healthy API and frontend releases available until the new release passes smoke checks and a short observation window. Database migrations must remain backward compatible through that window; restore a database backup only for data corruption, not routine code rollback.

## Load and capacity review

Before load testing, capture MongoDB execution plans against a representative
staging dataset:

```sh
cd apps/api
npm run explain:catalogue
```

The command reports `executionTimeMillis`, keys/documents examined, returned
rows, and the winning plan for catalogue listing, filtering, sorting, and
facet aggregation. Use the actual plan to decide whether indexes or query
shapes need adjustment; do not infer a production latency target from a local
or in-memory database.

Install k6 and run the scenarios against staging with a dedicated test account and representative, non-production data. Set `BASE_URL`, `BROWSE_PATH`, `SEARCH_PATH`, `LOGIN_PATH`, `LOGIN_EMAIL`, and `LOGIN_PASSWORD` in the environment, then run:

```sh
k6 run tools/loadtest/scenarios.js
```

The script runs browsing and search at five and three virtual users, and login at one virtual user for four minutes. Override the VU counts and duration with `BROWSE_VUS`, `SEARCH_VUS`, `LOGIN_VUS`, and `TEST_DURATION`. Supply `SEARCH_TOKEN` or `SEARCH_COOKIE` if the search route requires authentication. It fails when HTTP errors exceed 1% or p95 latency reaches one second.

Record p50/p95 latency, error rate, Render CPU/memory, MongoDB Atlas connections/queueing, and rate-limit responses. Increase the Render plan or Atlas tier only when those measurements identify saturation. Tune Mongoose `maxPoolSize`, server concurrency, and rate limits from measured peaks with headroom; rerun the same scenarios after each change. Do not run login load against real user accounts or production without explicit approval.

## Current readiness gap

The active `npm start` entry point (`apps/api/src/server.js`) connects MongoDB
and mounts auth/profile/dashboard, saved-hackathon CRUD, calendar/reminders,
teams, teammate discovery, join requests/invitations, notifications, catalogue,
recommendations, and admin routes. Calendar, reminder, saved-hackathon, and
account-settings contracts are covered by
`apps/api/test/calendar-reminders-saved.test.js`.

Remaining work before a full live release:

- Provision staging and production using the secrets in [staging.md](staging.md),
  then run `apps/api/scripts/smoke-staging.js`, k6 scenarios, and a backup/restore
  drill. This repository contains procedures, but cannot create provider
  resources or supply credentials.
- The calendar/reminder and `/saved` APIs are now mounted in `apps/api`.
  Verify the complete sign-up → save → calendar → reminder delivery flow in
  staging with configured email and a test account.
- The public catalogue serves whatever is in the `Hackathon` collection;
  populate it with `tools/data-importer`. Automated scrapers are still
  planned. The importer no longer deactivates records absent from a fetch,
  because the provider response is not proven to be a complete snapshot.
- Run the documented k6 test in staging and record actual p50/p95 latency,
  error rate, and database/instance utilization. The one-second p95 target is
  a test threshold, not a result measured by this repository change.
- Configure and verify provider-side Sentry, uptime, metrics, and alert
  routing in staging and production.
- `/metrics` exposes reminder scheduler heartbeat, duration, and delivery
  counters. Configure and verify alerts for a stale heartbeat and increasing
  delivery failures.
- The heuristic recommendation score is implemented, but its scoring model
  needs product validation before being treated as an outcome predictor.
- `backend/` is an older, non-deployed implementation. Production remains
  `apps/api`; do not start both against the same collections without a
  migration plan.
