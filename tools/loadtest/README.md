# Load testing (k6)

Scenarios for the three hot paths agreed with Deva: browsing, searching and
login. The script is intentionally configuration-driven so the same file
runs against staging after each release.

## Install

```sh
# macOS
brew install k6
# Debian/Ubuntu: see https://grafana.com/docs/k6/latest/set-up/install-k6/
```

## Run against staging

Use a dedicated test account and non-production data.

```sh
BASE_URL=https://hackhub-api-staging.onrender.com \
BROWSE_PATH='/api/hackathons?page=1&limit=20' \
SEARCH_PATH='/api/hackathons?q=ai&skills=react' \
LOGIN_PATH='/api/auth/login' \
LOGIN_EMAIL='loadtest@example.com' \
LOGIN_PASSWORD='<test-account-password>' \
k6 run tools/loadtest/scenarios.js
```

Overrides:

| Variable | Default | Purpose |
|----------|---------|---------|
| `BROWSE_VUS` | `5` | virtual users browsing |
| `SEARCH_VUS` | `3` | virtual users searching |
| `LOGIN_VUS` | `1` | virtual users logging in (auth is expensive) |
| `TEST_DURATION` | `4m` | duration of every scenario |
| `LOGIN_SLEEP` | `1` | seconds between login attempts — keep it above 6 s so `loginLimiter` (10 / 15 min / IP) does not dominate the results |
| `SEARCH_TOKEN` / `SEARCH_COOKIE` | — | auth for protected search routes |
| `LOGIN_PAYLOAD` | `{email,password}` | custom login body |

The run fails when HTTP errors exceed 1% or p95 latency reaches 1s. For a
step-up test, double the VU counts and re-run with the same duration.

## Run against a local stack

When staging is not up, the same scenarios run against a local API. Seed a
catalogue and a verified load-test account first:

```sh
# needs a MongoDB on 27017 (any local instance or Docker)
MONGODB_URI=mongodb://127.0.0.1:27017/hackhub_loadtest node tools/loadtest/seed-local.js

MONGODB_URI=mongodb://127.0.0.1:27017/hackhub_loadtest PORT=5100 \
  npm run start --workspace @hackhub/api

BASE_URL='http://127.0.0.1:5100' \
BROWSE_PATH='/api/hackathons?page=1&limit=20' \
SEARCH_PATH='/api/hackathons?q=ai&skills=react&page=1&limit=20' \
LOGIN_PATH='/api/auth/login' \
LOGIN_EMAIL='loadtest@example.com' LOGIN_PASSWORD='Loadtest!2345' \
TEST_DURATION=30s BROWSE_VUS=4 SEARCH_VUS=2 LOGIN_VUS=1 LOGIN_SLEEP=12 \
k6 run tools/loadtest/scenarios.js
```

Notes:

- `seed-local.js` writes to the URI you give it — never point it at staging or
  production.
- **Git Bash on Windows** rewrites env values that look like POSIX paths, so
  `LOGIN_PATH=/api/auth/login` would reach k6 as
  `C:/Program Files/Git/api/auth/login`. `scenarios.js` normalises this
  automatically; if you use another shell, pass the paths as shown above.
- The API rate-limits: `apiLimiter` 300 requests / 15 min / IP and
  `loginLimiter` 10 logins / 15 min / IP. Restart the API between runs, or
  raise `LOGIN_SLEEP`, otherwise the second run measures the 429 limiter.
- Measured baseline and the findings from it: [RESULTS.md](RESULTS.md).

## Report

Record p50/p95 latency, error rate, Render CPU/memory, Atlas connections and
queueing, plus any 429 responses. Change instance sizes, Mongoose
`maxPoolSize` or rate limits only when those numbers show saturation, then
re-run the identical scenario. Procedure and rollback notes:
[../../docs/production-operations.md](../../docs/production-operations.md).
