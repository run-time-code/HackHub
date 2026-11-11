# Scaling HackHub to 500,000 users

This document answers one question with numbers: **can the current system serve
500,000 people, and what still has to change if traffic spikes?**

## 1. What "500,000 users" actually means

Traffic is not the registered-user count. The workload that matters:

| Quantity | Assumption | Result |
|---|---|---|
| Registered users | — | 500,000 |
| Daily active users (10%) | 50,000 | 50,000 |
| Sessions per DAU | 4 | 200,000 / day |
| API calls per session | ~25 | 5,000,000 / day |
| Average request rate | spread over 24h | ~58 req/s |
| Peak / average | 5x (evening, event deadlines) | ~300 req/s |
| Concurrent users at peak | 1–2% of DAU | 500–1,000 |
| Read : write | catalogue browsing dominates | ~20 : 1 |
| Storage | ~20k hackathons, 500k users, 5M saves/reminders | < 20 GB |

So the real target is **~300 req/s peak with p95 under 200 ms**, not 500,000
simultaneous requests. The current code path can reach that on a small cluster;
it cannot on one 0.5 GB instance, and no single instance can serve 500,000
concurrent sockets.

## 2. What was changed in code

Work that used to scale with the number of users or catalogue rows was made
bounded and cacheable:

| Change | File | Why it matters |
|---|---|---|
| Per-user lists are indexed (`members.user`, `initiatedBy+createdAt`, `user+updatedAt`, discovery filters) | `apps/api/src/models/team.js`, `joinRequest.js`, `models/SavedHackathon.js`, `models/User.js` | Dashboard/teams/saved queries stop scanning collections as users grow |
| Ranked discovery is capped and scored in the database | `src/services/usersService.js`, `src/config/index.js` (`DISCOVERY_MAX_CANDIDATES`) | One broad skill filter can no longer load a whole collection into Node |
| Catalogue facets + total are cached per filter and single-flighted | `src/services/hackathonsService.js` | Page navigation no longer re-scans every matching row |
| Landing counters cached | `src/services/statsService.js` | The public homepage does not run counts on every hit |
| Cross-instance cron locks | `src/utils/jobLock.js`, `src/server.js`, `src/scrapers/run.js` | Reminders, account purge and scraping run once for the whole fleet, not once per replica |
| Mongo connection pool is configurable | `src/config/index.js` (`MONGO_MAX_POOL_SIZE`) | Instances do not exhaust the cluster connection limit |
| Background jobs can be disabled per instance | `RUN_BACKGROUND_JOBS=false` | Web replicas stay stateless; one worker owns the crons |
| SSE streams are capped per user and globally | `src/utils/sseLimiter.js` | One client cannot exhaust file descriptors |
| General API limiter buckets by account (IP only when anonymous) | `src/middleware/rateLimitIdentity.js`, `src/app.js` | Users behind one campus/NAT IP no longer share a single 300-request bucket |

Regression coverage: `apps/api/test/scaling.test.js` (lock concurrency, cache
behaviour, discovery cap, index presence). Full API suite: **154/154 passing**.

## 3. Measured hot paths

Measured with `node scripts/bench-hot-paths.js 20000 20000` — 20,000 catalogue
rows and 20,000 users, in-memory MongoDB, one core. Treat as indicative, not as
production capacity:

| Request | Before | After |
|---|---|---|
| Catalogue page 2–20, same filter (facets cached) | facet scan on every page | **~25 ms** |
| Catalogue page with empty cache (facet scan) | ~350 ms | ~270 ms |
| `GET /users/discover?skills=react` (2,000 scored candidates) | full scan | **~60–120 ms** |

The remaining cold-cache cost is the facet aggregation. It is now paid once per
filter per replica per 5 minutes instead of once per page view.

## 4. What still blocks 500,000 users

These are deployment changes, not code defects:

1. **More than one API instance.** `render.yaml` is a single `starter` web
   service. Three instances behind a load balancer are required for
   availability (rolling deploys, instance loss) and throughput.
2. **Shared rate limiting.** `express-rate-limit` keeps counters in process
   memory (the keying is already per account). With N instances the effective
   limit is N times the configured one, and a blocked client can simply retry
   against another instance. Move the store to Redis (or enforce limits at the
   load balancer/CDN).
3. **Shared SSE fan-out.** The notification event bus is an in-process
   `EventEmitter`. An event published on instance A is only delivered to
   browsers connected to A. Multi-instance requires Redis pub/sub (or polling
   fallback) for `/notifications/stream`.
4. **Database tier.** A `free`/`M0` MongoDB cannot hold 300 req/s. Use a
   replica set (`M30` or equivalent) with read preference `secondaryPreferred`
   for catalogue reads, plus connection pooling per instance
   (`MONGO_MAX_POOL_SIZE` × instances < cluster limit).
5. **Catalogue search.** Text search currently uses case-insensitive regexes.
   At 20k rows they are fine; at 500k they need a MongoDB text/Atlas Search
   index. Facet counts should then be precomputed on a schedule instead of on
   request.
6. **Static assets.** Serve the SPA and images from a CDN, not the API origin.
7. **Scheduled jobs.** Set `RUN_BACKGROUND_JOBS=false` on web replicas and run
   one worker with the flag enabled (or a cron service) so reminder/purge/
   scrape work does not compete with request handling.

## 5. Verification before claiming capacity

```bash
# 1. API correctness
cd apps/api && npm test

# 2. Hot-path timings against a realistic catalogue
node scripts/bench-hot-paths.js 20000 20000

# 3. Load test from a separate machine (not in the repo)
k6 run --vus 500 --duration 10m loadtest/catalogue.js   # target: p95 < 200 ms, errors < 1%
```

Only step 3, against the real deployment with production-sized data, can
demonstrate that 500,000 users are served within the latency target.
