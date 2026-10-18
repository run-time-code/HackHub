# HackHub Backend

Backend API for **HackHub**, a platform that helps users discover and manage hackathons from different platforms in one place.

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- bcrypt
- Postman for API testing

## Features

### Authentication

- User registration
- User login
- Password hashing using bcrypt
- JWT-based authentication
- Protected API routes

### Reminders

- Create hackathon reminders
- View reminders
- Delete reminders
- Authentication required for reminder operations

### Saved Hackathons

- Save hackathons for later
- Access saved hackathons
- Manage saved hackathons through authenticated APIs

---

## API structure (`server/src/`)

Express backend skeleton — shared base for auth and hackathon data features.

### Layout

```text
server/
  src/
    server.js            # entrypoint: listen + graceful shutdown
    app.js               # createApp() factory (routes, middleware wiring)
    config/index.js      # per-env config (development / staging / production)
    routes/              # index.js aggregates; health.js = GET /health
    controllers/         # thin HTTP layer (req/res + status codes)
    services/            # business logic (controllers call services)
    models/              # Mongoose models (index.js re-exports)
    middleware/          # requestId, notFound, errorHandler
    utils/logger.js      # pino structured logger
  .env.example           # copy to .env for local dev (never commit .env)
```

Legacy flat files (`server/server.js`, `server/routes/*`, `server/controllers/*`, `server/models/*`) remain from the auth/reminder implementation and are still present after the merge.

### Layer rules

- Routes: URL + method only, no logic.
- Controllers: parse input, call one service, send one response, `next(err)` on failure.
- Services: business logic, throw `Error` with `.status` / `.code`.
- Models: Mongoose schemas only.

### Responses

Success: `{ "success": true, "data": {...}, "requestId": "..." }`
Error: `{ "success": false, "error": { "code": "...", "message": "..." }, "requestId": "..." }`

Every response carries `x-request-id` (client values accepted only when they
match `^[A-Za-z0-9_-]{8,64}$`; anything else is replaced with a UUID).

### Config

Same variable names in every environment — only the values change.

| Var | Dev (local / compose) | Staging | Live |
|---|---|---|---|
| `NODE_ENV` | `development` | `staging` | `production` |
| `PORT` | `5000` | set by host (Render/Railway) | set by host |
| `MONGODB_URI` | `mongodb://localhost:27017/hackhub` (compose: `mongodb://mongo:27017/hackhub`) | Atlas staging cluster | Atlas live cluster |
| `JWT_SECRET` | dev value only | secret store | secret store (required, must differ from `change_me`) |
| `LOG_LEVEL` | `debug` | `info` | `info` |
| `CORS_ORIGIN` | `http://localhost:5173` | staging frontend URL | live frontend URL (comma-separated for more) |
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

This starts `api` (http://localhost:5000), `mongo` (localhost:27017),
and `redis` (localhost:6379). The API waits for healthy Mongo/Redis
before starting. Source is mounted, so edits under `src/` reload via nodemon.
`Ctrl+C` stops; data survives in the `mongo-data` / `redis-data` volumes
(`docker compose down -v` wipes them).

### Scripts

- `npm run dev` — nodemon reload
- `npm start` — production run

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

### Teammate discovery (`GET /users/discover`, also under `/api/...`)

Login required. Finds users by `skills` (comma-separated, best match first),
`availability` and the `lookingForTeam` switch (defaults to `true`).

Privacy: only users who opted in (`discoverable`) are ever listed, and the
card exposes `id`, `name`, `skills`, `availability`, `lookingForTeam` and
`matchCount` only — no email, password or tokens.

### Staging

- Blueprint: `render.yaml` (API on Render, `develop` branch, health check `/health`).
- Pipeline: `.github/workflows/deploy-staging.yml` (push to `develop` triggers
  Render deploy, Vercel frontend deploy, then smoke checks).
- Runbook: `docs/staging.md`. Staging env template: `.env.staging.example`.
- Smoke: `STAGING_API_URL=https://<staging-api> npm run smoke:staging`.
