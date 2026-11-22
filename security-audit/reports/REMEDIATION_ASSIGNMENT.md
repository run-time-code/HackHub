# HackHub

## 1. Operating model

### 1.1 Ownership rules

1. Every finding has **one accountable owner** and at least one **supporting developer**.
2. **No one verifies their own security-critical fix.** Senthil is the default security verifier for backend/frontend/database fixes; Berwin verifies Senthil’s backend fixes.
3. Backend/API/database enforcement belongs to Berwin, Senthil, and Nandhini — **not** to the frontend team.
4. Frontend fixes are UI/UX and defense-in-depth. They do not replace server-side authorization, validation, or rate limiting.
5. P0 items block feature work. P1 items block release. P2 items can run in parallel after P1 starts.
6. One PR per finding (or a small, tightly related group). PR title starts with the finding ID.
7. Every PR includes tests and redacted evidence. “It works locally” is not acceptance.
8. Raw secrets are never pasted into tickets. Reference the file and finding ID only.

### 1.2 Branch and PR convention

```text
security/<finding-id>-<short-name>
security/rate-01-trust-proxy
security/err-01-csrf-error-handler
security/san-01-null-prototype
security/db-01-mongo-auth
security/admin-01-user-list
security/vite-01-bind-loopback
```

PR checklist:

- [ ] Finding ID in the title and description
- [ ] Owner and reviewer named
- [ ] No secret/PII values in code, logs, tests, screenshots, or PR text
- [ ] Tests added/updated and passing
- [ ] Raw evidence attached or linked (redacted)
- [ ] Acceptance criteria from this plan met
- [ ] Rollback plan for config/database changes
- [ ] Senthil or Berwin security verification recorded
- [ ] No unrelated feature changes

### 1.3 Priority definitions

| Priority | Meaning | Target |
|---|---|---|
| **P0** | Active credential exposure, exposed services, no-auth DB, historical secret | 24–48 hours |
| **P1** | Confirmed app weaknesses and critical coverage gaps | Sprint 1 (about 1 week) |
| **P2** | Broader coverage, production verification, tooling/evidence rebuild | Sprint 2 (about 2 weeks) |
| **P3** | Ongoing hardening/process | Continuous |

---

## 2. Team ownership summary

| Developer | Primary role | Security ownership |
|---|---|---|
| **Berwin** | Backend | API security fixes: rate limiting, error handling, admin API, logging, OAuth, legacy code, config, backend side of SQLi/NoSQL/IDOR/mass assignment/upload/reset |
| **Senthil** | Backend + testing | Sanitizer fix, test suite rebuild, security verification/release gate, evidence/secrets cleanup, CI, tooling/SCA |
| **Nandhini** | Database | MongoDB auth/least privilege, data retention/PII, DB-side query/NoSQL review, token storage, backups, credential rotation |
| **Rubashree** | Frontend | Vite exposure, frontend headers/TLS, DOM XSS, profile/avatar upload UI, OAuth frontend support, frontend SCA |
| **Lalitha** | Frontend | Admin UI, hidden/saved/notifications UI, CSRF UX, admin/team/saved frontend tests, screenshot/PII review |
| **Divya** | Frontend | Auth/reset/email/OAuth UI, stored XSS rendering, privacy/cookie UI, frontend error handling, token-storage hygiene |



---

## 3. Assignments by developer

### 3.1 Berwin — Backend / API security owner

**Primary findings:** `RATE-01`, `ERR-01`, `ADMIN-01` (backend), `LOG-01`, `OAUTH-01` (backend), `LEGACY-01`, `CONFIG-01`, backend side of SQLi/NoSQL, IDOR/mass assignment, file upload/SSRF, password reset/email.

| Work item | Finding | Files/modules | Acceptance |
|---|---|---|---|
| Fix `trust proxy`/XFF rate-limit bypass; lower global limits; add login lockout/backoff | `RATE-01` | `apps/api/src/app.js`, `apps/api/middleware/rateLimitMiddleware.js`, `apps/api/src/middleware/rateLimitIdentity.js`, config | 14 login attempts → 429 after threshold; rotating `X-Forwarded-For` does not reset the bucket; direct and proxied modes tested |
| Add generic CSRF/body-parser error handlers; stop stack leakage | `ERR-01` | `apps/api/src/app.js`, error middleware/controllers | 400/403/404/413/500 responses contain no `stack`, `at `, file paths, or internal messages |
| Implement or remove `GET /api/admin/users`; test ban/unban and admin authorization | `ADMIN-01` | `apps/api/routes/adminUserRoutes.js`, admin controllers, auth middleware | Admin 200, non-admin 403, anonymous 401; ban/unban tests; CSRF required for mutations; audit log written |
| Replace unsafe log interpolation with structured logging | `LOG-01` | `apps/api/controllers/hackathonTrackingController.js`, logging helper | CR/LF/ANSI payload produces one safe log record; no forged level/timestamp |
| Review OAuth state, redirect URI, callback, account linking | `OAUTH-01` | OAuth routes/controllers, `rateLimitMiddleware.js` | State mismatch/expiry/replay rejected; redirect URI allowlist; linking requires authenticated action |
| Determine active vs. dead legacy backend; remove or fix | `LEGACY-01` | `backend/`, `apps/backend-prototype/` | One active backend or documented legacy boundary; active SQLi/rate-limit hits fixed |
| Production-like config: strong secrets, separate cookie secret, disable auto-verify, realistic limits | `CONFIG-01` | `apps/api/src/config`, `.env.example`, app startup | No dev auto-verify; strong secrets from env/secret store; realistic limits; API loopback for audit |
| Backend code-path review of 12 active SQLi/NoSQL hits; typed filters/validation | SQLi/NoSQL area | `joinRequestsService.js`, `notificationsService.js`, `teamsService.js`, `usersService.js` | Each hit traced to input; safe validation/cast or documented false positive; tests added |
| Authz/field-whitelist review for IDOR/mass assignment | IDOR/MASS area | Services/controllers for teams, saved, profile, skills | Cross-account tests; no role/flags/sensitive-field escalation; exact endpoint tests |
| File upload/Cloudinary/SSRF validation | FILE/SSRF area | Upload controller, Cloudinary config, scraper URL fetch | Type/size/magic validation; signed URLs; SSRF allowlist; tests |
| Password reset/email verification backend | AUTH/RESET area | Auth controllers, token services | Token entropy/expiry/reuse/enumeration/rate-limit tests; no auto-verify outside dev |

**Dependencies:** Nandhini (DB auth/query review), Senthil (tests/verification), Lalitha (admin UI contract), Divya (OAuth/reset UI).

**First PR:** `security/rate-01-trust-proxy`.

**Workload note:** Berwin is on the critical path. Do not add unrelated feature work until `RATE-01`, `ERR-01`, and `ADMIN-01` are merged.

---

### 3.2 Senthil — Backend + security testing / release gate

**Primary findings:** `SAN-01`, `SEC-01` (coordinator), `SEC-02` (evidence cleanup), `EVID-01`, `SUPPLY-01`, `CI-01`, manual-suite rebuild; verification for all findings.

| Work item | Finding | Files/modules | Acceptance |
|---|---|---|---|
| Harden sanitizer: reject `__proto__`/`constructor`/`prototype`; use null-prototype objects | `SAN-01` | `apps/api/middleware/sanitizeMiddleware.js`, unit tests | No inherited props; `Object.getPrototypeOf(result) === null`; `Object.prototype` clean; nested/array/dotted-key tests |
| Rebuild manual suite: CSRF helper, exact assertions, two-user fixtures, actual endpoints, no secrets | `EVID-01` / manual suite | `manual_tests.py`, `evidence/manual-tests.json` | No false passes; `IDOR-02` covered; NoSQL/mass/XSS/admin/cookie tests valid; no secret values |
| Incident owner for historical secret: rotation tracking, GitHub purge, gitleaks, collaborator reset | `SEC-01` | Incident record, repo settings, `tools/data-importer/.env` (outside git) | Old credentials fail; purge confirmed; secret scanning on; current-tree scan clean; closure record |
| Remove/redact audit secrets: `seed.json`, `manual-tests.json`, `manual-tests.txt`, `proxy-flows.mitm`, hardcoded access secret | `SEC-02` | `evidence/`, `manual_tests.py`, `.gitignore` | No passwords/cookies/JWT/CSRF/access secret in tracked files; tokens rotated; proxy capture deleted/redacted |
| Rebuild evidence package: raw logs, traceability, remove synthetic PNGs, fix misleading summaries | `EVID-01` | `make_tool_evidence.py`, `screenshots.py`, `evidence/summary-*`, `reports/` | Every claim links to raw artifact/command/environment; no synthetic tool output presented as raw; report present |
| Tooling supply chain: manifest, checksums, SBOM, licenses, fake DNS removal, CodeQL DB scan | `SUPPLY-01` | `tools/`, `tools/bin`, `tools/venv`, `logs/` | Manifest with SHA-256/licenses; fake DNS shims removed/marked; CodeQL DB scanned; duplicates removed |
| CI hardening: least privilege, curl secrets, workflow_dispatch, action pinning | `CI-01` | `.github/workflows/*.yml` | Checkov 0 for these IDs; no `write-all`; secrets not in curl args; actions pinned/reviewed |
| Verification/release gate for every finding | All | Test evidence, PR review | Independent verification recorded; no self-verification; release blocked until P0/P1 done |

**Dependencies:** Berwin (backend contracts), Nandhini (DB evidence), Rubashree/Lalitha/Divya (frontend evidence), provider access for rotation/purge.

**First PR:** `security/san-01-null-prototype`.

**Workload note:** Senthil owns both a code fix and the verification gate. Berwin reviews the sanitizer fix; Senthil reviews Berwin’s backend fixes.

---

### 3.3 Nandhini — Database / data security owner

**Primary findings:** `DB-01`, `PRIV-01` (database side), DB-side SQLi/NoSQL, credential rotation, retention, token storage.

| Work item | Finding | Files/modules | Acceptance |
|---|---|---|---|
| Enable MongoDB authentication/keyfile; least-privilege app user; loopback/firewall; delete/secure test DB | `DB-01` | MongoDB config, `.mongo-data`, connection config | Unauthenticated connection fails; app user only `hackhub`; DB not LAN-reachable; test data removed/encrypted |
| Rotate MongoDB credential from historical leak; check access logs; update connection string outside git | `SEC-01` | Provider DB, `tools/data-importer/.env` (outside git) | Old DB credential fails; logs reviewed; new value not committed |
| Data retention/PII: audit logs, seeded data, token hashes, screenshots/DB evidence | `PRIV-01` | DB collections, audit logs, evidence | Retention policy defined; PII minimized; test DB deleted; no DB secrets in evidence |
| Review DB-side query construction, indexes, NoSQL operator handling | SQLi/NoSQL area | Models, services, indexes | Each query path reviewed; operator injection blocked; indexes appropriate; tests added |
| Token storage review: refresh tokens, reset tokens, email verification tokens | AUTH/RESET area | User model, token services | Hashes only; expiry/rotation; no plaintext tokens; revocation tests |
| File upload metadata/storage/retention review | FILE/SSRF area | Upload metadata, Cloudinary references | No public secrets; signed URLs; deletion/retention; SSRF-safe URL handling |
| Backup/restore test; separate test/prod DBs | `DB-01` / `CONFIG-01` | DB operations runbook | Restore verified; no production credentials in test; least privilege |

**Dependencies:** Berwin (connection/config), Senthil (verification/evidence), provider access for rotation.

**First PR:** `security/db-01-mongo-auth`.

**Workload note:** Coordinate DB downtime with Berwin and Senthil; do not run auth migration during active tests.

---

### 3.4 Rubashree — Frontend platform/security owner

**Primary findings:** `VITE-01`, frontend headers/TLS, DOM XSS, profile/avatar upload UI; support for OAuth frontend and frontend SCA.

| Work item | Finding | Files/modules | Acceptance |
|---|---|---|---|
| Bind Vite to loopback; remove project-root exposure; production build for shared use | `VITE-01` | Vite config, dev scripts, deployment docs | `/.gitignore`, `/package.json`, `/vite.config.js` not reachable from LAN; `.env` outside served root |
| Frontend security headers/TLS: CSP, XCTO, Referrer-Policy, HSTS, HTTP→HTTPS redirect | HEADER/TLS area | Frontend hosting config, `index.html`, Vercel config | Production scan shows headers; HSTS only on HTTPS; redirect verified |
| DOM XSS review: HTML sinks, URL handling, `javascript:` links, third-party widgets | XSS area | `apps/web/src` components/pages | No unsafe sink; URL allowlist; CSP compatible; tests/evidence |
| Profile/avatar upload UI: type/size/magic validation UX, preview, error handling, SSRF-safe URL | FILE/SSRF area | `Profile.jsx`, `AvatarUploader`, API client | Invalid files rejected client/server; no SSRF; signed URL handling; tests |
| OAuth frontend: redirect/error/state handling; no tokens in URL/localStorage/logs | `OAUTH-01` / SEC-02 | Auth pages, API client, storage helpers | No token in URL/logs; state errors handled; safe redirect allowlist |
| Frontend SCA: npm audit, package updates, lockfile review | SUPPLY/SCA | `package.json`, lockfiles | No high/critical npm advisories; changes reviewed |
| Screenshot/PII review for frontend pages | `PRIV-01` | Screenshots, demo data | No real PII; synthetic data; redacted paths |

**Dependencies:** Divya (auth/OAuth UI), Berwin (OAuth/backend), Nandhini (upload/storage), Senthil (verification).

**First PR:** `security/vite-01-bind-loopback`.

**Workload note:** Frontend headers/TLS may depend on hosting access; if access is unavailable, prepare the config and mark production verification blocked.

---

### 3.5 Lalitha — Frontend admin/teams/saved owner

**Primary findings:** `ADMIN-01` (UI), hidden/saved/notifications UI, CSRF UX, frontend tests for admin/teams/saved.

| Work item | Finding | Files/modules | Acceptance |
|---|---|---|---|
| Admin UI: user list, ban/unban, error states, 401/403 handling | `ADMIN-01` | Admin pages/components, API client | Admin list works when backend exists; non-admin sees 403; no client-only authz; tests |
| Hidden hackathon/saved/notifications UI: no hidden data in cache/UI; correct 401/403 states | DATA/IDOR area | Discover, saved, notifications pages | Hidden records never rendered; cache invalidation; tests |
| CSRF UX: token handling on mutations, retry on 403, no token logging | `ERR-01`/CSRF area | API client, forms | Mutations send token; 403 handled without exposing stack; no token in logs |
| Frontend tests for admin/teams/saved | Coverage | Test files | Tests cover admin/non-admin/anonymous and object ownership; run in CI |
| Screenshot/PII review for admin/team pages | `PRIV-01` | Screenshots, demo data | No real PII; synthetic data; redacted paths |

**Dependencies:** Berwin (admin API contract), Senthil (test harness/verification), Divya (shared auth/error handling).

**First PR:** `security/admin-01-ui`.

**Workload note:** Do not build an admin UI against an undefined API. Berwin must publish the admin route contract first.

---

### 3.6 Divya — Frontend auth/privacy owner

**Primary findings:** auth/reset/email/OAuth UI, stored XSS rendering, privacy/cookie UI, frontend error handling, token-storage hygiene.

| Work item | Finding | Files/modules | Acceptance |
|---|---|---|---|
| Auth UI: login/register/forgot/reset/email verification; no token in URL/localStorage/logs | AUTH/RESET / SEC-02 | Auth pages, API client, storage helpers | No tokens in URL/logs; HttpOnly cookie flow; error states safe; tests |
| OAuth UI: state/error/redirect handling; account-linking UX | `OAUTH-01` | Auth pages, OAuth callback, API client | State mismatch/expiry handled; safe redirect; no token leakage; E2E with mock provider |
| Stored XSS rendering: profile/hackathon/team/feedback content; React escaping/CSP | XSS area | Profile, hackathon detail, teams, feedback components | Seeded payload rendered safely; no `dangerouslySetInnerHTML` without sanitization; tests |
| Password reset/email verification UI: token handling, no logging, safe errors | AUTH/RESET | Auth pages, API client | Token not logged; expiry/reuse errors handled; no enumeration |
| Privacy/cookie UI: consent, privacy page, data deletion/export | `PRIV-01` | Privacy pages, cookie banner, settings | Clear consent; no dark patterns; data deletion/export path; tests |
| Frontend error handling: no stack/internal details displayed | `ERR-01` | Shared error components/API client | 400/403/404/413/500 show generic messages; no stack; tests |

**Dependencies:** Berwin (auth/OAuth/reset backend), Nandhini (token storage), Rubashree (shared headers/CSP), Senthil (verification).

**First PR:** `security/auth-ui-hardening`.

**Workload note:** Stored XSS is shared with Rubashree; split by page/component to avoid duplicate work.

---

## 4. Full issue-to-owner matrix

| Finding/area | Priority | Primary owner | Support | First deliverable |
|---|---|---|---|---|
| `SEC-01` Historical secret exposure | P0 | Senthil | Berwin, Nandhini, all | Rotation record, GitHub purge, clean scan |
| `SEC-02` Audit credentials/live services | P0 | Senthil | Berwin, Nandhini, Rubashree, Lalitha, Divya | Redacted evidence, rotated secrets, loopback services |
| `DB-01` Mongo no auth | P0 | Nandhini | Berwin, Senthil | Auth enabled, least privilege, test DB secured |
| `VITE-01` Vite exposure | P0 | Rubashree | Senthil | Loopback bind, no project-root files |
| `CONFIG-01` Weak dev config | P0/P1 | Berwin | Senthil, Nandhini | Production-like config, strong secrets, auto-verify off |
| `RATE-01` XFF rate-limit bypass | P1 | Berwin | Senthil | 14 attempts → 429; XFF no bypass |
| `ERR-01` Stack leakage (403/413) | P1 | Berwin | Senthil | Generic error responses; no stack |
| `SAN-01` Sanitizer prototype weakness | P1 | Senthil | Berwin | Null-prototype/reject keys; unit tests |
| `ADMIN-01` Admin API/UI gap | P1 | Berwin + Lalitha | Senthil | Admin list/ban tests; 200/403/401 |
| `LOG-01` Log injection | P1 | Berwin | Senthil | Structured logs; CR/LF/ANSI tests |
| `OAUTH-01` SameSite=None OAuth state | P1/P2 | Berwin + Divya | Senthil, Rubashree | State/redirect/linking E2E tests |
| `LEGACY-01` Legacy/duplicate backend | P1/P2 | Berwin | Senthil | Remove or fix; active/dead documented |
| `CI-01` GitHub Actions hardening | P1 | Senthil | Berwin, Rubashree | Checkov 0; no write-all/curl secrets |
| SQLi/NoSQL active/legacy | P1 | Berwin + Nandhini | Senthil | Code-path review + safe tests |
| IDOR/BOLA | P1 | Berwin | Senthil, Lalitha | Full object/role matrix; IDOR-02 covered |
| Mass assignment | P1 | Berwin | Senthil, Lalitha | Actual endpoints; sensitive-field tests |
| Stored/DOM XSS | P1/P2 | Divya + Rubashree | Senthil, Lalitha | Browser tests; CSP; no unsafe sinks |
| File upload/SSRF | P2 | Berwin + Rubashree + Nandhini | Senthil | Upload/SSRF tests; signed URLs |
| Password reset/email verification | P1/P2 | Berwin + Divya + Nandhini | Senthil | Token/expiry/reuse/enumeration tests |
| Rate limits beyond login / broader CSRF | P1 | Berwin | Senthil, Lalitha, Divya | Tests for register/reset/upload/search/admin |
| Frontend headers/TLS | P1/P2 | Rubashree | Senthil, Divya | Production header/TLS/redirect scan |
| `EVID-01` Evidence package unreliable | P0/P1 | Senthil | All | Raw evidence, traceability, no synthetic |
| Manual suite false passes | P1 | Senthil | Berwin, Nandhini, frontend | Rewritten tests; no false passes |
| `SUPPLY-01` Tooling provenance | P1 | Senthil | Nandhini, Rubashree | Manifest, checksums, SBOM, licenses |
| `PRIV-01` Test data/PII/local paths | P1 | Nandhini + Senthil | Divya, Rubashree, Lalitha | Redaction/retention; no PII |
| Production TLS/headers/redirect | P2 | Senthil | Rubashree | Production scan/sign-off |
| SCA: npm/Python/Go/Docker | P2 | Senthil | Nandhini, Rubashree | SBOM + vulnerability scan |
| Mobile/MobSF | N/A | No owner | — | Document N/A |

---



## 6. Plan

### 6.1 P0 — Immediate (24–48 hours)

| Owner | Tasks | Exit criteria |
|---|---|---|
| Senthil | Open incident/assignment tracker; rotate audit secrets; redact evidence; run gitleaks; start GitHub purge; stop sharing audit folder | No secrets in tracked files; purge ticket open; scan clean |
| Berwin | Rotate API secrets; bind API to loopback; remove hardcoded access secret dependency; prepare rate-limit/error branches | API not on `0.0.0.0`; old tokens rejected; branches ready |
| Nandhini | Rotate MongoDB credential; enable auth or stop DB; back up/delete test data; check access logs | Unauthenticated access fails; old credential fails |
| Rubashree | Bind Vite to loopback; remove project-root exposure | No Vite files reachable from LAN |
| Lalitha | Audit admin UI for token logging/storage; plan admin list/ban UI | No token in logs; UI plan agreed with Berwin |
| Divya | Audit auth UI for tokens in URL/localStorage/logs; plan reset/OAuth/privacy work | No token leakage; plan agreed |
| All | Reset local clones; remove old `.env`; report any copies of the old secret; no secrets in tickets | Confirmation from each developer |

### 6.2 P1

| Owner | Focus | Exit criteria |
|---|---|---|
| Berwin | `RATE-01`, `ERR-01`, `ADMIN-01` backend, `LOG-01`, `CONFIG-01` | 429 test passes; no stack; admin routes tested; logs safe; config production-like |
| Senthil | `SAN-01`, manual suite rebuild, `SEC-02` cleanup, `CI-01` | Sanitizer tests pass; no false passes; evidence redacted; Checkov 0 |
| Nandhini | `DB-01`, `PRIV-01` DB side, SQLi/NoSQL query review | Mongo auth/least privilege; retention; query paths reviewed |
| Rubashree | `VITE-01`, frontend headers/TLS baseline, DOM XSS review | Vite loopback; headers configured; sink inventory |
| Lalitha | Admin UI, hidden/saved/notifications UI, CSRF UX | Admin list/ban UI; no hidden data in UI; token handling safe |
| Divya | Auth/reset/email/OAuth UI, stored XSS rendering, privacy UI | Auth UI safe; stored XSS tests; privacy/cookie UI |

### 6.3 P2

| Owner | Focus | Exit criteria |
|---|---|---|
| Berwin | OAuth, legacy, SQLi/NoSQL, IDOR/mass, upload/SSRF, reset/email backend | Full tests/evidence; legacy removed/fixed |
| Senthil | Full coverage, evidence rebuild, SCA/SBOM, production verification, release gate | Coverage matrix; raw evidence; SCA clean; production sign-off |
| Nandhini | Retention, backup/restore, token storage, DB SCA | Restore tested; token storage safe; DB scan clean |
| Rubashree | Production headers/TLS, upload/SSRF UI, frontend SCA | Production scan; upload tests; npm clean |
| Lalitha | Admin/team/saved tests, PII review | Tests in CI; screenshots redacted |
| Divya | OAuth/reset/email E2E, privacy, stored XSS | E2E tests; no PII; XSS tests |



## 7. Dependencies and handoffs

| Dependency | Owner | Consumer | Notes |
|---|---|---|---|
| Rotate historical Brabble/MongoDB credentials | Senthil/Berwin/Nandhini | All | Do before evidence publication |
| Enable MongoDB auth | Nandhini | Berwin | Coordinate downtime; update connection string outside git |
| Admin route contract | Berwin | Lalitha/Senthil | UI and tests must target the real API |
| Rate-limit/error behavior | Berwin | Senthil | Test after merge; no self-verification |
| Sanitizer behavior | Senthil | Berwin | Berwin reviews; tests cover inherited props |
| OAuth backend state/callback | Berwin | Divya/Rubashree | UI cannot fix backend state validation |
| File upload backend/DB | Berwin/Nandhini | Rubashree | UI validation is not a security boundary |
| Frontend headers/CSP | Rubashree | Divya/Lalitha | CSP may affect inline scripts/styles; test pages |
| Evidence/raw logs | All | Senthil | Each owner supplies redacted before/after evidence |
| Production access | Senthil/Rubashree | All | If unavailable, mark production verification blocked |

**Rule:** Do not merge a frontend-only “fix” for a backend authorization/rate-limit issue. The server remains the enforcement point.

---

## 8. Workload and critical path

| Developer | Primary load | Critical path? | Notes |
|---|---|---|---|
| Berwin | High (rate limit, errors, admin, logs, OAuth, legacy, config, SQLi/NoSQL, IDOR/mass, upload, reset) | **Yes** | Pair with Senthil on tests; do not add feature work |
| Senthil | High (sanitizer, test suite, evidence, secrets, CI, tooling, verification) | **Yes** | Verification gate; Berwin reviews sanitizer |
| Nandhini | Medium (DB auth, retention, query review, tokens, backup) | **Yes for DB** | Coordinate maintenance window |
| Rubashree | Medium (Vite, headers/TLS, DOM XSS, upload UI, SCA) | No | Production access may block |
| Lalitha | Medium (admin UI, hidden/saved/notifications, CSRF UX, tests) | No | Depends on Berwin admin contract |
| Divya | Medium (auth/reset/email/OAuth UI, stored XSS, privacy) | No | Depends on Berwin auth contract |

**Suggested pairing:**

- Berwin + Senthil: rate limit, error handling, sanitizer review, admin authz.
- Berwin + Nandhini: SQLi/NoSQL, DB auth/config, token storage.
- Rubashree + Divya: headers/CSP, OAuth UI, stored/DOM XSS.
- Lalitha + Berwin: admin API/UI.
- Senthil + each owner: verification/evidence.

---

## 9. Issue tracker template

Use one issue per finding/area. Suggested labels:

`security`, `p0`/`p1`/`p2`, `backend`, `frontend`, `database`, `testing`, `secrets`, `evidence`, `ci`, `supply-chain`.

```text
Title: [SEC-02] Remove secrets from audit evidence and rotate test credentials
Labels: security, p0, secrets, evidence
Owner: Senthil
Support: Berwin, Nandhini, Rubashree, Lalitha, Divya
Files: security-audit/evidence/seed.json, manual-tests.json, proxy-flows.mitm, manual_tests.py
Acceptance:
- [ ] No password/cookie/JWT/CSRF/access secret in tracked files
- [ ] Tokens/passwords rotated; old values rejected
- [ ] Proxy capture deleted or redacted
- [ ] gitleaks current-tree scan clean
- [ ] Reviewer sign-off
Evidence: redacted before/after, scan output, rotation confirmation
Dependencies: SEC-01 rotation; DB-01 auth
```

**Do not include actual secret values in the issue.** Use file names and finding IDs.

---

## 10. Definition of done

A finding is done only when:

1. The code/config change is merged.
2. A test reproduces the original issue and passes after the fix.
3. A second developer verifies the fix (Senthil by default; Berwin for Senthil’s code).
4. Redacted raw evidence is attached/linked.
5. No secret/PII is introduced.
6. The relevant report section is updated.
7. The issue is closed with the verification date.

### 10.1 Security-specific acceptance checks

| Check | Expected |
|---|---|
| Rate limit | 14 login attempts → 429; spoofed XFF does not reset |
| CSRF/error responses | 403/413/400/500 contain no stack/file paths |
| Sanitizer | `__proto__`/`constructor`/`prototype` rejected; null prototype; no inherited role |
| Admin | Admin 200; non-admin 403; anonymous 401; CSRF required; audit log |
| Mongo | Unauthenticated connection fails; app user least privilege; no LAN exposure |
| Vite | Not reachable from LAN; project files not served |
| Secrets | Current-tree gitleaks clean; no credentials in evidence/tickets |
| CI | Checkov 0 for the 7 findings; no `write-all`; no curl secrets |
| XSS | Stored/DOM payloads do not execute; CSP compatible |
| IDOR/mass | Cross-account/sensitive-field tests pass on real endpoints |
| Upload/SSRF | Invalid files rejected; no SSRF; signed URLs |
| Production | TLS/headers/redirect scan passes or is explicitly blocked |
| Evidence | Every claim traceable to raw artifact/command/environment |

---


