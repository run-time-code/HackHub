# Load test results

Runs are recorded here so a later change can be compared against a known
baseline instead of a memory of "it felt fast".

## Run 2026-10-31 — local baseline (Week 4, task 6.4.3)

**Question this run answers:** do the three hot paths (browsing, searching,
login) stay inside the agreed thresholds — errors under 1 %, p95 under 1000 ms —
when the API is serving a realistic catalogue?

| Item | Value |
|---|---|
| k6 | `v0.54.0` (windows-amd64) |
| Target | local API `http://127.0.0.1:5100` (Node 20, `apps/api`, single process) |
| Database | local MongoDB 8.2.6, 300 hackathon documents, 1 load-test user |
| Duration | 30 s (`TEST_DURATION=30s`), 7 VUs total |
| Scenario mix | browsing 4 VUs · searching 2 VUs · login 1 VU (`LOGIN_SLEEP=12`) |
| Thresholds | `http_req_failed < 1 %`, `http_req_duration p(95) < 1000 ms` |

### Result: PASS

| Metric | Value | Threshold | Verdict |
|---|---|---|---|
| Checks | **100.00 %** (186 / 186) | — | ✅ |
| `http_req_failed` | **0.00 %** (0 / 186) | < 1 % | ✅ |
| `http_req_duration` p95 | **129.47 ms** | < 1000 ms | ✅ |
| `http_req_duration` p90 | 42.31 ms | — | — |
| `http_req_duration` avg / med | 30.7 ms / 14.6 ms | — | — |
| `http_req_duration` max | 540.85 ms | — | — |
| Requests | 186 (5.01 req/s) | — | — |
| Data received | 3.1 MB | — | — |

Scenario checks: `browse returned 2xx` ✅ · `search returned 2xx` ✅ ·
`csrf bootstrap returned 200` ✅ · `login returned 2xx` ✅.

The plan's Week 4 target is *"95 % of list and search requests answer in under
300 ms"* — this run's p95 of 129 ms clears it on local hardware.

### Findings to act on (came out of getting this run to pass)

1. **Login could not be load-tested as written.** `POST /api/auth/login` is a
   double-submit CSRF mutation, so the scenario now bootstraps
   `GET /api/auth/csrf-token` and replays the token as `X-CSRF-Token`.
   Without it every login answered 403 and the run measured the rejection path.
2. **Login pacing is now configurable (`LOGIN_SLEEP`).** `loginLimiter` allows
   10 attempts per 15 minutes per IP; a 1 s loop would have measured the 429
   limiter instead of authentication.
3. **The global API limiter is the first ceiling, not the database.**
   `apiLimiter` allows 300 requests / 15 min / IP (~0.33 req/s sustained).
   During development of this baseline a second run back-to-back tripped it and
   returned 429s. Before raising instance sizes, decide whether 300/15min is the
   intended public budget and move it to configuration.
4. **Git Bash rewrites `*_PATH` env values.** `LOGIN_PATH=/api/auth/login`
   arrived at k6 as `C:/Program Files/Git/api/auth/login`. `scenarios.js` now
   normalises paths so one command works from any shell.

### Scope limits (read before quoting these numbers)

This is a **local baseline**, not staging or production: single Node process,
local MongoDB on the same machine, no CDN, no Atlas network latency, 300 seeded
records instead of the real catalogue. It is a regression reference for code
changes — re-run the identical command against staging before treating it as a
capacity claim. The staging run and its Render/Atlas numbers are still open
(see [../../docs/production-operations.md](../../docs/production-operations.md)).

### Reproduce

```sh
# 1. local MongoDB + API (see tools/loadtest/README.md)
MONGODB_URI=mongodb://127.0.0.1:27017/hackhub_loadtest node tools/loadtest/seed-local.js

# 2. the run recorded above
BASE_URL='http://127.0.0.1:5100' \
BROWSE_PATH='/api/hackathons?page=1&limit=20' \
SEARCH_PATH='/api/hackathons?q=ai&skills=react&page=1&limit=20' \
LOGIN_PATH='/api/auth/login' \
LOGIN_EMAIL='loadtest@example.com' LOGIN_PASSWORD='Loadtest!2345' \
TEST_DURATION=30s BROWSE_VUS=4 SEARCH_VUS=2 LOGIN_VUS=1 LOGIN_SLEEP=12 \
k6 run tools/loadtest/scenarios.js
```
