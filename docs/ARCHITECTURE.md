# Architecture

## Overview

HackHub is a **Turborepo + npm workspaces monorepo**: a React 19 "field guide"
web app backed by an Express API and MongoDB. A Python importer feeds the
hackathon catalogue; scheduled scrapers are still planned.

```
 [tools/data-importer] ──┐
 [scrapers (planned)] ───┴──> [Express API — apps/api] <──> [MongoDB Atlas]
                                     ▲
                                     │  HTTPS, cookies + CSRF, credentialed CORS
                            [React web app — apps/web]
                            /auth panels · /app sections
```

## Monorepo layout

| Path | Purpose |
|---|---|
| `apps/web` | React 19 + Vite frontend (`@hackhub/web`) |
| `apps/api` | Express API (`@hackhub/api`), deployed to Render |
| `apps/backend-prototype` | Exploratory prototypes; **not** installed or deployed |
| `tools/data-importer` | Python importer for the hackathon catalogue |
| `tools/loadtest` | k6 load scenarios |
| `tools/monitoring` | Grafana dashboard JSON |
| `docs` | Architecture, API spec, staging, monitoring, operations |

## Frontend (`apps/web`)

- React 19 + Vite, Tailwind CSS v4, `react-router-dom`, `react-hook-form` + `zod`.
- **Routing** (`src/App.jsx`): auth panels share `/auth?panel=login|register|forgot|reset|verify`;
  the WA3 product routes are `/dashboard`, `/discover`, `/calendar`,
  `/teammates`, `/teams`, `/requests`, `/profile` and `/settings`, all inside
  the protected app shell. The older `/app?section=…` workspace remains
  available during migration; legacy auth URLs redirect to the matching panel.
- **Session state**: `context/AuthContext.jsx` restores the session from
  httpOnly cookies on load, listens for the `auth:unauthorized` event, and
  exposes `login`/`logout`/`refreshSession` through `context/auth-context.js`.
- **API clients**: `lib/api/http.js` is the shared client for WA3 (cookie +
  CSRF, refresh-once-and-replay, unauthorized event, envelope unwrapping) and
  powers teams, discovery, notifications, catalogue, calendar, reminders and
  account calls. `lib/api/request.js` remains the auth/session client.
- **UI states**: API-dependent screens render loading, error and genuine empty
  states — never mock data.
- Sentry is optional via `VITE_SENTRY_DSN` (`src/main.jsx`).

## Backend (`apps/api`)

- **Entrypoint**: `src/server.js` (`npm start`) connects MongoDB, initializes
  Sentry when configured, then builds the app with `createApp()` (`src/app.js`)
  and handles graceful shutdown. `apps/api/server.js` at the package root is a
  legacy duplicate and is not used by `npm start`, Docker or Render.
- **Mounted routers** (single process, paths served under `/api`):
  - `src/routes`: `/health`, `/teams`, `/team-requests`, `/users`, `/notifications`, `/hackathons`, `/stats`, `/feedback`, `/calendar`, `/reminders`, `/saved`
  - flat legacy routers: `/auth`, `/users`, `/saved-hackathons`, `/dashboard/summary`, `/admin/{hackathons,users,reports}`. The `/users/me/*` account aliases bridge the WA3 settings page to the legacy controller.
- **Security**: helmet, credentialed CORS restricted to `FRONTEND_URL`/`CORS_ORIGIN`,
  request sanitization, rate limits (login, register, OAuth start, resets,
  team writes, join requests), audit logging, trust proxy for Render.
- **Background work**: nightly cron purges soft-deleted accounts past the
  retention window. Notifications fan out over an in-process event bus (SSE) —
  a multi-instance deployment would need a shared bus (Redis is intentionally
  absent).
- **Observability**: `requestId` on every response plus Pino JSON request logs,
  `GET /metrics` (Prometheus, bearer `METRICS_TOKEN`), Sentry (optional),
  `/health` + `/api/health`.

## Auth flow

1. Email/password: `POST /auth/register` → verification email → `GET /auth/verify-email`
   → `POST /auth/login` sets httpOnly `accessToken`/`refreshToken` cookies.
2. Every mutation bootstraps a CSRF token from `GET /auth/csrf-token` and sends
   it back as `X-CSRF-Token` (double-submit cookie).
3. Access tokens expire after 15 minutes; `POST /auth/refresh` rotates them, and
   the web client replays a single 401 request after a successful refresh.
4. OAuth: same-window navigation to `GET /auth/google` or `/auth/github`
   (signed `state` cookie), provider callback, then a redirect to
   `${FRONTEND_URL}/?oauth=...` which the SPA exchanges for a session.
5. API clients may still use `Authorization: Bearer <accessToken>`.

## Data model (Mongoose)

| Model | Key fields |
|---|---|
| `User` | name, email, password (hashed, `select: false`), googleId/githubId (sparse unique), role, banned + lockout fields, bio/college/location, skills, preferences, avatarUrl, availability, lookingForTeam, discoverable, emailVerified + verification/reset token hashes, deletedAt (soft delete), `tokenVersion` |
| `Hackathon` | `hackathon_id` slug (unique), title, `registration_deadline` (string), optional `submission_deadline`, description/organizer/mode/location/url, prizes, skills/domain tags, event dates, is_active, is_hidden, is_featured |
| `SavedHackathon` | user, hackathon slug, status `saved/registered/ongoing/completed`, private notes, timestamps |
| `Registration` | user, hackathon slug, registered, notes |
| `Reminder` | user, hackathon ObjectId, event type `registration/submission/event`, daysBefore, channel `email/in_app`, remindAt, active, timestamps; unique per user/hackathon/event/lead-time/channel |
| `Team` | name, description, hackathon (ObjectId), leader, members `[{ user, role, joinedAt }]`, rolesNeeded, maxTeamSize (2–10), status `open/closed` |
| `JoinRequest` | team, user, type `request/invite`, initiatedBy, role, message, status `pending → accepted/declined/cancelled/expired`, 7-day TTL |
| `Notification` | user, type, title, message, data, read/readAt |
| `AuditLog` | event, userId, email, success, statusCode, ip, userAgent, details |

Hackathons are referenced **by ObjectId** in teams and **by slug**
(`hackathon_id`) in saved/registration records; the public catalogue exposes
both (`id` and `slug`) so clients never guess.

## Testing and CI

- `apps/web`: Vitest for API client/validation logic, ESLint, `vite build`.
- `apps/api`: `node --test` suites plus ESLint.
- `.github/workflows/ci.yml` runs frontend (lint/test/build), backend
  (lint/test) and Gitleaks on PRs and pushes to `main`/`develop`.

## Deployment

- **API**: Render web service built from `apps/api/Dockerfile` via `render.yaml`
  (staging on `develop`, production on `main`). See [staging.md](staging.md) and
  [production-operations.md](production-operations.md).
- **Web**: Vercel builds `apps/web` from the repo root (`vercel.json`);
  Netlify config is kept as a fallback.
- **Database**: MongoDB Atlas (separate staging and production clusters).
- **Monitoring**: [monitoring.md](monitoring.md).

## Planned / known gaps

- Hackathon scrapers and richer catalogue facets.
- The Worth Score service ([WORTH_SCORE.md](WORTH_SCORE.md)).
- Optional ICS calendar export.
- Live staging/production provisioning and verification with provider secrets.
