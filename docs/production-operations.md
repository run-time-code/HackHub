# Production operations

## Release gate and deployment

The production workflow runs on pushes to `main` and manual dispatch. Before the first release, create a GitHub Environment named `production`, restrict it to `main`, and require an independent reviewer. The deployment job waits at that environment after backend tests and frontend lint/build pass.

Provision a dedicated Render API service from `apps/api/` on `main`, with automatic deploys disabled. Use a paid instance plan that supports zero-downtime deploys. Provision a separate production Atlas database and configure `MONGODB_URI`, `JWT_SECRET`, `ACCESS_TOKEN_SECRET`, `CSRF_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `CORS_ORIGIN`, `SENTRY_DSN`, and a random `METRICS_TOKEN` directly in Render. Do not copy staging credentials. OAuth credentials are optional; configure each provider's client ID, secret, and callback URL to enable it. Set the Vercel project production branch to `main`, attach the live domain, and disable provider-side automatic production deployment so the approval gate remains authoritative. (No Redis: rate limits and the SSE bus are in-process, single instance.)

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

Install k6 and run the scenarios against staging with a dedicated test account and representative, non-production data. Set `BASE_URL`, `BROWSE_PATH`, `SEARCH_PATH`, `LOGIN_PATH`, `LOGIN_EMAIL`, and `LOGIN_PASSWORD` in the environment, then run:

```sh
k6 run tools/loadtest/scenarios.js
```

The script runs browsing and search at five and three virtual users, and login at one virtual user for four minutes. Override the VU counts and duration with `BROWSE_VUS`, `SEARCH_VUS`, `LOGIN_VUS`, and `TEST_DURATION`. Supply `SEARCH_TOKEN` or `SEARCH_COOKIE` if the search route requires authentication. It fails when HTTP errors exceed 1% or p95 latency reaches one second.

Record p50/p95 latency, error rate, Render CPU/memory, MongoDB Atlas connections/queueing, and rate-limit responses. Increase the Render plan or Atlas tier only when those measurements identify saturation. Tune Mongoose `maxPoolSize`, server concurrency, and rate limits from measured peaks with headroom; rerun the same scenarios after each change. Do not run login load against real user accounts or production without explicit approval.

## Current readiness gap

The active `npm start` entry point connects MongoDB and mounts the auth, profile, dashboard, team, teammate-discovery, join-request/invitation, and notification routes together. The separate `apps/backend-prototype/` package contains hackathon browse/search handlers but is not installed or mounted by the active `apps/api/` deployment; integrating those packages is still required before approving a full live release. A successful health check alone does not verify hackathon discovery.