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
| `SEARCH_TOKEN` / `SEARCH_COOKIE` | — | auth for protected search routes |
| `LOGIN_PAYLOAD` | `{email,password}` | custom login body |

The run fails when HTTP errors exceed 1% or p95 latency reaches 1s. For a
step-up test, double the VU counts and re-run with the same duration.

## Report

Record p50/p95 latency, error rate, Render CPU/memory, Atlas connections and
queueing, plus any 429 responses. Change instance sizes, Mongoose
`maxPoolSize` or rate limits only when those numbers show saturation, then
re-run the identical scenario. Procedure and rollback notes:
[../../docs/production-operations.md](../../docs/production-operations.md).
