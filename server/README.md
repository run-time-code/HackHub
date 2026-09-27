# HackHub API (`server/`)

Express backend skeleton — Task 6.1.1 (Senthil Raja). Shared base for Berwin (auth) and Nandhini (hackathon data).

## Layout

```
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

## Layer rules

- Routes: URL + method only, no logic.
- Controllers: parse input, call one service, send one response, `next(err)` on failure.
- Services: business logic, throw `Error` with `.status` / `.code`.
- Models: Mongoose schemas only.

## Responses

Success: `{ "success": true, "data": {...}, "requestId": "..." }`
Error: `{ "success": false, "error": { "code": "...", "message": "..." }, "requestId": "..." }`

Every response carries `x-request-id` (reuses the incoming header when present).

## Config

| Var | Dev | Staging | Live |
|---|---|---|---|
| `NODE_ENV` | `development` | `staging` | `production` |
| `PORT` | `5000` | set by host | set by host |
| `MONGODB_URI` | local mongo | Atlas staging | Atlas live |
| `JWT_SECRET` | dev only | secret store | secret store (required, must differ from `change_me`) |
| `LOG_LEVEL` | `debug` | `info` | `info` |
| `CORS_ORIGIN` | `http://localhost:5173` | staging URL | live URL (comma-separated for more) |

## Scripts

- `npm run dev` — nodemon reload
- `npm start` — production run

Health: `GET /health` and `GET /api/health`.
