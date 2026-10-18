# HackHub API (`@hackhub/api`)

Backend API for **HackHub**, a platform that helps users discover and manage
hackathons from different platforms in one place.

## Tech stack

- Node.js + Express.js
- MongoDB + Mongoose
- Cookie sessions: short-lived `accessToken` + rotating `refreshToken` (httpOnly cookies); bcrypt password hashing
- Double-submit CSRF protection on every mutation
- Passport strategies for Google and GitHub OAuth
- helmet, rate limits, request sanitization, audit logging
- Pino structured logs, Prometheus `/metrics`, Sentry (optional)

## Features

- **Authentication** — register/login/logout, access-token rotation via
  `/auth/refresh`, CSRF bootstrap, email verification, password reset,
  Google/GitHub OAuth, session restore (`/auth/me`, `/users/me`).
- **Profiles & onboarding** — skills/interests, discoverability, password
  change, session revocation, data export, soft-delete with a purge job.
- **Saved hackathons & dashboard** — save/unsave/register/notes by slug plus a
  dashboard summary.
- **Teams** — create/join/leave, leadership transfer, join requests and
  invitations, teammate discovery.
- **Notifications** — in-app inbox with an SSE stream and best-effort email.
- **Admin** — hackathon visibility/featured edits, user bans, reports.

Planned (not implemented): calendar & reminder persistence, hackathon facets
and the Worth Score endpoints. See [docs/API_SPEC.md](../../docs/API_SPEC.md)
for the full endpoint reference and the frontend's provisional assumptions.

## API structure (`apps/api/`)

The production entrypoint is `src/server.js` (`npm start`), which builds the
app via `src/app.js` (`createApp()`). It mounts the newer `src/` routers and
the flat legacy routers under `/api`, so one process serves every feature. The
old root `server.js` is a legacy duplicate and is not used by `npm start`,
Docker, or Render.

### Layout

```text
apps/api/
  src/
    server.js            # entrypoint: Mongo connect + graceful shutdown + Sentry + purge cron
    app.js               # createApp() factory (security, logging, router mounts)
    config/index.js      # per-env config (development / staging / production)
    routes/              # index.js: /health /teams /team-requests /users /notifications /hackathons
    controllers/         # thin HTTP layer (req/res + status codes)
    services/            # business logic (controllers call services)
    models/              # Team, JoinRequest, Notification
    middleware/          # requestId, notFound, errorHandler
    utils/logger.js      # pino structured logger
  routes/                # flat routers, mounted at /api:
                         #   auth, users, saved-hackathons, dashboard, admin/{hackathons,users,reports}
  controllers/           # auth, user, dashboard, hackathon tracking, admin, oauth
  models/                # User, Hackathon, Registration, SavedHackathon, AuditLog
  middleware/            # auth, CSRF, rate limits, sanitize, audit, upload
  .env.example           # copy to .env for local dev (never commit .env)
```

### Layer rules

- Routes: URL + method only, no logic.
- Controllers: parse input, call one service, send one response, `next(err)` on failure.
- Services: business logic, throw `Error` with `.status` / `.code`.
- Models: Mongoose schemas only.

### Responses

Success: `{ "success": true, "data": {...}, "requestId": "..." }`
Error: `{ "success": false, "error": { "code": "...", "message": "..." }, "requestId": "..." }`

Every response carries `x-request-id` (client values accepted only when they
match `^[A-Za-z0-9_-]{8,64}$`; anything else is replaced with a UUID). Legacy
auth/profile routers use a plain `{ message, data }` shape.

### Auth (`/api/auth`)

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/csrf-token` | CSRF bootstrap; mutations send the token back as `X-CSRF-Token` |
| POST | `/register` | `{ name, email, password }`; sends a verification email |
| POST | `/login` | `{ email, password }`; sets session cookies and returns `user` |
| POST | `/refresh` | Rotates the access token after its 15-minute expiry |
| POST | `/logout` | Clears the session cookies |
| GET | `/verify-email?token=` | Verifies an email address |
| POST | `/resend-verification` | Re-sends the verification link |
| POST | `/forgot-password` / `/reset-password` | Password reset flow |
| GET | `/me` | Session restore (mirrors `/users/me`) |
| GET | `/google`, `/github` | Same-window OAuth start; callbacks redirect to `FRONTEND_URL/?oauth=...` |

### Saved hackathons & dashboard

| Method | Endpoint | Notes |
|---|---|---|
| POST | `/saved-hackathons/save` · `/unsave` · `/register` · `/notes` | Tracking mutations (`{ hackathon }` slug) |
| GET | `/saved-hackathons/status/:hackathon` | Status by slug |
| GET | `/dashboard/summary` | Personal dashboard counts |

### Admin (`/api/admin/*`, admin role + CSRF)

`PATCH /hackathons/:hackathon_id/visibility`, `PATCH /hackathons/:hackathon_id/featured`,
`PATCH /hackathons/:hackathon_id`, `PATCH /users/:userId/ban`, `PATCH /users/:userId/unban`,
`GET /reports`.

### Config

Same variable names in every environment — only the values change.

| Var | Dev (local / compose) | Staging | Live |
|---|---|---|---|
| `NODE_ENV` | `development` | `staging` | `production` |
| `PORT` | `5000` | set by host (Render/Railway) | set by host |
| `MONGODB_URI` | `mongodb://localhost:27017/hackhub` (compose: `mongodb://mongo:27017/hackhub`) | Atlas staging cluster | Atlas live cluster |
| `JWT_SECRET` | dev value only | secret store | secret store (required, must differ from `change_me`) |
| `ACCESS_TOKEN_SECRET` | dev value only | secret store | secret store |
| `CSRF_SECRET` | dev value only | secret store | secret store |
| `FRONTEND_URL` / `CORS_ORIGIN` | `http://localhost:5173` | staging frontend URL | live frontend URL (comma-separated for more) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional | optional | optional (enables Google sign-in) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | optional | optional | optional (enables GitHub sign-in) |
| `RESEND_API_KEY` / `EMAIL_FROM` | optional | optional | optional (enables email) |
| `SENTRY_DSN` | empty (disabled) | backend Sentry DSN | backend Sentry DSN |
| `LOG_LEVEL` | `debug` | `info` | `info` |
| `METRICS_TOKEN` | empty (`/metrics` hidden) | random scrape token | random scrape token |
| `MAX_JOIN_REQUESTS_PER_DAY` | `10` | `10` | `10` |

### Docker

Production image (build context is the repository root):

```sh
docker build -f apps/api/Dockerfile -t hackhub-api .
docker run --env-file apps/api/.env -p 5000:5000 hackhub-api
```

Local stack (API with live reload + MongoDB):

```sh
cp apps/api/.env.example apps/api/.env   # first time only
docker compose -f apps/api/docker-compose.yml up --build
```

This starts `api` (http://localhost:5000) and `mongo` (localhost:27017)
with the source mounted for nodemon reload. `Ctrl+C` stops; data survives in
the `mongo-data` volume (`docker compose down -v` wipes it).

### Scripts

- `npm run dev` — nodemon reload
- `npm start` — production run (`src/server.js`)
- `npm run lint` / `npm test` — ESLint, `node --test`
- `npm run smoke:staging` — staging smoke checks

Health: `GET /health` and `GET /api/health` (`503` + `degraded` when Mongo is down).

### Monitoring

- `SENTRY_DSN` enables backend error reporting; `VITE_SENTRY_DSN` does the
  same for the web app.
- `GET /metrics` (Prometheus text format) requires
  `Authorization: Bearer $METRICS_TOKEN` and is hidden when unset.
- Sentry projects, uptime checks, log drain and the Grafana dashboard are
  documented in [docs/monitoring.md](../../docs/monitoring.md).

### Teams (`/teams`, also served under `/api/teams`)

- `POST /teams` (auth) — create a team for a hackathon; caller becomes leader.
- `GET /teams?hackathonId=<id>` (public) — list teams linked to one hackathon,
  with optional `status`, `page`, `limit`.
- `GET /teams/:id` (public) — one team.
- `PATCH /teams/:id` (auth, leader only) — edit `name`, `description`,
  `rolesNeeded`, `maxTeamSize`, `status`. `members`, `leader` and `hackathon`
  are immutable here; seats change through the join-request flow.
- `DELETE /teams/:id` (auth, leader only).
- `DELETE /teams/:id/members/:userId` (auth) — self-leave or leader-removal;
  a freed seat reopens a closed team; the leader cannot leave without
  transferring first (`MEMBER_NOT_FOUND` for unknown members).

Auth accepts the login `accessToken` cookie or `Authorization: Bearer <token>`.
Responses follow the shared `{ success, data, requestId }` envelope.

### Join requests and invitations

- `POST /teams/:id/requests` (auth) — ask to join. One pending row per
  team/user, no self-requests, no requests to closed or full teams, and a
  rolling 24h cap of `MAX_JOIN_REQUESTS_PER_DAY` (default 10).
- `POST /teams/:id/invitations` (leader) — invite a user by id.
- `GET /teams/:id/requests?type=request|invite` (leader) — pending queue.
- `GET /team-requests/mine?status=pending` (auth) — my requests and
  invitations.
- `PATCH /team-requests/:id` `{ action: "accept" | "decline" }` — leader
  answers requests, invitee answers invitations.
- `DELETE /team-requests/:id` — cancel a pending row.

States: `pending → accepted | declined | cancelled | expired` (7-day TTL).
Accepting into the last seat closes the team and cancels the rest of the
queue. `PATCH /teams/:id/leader { userId }` transfers leadership to an
existing member (the outgoing leader becomes a member).

### Notifications

- `GET /notifications?unreadOnly=true` — newest first, with `unread` count.
  This is also the polling fallback.
- `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`.
- `GET /notifications/stream` — Server-Sent Events; emits
  `event: notification` with the same payload. EventSource must send the
  session cookie (`withCredentials: true` cross-origin). Delivery is
  in-process, so a multi-instance deployment needs a shared bus.
- Email nudges for important team events (request, invitation, accepted,
  declined, team full, leader change) are best-effort: no `RESEND_API_KEY`
  means no email, never a failed request.

### Hackathons (`GET /hackathons`, also under `/api/...`)

Public catalogue used by the team feature and the discovery screen:
`GET /hackathons?q=&page=&limit=` (search + pagination) and
`GET /hackathons/:id` (ObjectId **or** slug). Catalogue rows come from the
`Hackathon` collection; import data with `tools/data-importer`.

### Teammate discovery (`GET /users/discover`, also under `/api/...`)

Login required. Finds users by `skills` (comma-separated, best match first),
`availability` and the `lookingForTeam` switch (defaults to `true`).

Privacy: only users who opted in (`discoverable`) are ever listed, and the
card exposes `id`, `name`, `skills`, `availability`, `lookingForTeam` and
`matchCount` only — no email, password or tokens.

### Frontend integration

The web app (`apps/web`) talks to this API with credentialed requests:

- CORS must include the web origin in `FRONTEND_URL`/`CORS_ORIGIN`.
- Mutations send `X-CSRF-Token` obtained from `GET /api/auth/csrf-token`.
- OAuth sign-in uses same-window navigation to `/api/auth/google` and
  `/api/auth/github`; callbacks redirect to `${FRONTEND_URL}/?oauth=...`.
- Session tokens live in httpOnly cookies — the SPA keeps only `user` state
  in memory.

The frontend's provisional assumptions (calendar/reminders persistence and the
`/saved` vs `/saved-hackathons/*` naming) are tracked in
[docs/API_SPEC.md](../../docs/API_SPEC.md).

### Staging

- Blueprint: `render.yaml` (API on Render, `develop` branch, health check `/health`).
- Pipeline: `.github/workflows/deploy-staging.yml` (push to `develop` triggers
  Render deploy, Vercel frontend deploy, then smoke checks).
- Runbook: `docs/staging.md`. Staging env template: `.env.staging.example`.
- Smoke: `STAGING_API_URL=https://<staging-api> npm run smoke:staging`.
