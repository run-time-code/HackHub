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

Every response carries `x-request-id` (reuses the incoming header when present).

### Config

Same variable names in every environment — only the values change.

| Var | Dev (local / compose) | Staging | Live |
|---|---|---|---|
| `NODE_ENV` | `development` | `staging` | `production` |
| `PORT` | `5000` | set by host (Render/Railway) | set by host |
| `MONGODB_URI` | `mongodb://localhost:27017/hackhub` (compose: `mongodb://mongo:27017/hackhub`) | Atlas staging cluster | Atlas live cluster |
| `REDIS_URL` | `redis://localhost:6379` (compose: `redis://redis:6379`) | hosted Redis staging | hosted Redis live |
| `JWT_SECRET` | dev value only | secret store | secret store (required, must differ from `change_me`) |
| `LOG_LEVEL` | `debug` | `info` | `info` |
| `CORS_ORIGIN` | `http://localhost:5173` | staging frontend URL | live frontend URL (comma-separated for more) |

### Docker

Production image:

```sh
docker build -t hackhub-api .
docker run --env-file .env -p 5000:5000 hackhub-api
```

Local stack (API with live reload + MongoDB + Redis):

```sh
cp .env.example .env   # first time only
docker compose up --build
```

This starts `api` (http://localhost:5000), `mongo` (localhost:27017),
and `redis` (localhost:6379). The API waits for healthy Mongo/Redis
before starting. Source is mounted, so edits under `src/` reload via nodemon.
`Ctrl+C` stops; data survives in the `mongo-data` / `redis-data` volumes
(`docker compose down -v` wipes them).

### Scripts

- `npm run dev` — nodemon reload
- `npm start` — production run

Health: `GET /health` and `GET /api/health`.

### Teams (`/teams`, also served under `/api/teams`)

- `POST /teams` (auth) — create a team for a hackathon; caller becomes leader.
- `GET /teams?hackathonId=<id>` (public) — list teams linked to one hackathon,
  with optional `status`, `page`, `limit`.
- `GET /teams/:id` (public) — one team.
- `PATCH /teams/:id` (auth, leader only) — edit `name`, `description`,
  `rolesNeeded`, `maxTeamSize`, `status`. `members`, `leader` and `hackathon`
  are immutable here; seats change through the join-request flow.
- `DELETE /teams/:id` (auth, leader only).

Auth accepts the login `accessToken` cookie or `Authorization: Bearer <token>`.
Responses follow the shared `{ success, data, requestId }` envelope.

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
