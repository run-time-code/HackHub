# HackHub — QA Test Report

| | |
|---|---|
| **Repository** | `run-time-code/HackHub` (monorepo: `apps/api`, `apps/web`) |
| **Original commit tested** | `6ab7b29` (merge PR #15, `main`) |
| **Fix branch** | `fix/qa-senthil-owned-issues` (fixes for findings owned/introduced by Senthil Raja R) |
| **Report date** | 2026-10-17 (post-fix revision) |
| **Tester** | Automated QA sweep (static review + build + test execution + runtime probes) |
| **Scope** | UI flows, REST API, MongoDB models/indexes, auth/session security, CI/CD, deployment config, docs |
| **Environments** | Local (Node 20/26, Linux), `mongodb-memory-server`. Staging/production verified by config + in-process probes only — no live credentials. |

---

## 1. Summary after this fix round

The original audit found **24 findings** (1 P0, 5 P1, 12 P2, 6 P3).
This branch fixes **13 of them**, including the only P0, and resolves the
backend half of the team-feature finding.

| Status | Count | IDs |
|---|---|---|
| **Fixed in this branch** | **13** | F-01, F-03, F-04, F-06, F-08, F-09, F-10, F-13, F-15, F-16, F-17, F-23, F-24 |
| **Partially fixed** | **1** | F-05 (backend reachable + referential integrity; **no UI yet**) |
| **Open (other owners)** | **10** | F-02, F-05b, F-07, F-11, F-12, F-14, F-18, F-19, F-20, F-21, F-22 |

**Still blocking sign-off:**

* **F-02 (P1)** — password reset is broken end-to-end (backend token location + email link). Owners: Berwin CR / Rubashree.
* **F-05b (P2)** — no team UI, and saved/registration records still key hackathons by slug while teams use ObjectId. Owner: product/frontend + Nandhini V.
* **F-21 / F-22 (P2)** — password reset does not revoke sessions; `forgot-password` reveals account existence when email delivery fails. Owner: Berwin CR.
* **F-11 / F-12 / F-14 (P2)** — account-purge orphans, orphaned onboarding/placeholder dashboard, emails landing on raw JSON. Owners: Berwin CR / Rubashree.

---

## 2. Fix verification

| Check | Command | Result |
|---|---|---|
| API lint | `npm run lint --workspace @hackhub/api` | **exit 0** (new ESLint flat config) |
| API tests | `npm test --workspace @hackhub/api` | **63 pass / 0 fail**, 10 suites |
| Web lint | `npm run lint --workspace @hackhub/web` | **exit 0** |
| Web tests | `npm test --workspace @hackhub/web` | **17 pass / 0 fail**, 3 files |
| Web build | `npm run build --workspace @hackhub/web` | **pass** — 413 kB JS (128 kB gzip) |
| Staging cookie probe | app booted with `NODE_ENV=staging` | `__Host-psifi.x-csrf-token=…; Path=/; HttpOnly; Secure; SameSite=None` |
| Health probe (DB down) | `GET /health` with no Mongo connection | `503` / `{"status":"degraded","db":"down"}` |
| Admin route probe | `GET /api/admin/hackathons` unauthenticated | `401` (previously `404`) |

All previous failures that this branch touches now have regression tests
(`apps/api/test/hackathons.test.js`, updated `teams`, `join-requests`,
`health` suites, and `apps/web/src/lib/api/*.test.js`).

---

## 3. What changed

| ID | Fix | Files |
|---|---|---|
| F-01 | Staging now uses `SameSite=None; Secure` + `__Host-` CSRF cookie (`isDeployed` covers production **and** staging) | `middleware/csrfMiddleware.js` |
| F-03 | Admin routers mounted on the production entrypoint with CSRF; dead root `server.js` removed | `src/app.js`, deleted `apps/api/server.js` |
| F-04 | `apiRequest` refreshes an expired session once and replays the request | `src/lib/api/request.js` |
| F-06 | Real gates: API `lint` script + ESLint config, web `test` script + Vitest suite, CI no longer uses `--if-present` | `apps/api/eslint.config.js`, `apps/web` tests, `.github/workflows/*` |
| F-08 | `/health` reports `db` and returns **503** when Mongo is unreachable | `src/services/healthService.js`, `src/controllers/healthController.js` |
| F-09 | Retries a 403 only when the error code is `EBADCSRFTOKEN`/`CSRF_ERROR` | `src/lib/api/request.js` |
| F-10 | Failed CSRF fetches are no longer cached for 10 minutes | `src/lib/api/csrf.js` |
| F-13 | 100 team/join-request writes per user per hour | `middleware/rateLimitMiddleware.js`, `src/routes/teams.js`, `src/routes/teamRequests.js` |
| F-15 | API spec rewritten to the implemented routes, cookie auth, envelopes and limits | `docs/API_SPEC.md` |
| F-16 | Unused Redis removed from config, compose, Render, env templates and docs; single-instance constraint documented | `src/config/index.js`, `docker-compose.yml`, `render.yaml`, `.env.example`, `.env.staging.example`, README/docs |
| F-17 | `DELETE /teams/:id/members/:userId` — members can leave, leaders can remove; a freed seat reopens a closed team | `src/services/teamsService.js`, `src/controllers/teamsController.js`, `src/routes/teams.js` |
| F-23 | Mongoose validation text mapped to stable client messages | `src/services/teamsService.js` |
| F-24 | Client `x-request-id` accepted only if `^[A-Za-z0-9_-]{8,64}$` | `src/middleware/requestId.js` |
| F-05a | New public `GET /api/hackathons` + `/:id` (by ObjectId **or** slug); team creation rejects unknown hackathons | `src/services/hackathonsService.js`, `src/controllers/hackathonsController.js`, `src/routes/hackathons.js`, `src/routes/index.js`, `src/services/teamsService.js`, tests |
| F-05b | **Not fixed** — no team UI yet | — |

---

## 4. Findings register (with status)

### F-01 — P0 — Staging authentication is impossible (CSRF cookie `SameSite=Lax`) — **FIXED**

**Original evidence** — `csrfMiddleware.js` keyed `sameSite`/`secure`/`__Host-`
off `NODE_ENV === "production"`, while `render.yaml` sets `staging`. The SPA
runs on a different origin, so the Lax cookie was never sent and every
mutation returned 403.

**Fix** — One `isDeployed` flag (`production` + `staging`) drives the cookie
name, `SameSite=None`, `Secure`, and the strict `CSRF_SECRET` requirement.

**Verified** — App booted with `NODE_ENV=staging` returns
`Set-Cookie: __Host-psifi.x-csrf-token=…; HttpOnly; Secure; SameSite=None`
and `/api/auth/csrf-token` is `200`.

---

### F-02 — P1 — Password reset is broken end-to-end — **OPEN** (Berwin CR / Rubashree)

**Evidence** — Client sends the token in the query (`auth.js`), server reads
`req.body.token` (`authController.js` `resetPassword`), and the email link is
a `GET` to a `POST`-only route (`emailUtils.js`).

**Runtime proof (still reproducible)** —

| Request | Status | Body |
|---|---|---|
| `POST /api/auth/reset-password?token=…` `{password}` (SPA) | `400` | `Token and password are required` |
| `POST /api/auth/reset-password` `{token, password}` | `200` | `Password reset successful` |
| `GET /api/auth/reset-password?token=…` (email) | `404` | route not found |

**Fix** — Email link → `${FRONTEND_URL}/reset-password?token=…`; controller
reads `req.query.token` (or the client sends it in the body — pick one);
add one integration test for forgot → link → reset → login.

---

### F-03 — P1 — Admin APIs were unreachable — **FIXED**

**Original evidence** — Admin routers were mounted only in
`apps/api/server.js`, which no deployment ran (`package.json`,
`Dockerfile`, `render.yaml` all use `src/server.js`).

**Fix** — `src/app.js` now mounts `/api/admin/hackathons`,
`/api/admin/users`, `/api/admin/reports` behind `doubleCsrfProtection`; the
legacy entrypoint was deleted so there is a single middleware stack.

**Verified** — Unauthenticated `GET /api/admin/hackathons` returns `401`
(previously `404`); admin handlers keep `requireAuth` + `requireRole("admin")`.

---

### F-04 — P1 — Users were logged out every 15 minutes — **FIXED**

**Original evidence** — Access tokens expire after 15 min
(`tokenUtils.js`), `/auth/refresh` exists, but `request.js` only dispatched
`auth:unauthorized` and never refreshed.

**Fix** — On `401` (except `/auth/login|register|refresh|logout`),
`apiRequest` fetches a fresh CSRF token, calls `/auth/refresh`, and replays
the original request once. AuthContext still clears state if the refresh
fails.

**Verified** — `request.test.js` asserts the 4-call refresh sequence and that
login 401s are not refreshed.

---

### F-05 — P1 → **PARTIAL** — Team feature reachability

**Fixed (backend/data):**

* New `GET /api/hackathons` (public, `q`/`page`/`limit`, hidden rows excluded)
  and `GET /api/hackathons/:id` (accepts ObjectId **or** `hackathon_id` slug).
* `POST /teams` now rejects a `hackathonId` that does not reference an
  existing hackathon (`400 does not reference an existing hackathon`) instead
  of persisting an orphan team.
* `hackathons.test.js` covers list/get/slug/404/hidden filtering, regex
  escaping, pagination, orphan rejection, and a successful team creation.
* API spec documents which id to use (`id` from the list endpoint).

**Still open (F-05b, P2)** — no team UI exists (`grep -r team apps/web/src`
returns nothing), and `Saved_Hackathons`/`Registrations` still key hackathons
by the string slug while `Teams` uses the ObjectId. Before building the UI,
decide whether to expose both ids long-term (current state) or migrate to one.

**Owner** — Senthil Raja R for the remaining identifier decision; frontend
owner to be assigned for the screens.

---

### F-06 — P1 — CI was green with an untested frontend — **FIXED**

**Original evidence** — `ci.yml` used `--if-present`; `apps/web` had no
`test` script or test files, and `apps/api` had no `lint` script, so two
"checks" were no-ops.

**Fix** —

* `apps/api/package.json`: `"lint": "eslint ."` + flat config
  (`apps/api/eslint.config.js`, Node globals, recommended rules).
* `apps/web/package.json`: `"test": "vitest run"`, `"test:watch": "vitest"`.
* 17 frontend tests: CSRF caching (success/failure/force refresh), request
  refresh + CSRF-only retry + non-JSON errors, auth schema validation.
* CI and both deploy workflows no longer pass `--if-present`.

**Verified** — API lint exit 0, web test 17/17, CI YAML updated.

---

### F-07 — P2 — Password policy mismatch — **OPEN** (Rubashree / Berwin CR)

Frontend register requires a **digit** (`authSchemas.js`), backend register
requires a **special character** (`authController.js`). `Password1` passes
the form and fails the API; `Password!` fails the form.

**Fix** — Single shared policy or server-driven policy endpoint; align the
copy shown under the field.

---

### F-08 — P2 — `/health` ignored the database — **FIXED**

**Original evidence** — The payload was built from uptime alone, so deploy
workflows and Render reported success with an unreachable database.

**Fix** — `healthService.getHealth()` reports `db: "up" | "down"` from
`mongoose.connection.readyState`; the controller returns `503` and
`status: "degraded"` when down.

**Verified** — Probe with no Mongo connection: `503`,
`{"status":"degraded","db":"down"}`; test suite asserts `db: "up"` with the
in-memory server and the degraded shape via `getHealth(0)`.

---

### F-09 — P2 — Any 403 retried the mutation — **FIXED**

Retry now requires `error.code === "EBADCSRFTOKEN"` (or `CSRF_ERROR`).
Regression test: `TEAM_FORBIDDEN` 403 is thrown with exactly 2 fetches, while
a CSRF 403 performs the token-refresh retry.

---

### F-10 — P2 — Failed CSRF fetch cached as `null` for 10 minutes — **FIXED**

Failed fetches clear the cache immediately; only successful tokens are
memoised (10-minute TTL, timer unref'd for tests/SSR). Tests cover rejection,
non-OK response, successful caching, and forced refresh.

---

### F-11 — P2 — Account purge leaves orphaned data — **OPEN** (Berwin CR)

`accountPurge.js` still deletes only `User` + `Registration`. Teams led by the
deleted user, their `members` entries, `Saved_Hackathons`, `JoinRequests` and
`Notifications` remain, and the nightly transaction still requires a replica
set. Recommended fix is unchanged: purge all five collections in the same
transaction, transfer or delete led teams, and add a purge test.

---

### F-12 — P2 — Onboarding orphaned; dashboard placeholder — **OPEN** (Rubashree)

`/onboarding` is registered but nothing navigates to it; login always goes to
`/dashboard`, which says "This is a placeholder". Suggested: redirect to
`/onboarding` when `!user.onboardingCompleted`, then to the dashboard.

---

### F-13 — P2 — No rate limits on team writes — **FIXED**

`teamWriteLimiter` (100/hour per authenticated user, IP fallback through
`ipKeyGenerator`) is applied to team create/update/delete/transfer, join
requests/invitations, request responses and membership removal. Note: the
limit's 429 path is configured but not exercised by a test (would need 100
requests); the limiter is mounted on every write route.

---

### F-14 — P2 — Emails link to raw JSON — **OPEN** (Berwin CR)

Verification and reset links still point at `${API_BASE_URL}/api/auth/...`,
which returns JSON (and 404 for reset). Point them at
`${FRONTEND_URL}/verify-email` and `/reset-password`; the SPA pages already
exist.

---

### F-15 — P2 — API documentation described a different product — **FIXED**

`docs/API_SPEC.md` rewritten: cookie session + CSRF, real user/admin/saved/
dashboard paths, the new hackathons and membership endpoints, both response
envelopes (new routers vs. legacy), health/metrics semantics, rate limits,
and a short "Planned (not implemented)" list for calendar/reminders/facets.
Removed the false `Authorization: Bearer` default and the non-existent
`/saved`, `/calendar`, `/reminders` tables.

---

### F-16 — P2 — Redis declared but unused — **FIXED**

Removed `REDIS_URL`/`redisUrl` from config, `docker-compose.yml`,
`render.yaml`, both env templates, README and staging/production docs; the
compose Redis service and volume are gone. The in-process limitation (rate
limits and the SSE event bus are per-instance) is documented in the README
and `.env.example`, so single-instance deployment is an explicit constraint.

---

### F-17 — P3 — No member removal / leave — **FIXED**

`DELETE /teams/:id/members/:userId`:

* self → leave; leader → remove another member;
* non-leaders cannot remove others (`403`);
* the leader cannot leave without transferring (`400`);
* unknown member → `404 MEMBER_NOT_FOUND`;
* a freed seat reopens a `closed` team;
* both sides get a notification (`member_left` / `member_removed`).

Tests cover leave + reopen, leader removal, permission denial, leader
protection and the unknown-member error.

---

### F-18 — P3 — `index.html` still says "frontend" — **OPEN** (Rubashree)

`<title>frontend</title>`, no description/OG tags. Set a product title and
social metadata.

---

### F-19 — P3 — `AuthErrorBanner` maps codes the API never sends — **OPEN** (Rubashree/Berwin CR)

The banner keys off `EMAIL_UNVERIFIED`/`RATE_LIMITED`/`INVALID_CREDENTIALS`;
the legacy auth handlers return only `message`. Either emit `code` from those
handlers (and document the envelope, now done in the spec) or delete the
dead mappings.

---

### F-20 — P3 — Sanitization covers only `req.body` — **OPEN** (Berwin CR)

`req.query`/`req.params` are untouched (no live injection path today; all
query values are validated before use). Prefer rejecting `$`/dotted keys with
`400 VALIDATION_ERROR` instead of silently dropping them.

---

### F-21 — P2 — Password reset does not revoke sessions — **OPEN** (Berwin CR)

`resetPassword` clears `refreshTokenHash` but not `tokenVersion`, unlike
change-password/revoke/delete. Probe confirmed the pre-reset access token
still gets `200` from `/users/me` and `tokenVersion` stays `0`.

**Fix** — increment `tokenVersion` before `save()`; add a regression test.

---

### F-22 — P2 — `forgot-password` is an account-existence oracle — **OPEN** (Berwin CR)

Unknown email → `200`; existing account + email-delivery failure → `500`
(and the new token overwrites any previous valid link). Wrap the send, return
the generic `200` always, and clear the stored hash on failure.

---

### F-23 — P3 — Raw Mongoose messages exposed — **FIXED**

`teamsService` maps validation failures to stable messages
(`name must be between 3 and 80 characters`,
`maxTeamSize must be a number between 2 and 10`, etc.) instead of returning
`Team validation failed: Path … is more than maximum allowed value …`.

---

### F-24 — P3 — Client `x-request-id` trusted verbatim — **FIXED**

Accepted only when it matches `^[A-Za-z0-9_-]{8,64}$`; otherwise a UUID is
generated. The response header/body always carry the id actually used.
Tested with a valid id (preserved) and an invalid one (replaced).

---

## 5. Database review

**Indexes remain adequate.** `Users.email` unique; `googleId`/`githubId`
uniquely sparse; `JoinRequests` partial unique index on
`{team,user,status:"pending"}`; query-shaped compound indexes on
`JoinRequests`/`Notifications`; `Teams` `{hackathon,status}` and `leader`;
`Saved_Hackathons` unique `{user,hackathon}`.

**Write-path safety** is unchanged and good: atomic seat assignment via one
conditional `findOneAndUpdate` with `$expr`, duplicate-key handling for
concurrent requests, lazy expiry sweeps.

**Fixed in this branch:** teams can no longer reference a non-existent
hackathon (`hackathonExists`), so the collection no longer accumulates
unreachable rows from public clients.

**Still to decide / fix:**

1. **Identifier split (F-05b).** `Hackathons.hackathon_id` is a slug string
   used by `Saved_Hackathons`/`Registrations`; `Teams.hackathon` is an
   ObjectId. The API now exposes both, but a long-term single identifier is
   still preferable.
2. **Purge orphans (F-11).** Deleting a user leaves teams without a leader
   plus dangling refs in four other collections.
3. **Transactions require a replica set.** `withTransaction()` fails on
   standalone MongoDB and the nightly job only logs the failure.
4. **No migration tooling.** Schema shape lives only in Mongoose; path moves
   during the monorepo restructure had no data migration step.
5. **No seeded teams.** `tools/data-importer` seeds hackathons only, so
   `GET /teams` is empty in every environment until users create teams.

---

## 6. Security review

**Solid (unchanged):** httpOnly access/refresh cookies with hashed refresh
tokens and rotation; double-submit CSRF on every mutation; per-account
lockout with atomic counters; OAuth `state` in a signed cookie with TTL and
constant-time comparison; password change requires the current password;
`/users/me`, export and public profile exclude secrets; metrics gated by a
constant-time bearer check; team authorization enforced in the service layer.

**Fixed in this branch:** staging CSRF cookie attributes (F-01), unnecessary
CSRF-triggered mutation replay (F-09), team write throttling (F-13),
client-controlled request ids (F-24), error messages leaking schema
internals (F-23).

**Remaining:**

| Risk | Severity | Ref |
|---|---|---|
| Password reset does not revoke sessions | Medium | F-21 |
| `forgot-password` account enumeration | Medium | F-22 |
| Lockout is a DoS vector (5 wrong passwords locks a known email) | Low | — |
| No re-authentication before account deletion | Low | — |
| Query/params not sanitized (defence-in-depth) | Low | F-20 |
| Rate limits are in-process (single instance only) | Medium | documented |

---

## 7. Frontend / UX review

* **Fixed:** expired sessions recover transparently; CSRF failures no longer
  poison the client for 10 minutes; ordinary 403s no longer replay writes.
* **Still open:** dashboard placeholder and orphaned onboarding (F-12); no
  UI for teams, join requests, notifications, discovery, profile/avatar or
  saved hackathons; `index.html` metadata (F-18); dead error-code mapping
  (F-19).
* **Accessibility:** the `PasswordInput` show/hide control remains
  `tabIndex={-1}` and labels are not associated with inputs via
  `htmlFor`/`id`.
* **Bundle:** ~413 kB (128 kB gzip); Sentry is imported even without a DSN.

---

## 8. CI/CD & observability

| Item | Status |
|---|---|
| `ci.yml` frontend lint / test / build | ✅ all real now (17 tests) |
| `ci.yml` backend lint / test | ✅ ESLint + 63 tests |
| Deploy workflows | ✅ no `--if-present`; still gate on `/health`, which now fails correctly when the DB is down |
| Gitleaks | ✅ configured |
| Health check | ✅ DB-aware (503 when down) |
| Metrics | ⚠ request counters + process metrics only; no latency histograms or DB pool metrics |
| Alerting | ⚠ documented in `docs/production-operations.md`, not automated in-repo |

---

## 9. Remaining work and owners

| Owner | Open items |
|---|---|
| **Berwin CR** | F-02 (API side), F-11, F-14, F-19 (codes), F-20, F-21, F-22 |
| **Rubashree** | F-02 (client), F-05b (UI), F-07, F-12, F-18, F-19 |
| **Nandhini V** | F-05b identifier decision (with Senthil) |
| **Senthil Raja R** | F-05b identifier decision; monitor the new rate limit and hackathon API in staging |

**Suggested order:** F-02 → F-21/F-22 → F-05b (UI + identifier) → F-11 →
F-12/F-14 → F-07/F-18/F-19/F-20.

---

## 10. Verified working (do not regress)

* Registration/verification flow, duplicate-email handling, hashed
  verification tokens, account cleanup on email failure.
* Login: normalisation, generic invalid-credential response, soft-delete
  refusal, verified-email gate, atomic lockout, cookie issuance.
* OAuth state cookie verification/clearing and 503 for unconfigured
  providers.
* Profile: secret-free `/users/me`, public field allowlist, change-password
  re-check, data export, metrics token.
* Teams: leader-only update/delete/transfer, immutable `hackathon`/`leader`,
  `maxTeamSize` floor, deletion cancels pending requests, last seat closes
  the team, freed seat reopens it, member removal/leave.
* Join requests: daily cap, duplicate/self/full/closed guards, `410` for
  expired rows, race-safe accepts, notifications on every transition.
* Notifications: per-user scoping, read/read-all, SSE + polling fallback.
* 63 API tests, 17 web tests, both linters, production web build.

---

## Appendix A — Commands used

```bash
# Test / lint / build (all exit 0 on this branch)
npm run lint --workspace @hackhub/api
npm test --workspace @hackhub/api          # 63 pass
npm run lint --workspace @hackhub/web
npm test --workspace @hackhub/web          # 17 pass
npm run build --workspace @hackhub/web

# Runtime probes (temporary scripts, removed after each run)
#  - staging boot: csrf cookie attributes, /health 503, /api/admin 401
#  - app + mongodb-memory-server: reset-password token placement,
#    forgot-password failure, team creation with a fake hackathonId
cd apps/api && node <probe>.tmp.js

# Attribution
git log --follow --format='%an | %ad | %h | %s' -- <path>
git blame -w -L 710,711 apps/api/controllers/authController.js
```

## Appendix B — Not verified (needs credentials or infrastructure)

* Live Google/GitHub OAuth round-trips and account linking.
* Resend delivery, bounce handling, email rendering.
* Render/Vercel deploy execution and real staging/production health.
* MongoDB Atlas connectivity, replica-set transactions, backup/restore drill.
* Browser E2E (no Chrome in the QA environment); the staging cookie
  conclusion is confirmed by attributes but not by a full browser session.
* The 429 branch of the new team rate limiter (configured, not load-tested).
