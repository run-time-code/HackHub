# HackHub - OWASP Security Report

## 1. Method

- Static review of apps/api/src/app.js, apps/api/server.js, middleware (authMiddleware.js, requireAuth.js, sanitizeMiddleware.js, csrfMiddleware.js, auditMiddleware.js, rateLimitMiddleware.js), auth controller, user controller, routes, and frontend sinks.
- Dependency audit: npm audit --workspaces (root lockfile). Raw output saved to docs/npm-audit-raw.txt.
- Searched for dangerous patterns (dangerouslySetInnerHTML, eval(, innerHTML, document.write) - none in app code.
- Reviewed CI workflows and deployment docs.

## 2. Summary

| Area | Status |
|---|---|
| Secret scanning (Gitleaks) in CI | Present |
| Dependency vuln scan in CI | Missing |
| OWASP ZAP / DAST scan | Not done |
| OWASP Top 10 checklist | Missing (this is the first) |
| Hardening (helmet, CORS, CSRF, rate limits, sanitize, audit log) | Done |
| Auth & sessions (bcrypt, JWT, lockout, token version) | Done |
| npm audit result | 12 moderate, dev-tooling chain only |

Bottom line: hardening is in place, but there is no DAST or dependency gate in CI and no ZAP report. To close the gap, add npm audit to CI and run ZAP against staging.
## 3. OWASP Top 10 (2021) review

### A01 - Broken Access Control
Status: Partial

Evidence:
- Auth enforced via apps/api/middleware/authMiddleware.js (legacy) and apps/api/src/middleware/requireAuth.js (src surface): JWT verify, user exists, deletedAt, banned, tokenVersion revocation.
- Role checks via requireRole(...) and admin routes under /api/admin/*.
- Ownership checks in services (team membership, saved hackathons keyed by user).
- CSRF double-submit on admin mutation routes (doubleCsrfProtection in apps/api/src/app.js).

Gaps:
- CSRF only on admin routes, not all cookie-auth mutations. Legacy /api/auth, /api/users, /api/saved-hackathons, team/join-request mutations rely on cookie + JWT + CORS. Since tokens also accepted via Bearer header, review CSRF for cookie sessions on non-admin mutations.
- No automated authorization tests per endpoint.
- trust proxy = 1 set; ensure only Render proxy is trusted in prod.

### A02 - Cryptographic Failures
Status: Good

Evidence:
- Passwords hashed with bcryptjs cost 10 (authController.js).
- Access tokens short-lived JWT (15m); refresh tokens 64-byte random (crypto.randomBytes), stored hashed (sha256).
- Email verification / reset tokens hashed before storage (hashToken).
- Cookies httpOnly; CSRF cookie httpOnly; Secure + SameSite=None in deployed envs.
- Secrets (JWT_SECRET, ACCESS_TOKEN_SECRET, CSRF_SECRET) required in deployed envs; server refuses to boot without CSRF_SECRET.
- Sentry sendDefaultPii false.

Gaps:
- cookieParser secret falls back to config.jwtSecret if COOKIE_SECRET unset. Fine for dev, use a distinct secret in prod.
- Token verification accepts two secrets (JWT_SECRET and ACCESS_TOKEN_SECRET) in both middleware files. Wider trust boundary; unify to one issuer secret after migration.
- HSTS not explicitly set; Helmet default HSTS is on, verify in prod.

### A03 - Injection
Status: Good (with notes)

Evidence:
- Global sanitize middleware (apps/api/middleware/sanitizeMiddleware.js) strips $ keys and dotted keys to block NoSQL operator/path injection. Dotted keys allowed only inside skillProficiency map.
- Mongoose parameterized queries throughout; no string concat into queries seen.
- Frontend: no dangerouslySetInnerHTML, eval(, document.write, or innerHTML in app code.
- express.json limit 100kb caps payload size.

Gaps:
- Sanitization only on req.body, not req.query/req.params. Validate query filters with a schema (zod/joi).
- Many routes have no schema validation middleware; rely on controller checks.

### A04 - Insecure Design
Status: Partial

Evidence:
- Login lockout (failedLoginAttempts, lockUntil) in User model.
- Rate limiters on login/register/OAuth/reset/team writes/join requests (rateLimitMiddleware.js, apiLimiter).
- Email verification required before login (unverified blocked).
- Soft delete + nightly purge with retention; account export endpoint.

Gaps:
- No threat model or abuse-case doc in repo.
- Rate limits in-process (single instance); multi-replica would multiply limits (documented).
- No CAPTCHA/bot protection on registration.

### A05 - Security Misconfiguration
Status: Good

Evidence:
- helmet enabled with cross-origin resource policy.
- Strict CORS with configured origins and credentials.
- trust proxy configured for Render.
- Prod env examples mark secrets required; CSRF secret fails fast if missing in deployed envs.
- Sentry error handler only when DSN configured.
- Metrics endpoint gated by METRICS_TOKEN.

Gaps:
- .env.example files contain placeholder secrets (change_me_*) - never use in prod (documented).
- No CSP audit; Helmet default CSP may be disabled for SPA. Verify CSP for frontend.
- Debug console.log statements remain in auth controller (info leakage).

### A06 - Vulnerable and Outdated Components
Status: Partial (12 moderate)

Evidence: npm audit --workspaces reports 12 moderate vulns, all dev-tooling chain:
- glob 3.0.0-14.0.1 (GHSA-3g3m-2fjr-6pw4) via @sentry/bundler-plugins -> @sentry/node (breaking upgrade).
- minimatch < 11.0.1 (GHSA-g3hv-75wg-m249) via @eslint/config-array, @redocly/openapi-core, nodemon, eslint.

No high/critical. None of the vulnerable packages process untrusted input at runtime in prod (eslint/openapi-typescript/nodemon are dev tools; sentry bundler plugin is build-time). Still upgrade.

Raw output: docs/npm-audit-raw.txt.

### A07 - Identification and Authentication Failures
Status: Good

Evidence:
- Strong password policy (>=8 chars, uppercase, special) on register and reset.
- bcrypt hashing, JWT access tokens (15m), refresh token rotation with hashing and revocation (tokenVersion).
- Email verification gate; password reset with expiring single-use hashed tokens.
- OAuth (Google/GitHub) with signed state cookie (login CSRF protection).
- Login lockout and banned-user checks.
- Logout-all invalidates sessions via tokenVersion increment.

Gaps:
- No MFA.
- No password breach check (e.g. HIBP) - optional.
- OAuth account linking / email trust should be reviewed for account takeover.

### A08 - Software and Data Integrity Failures
Status: Partial

Evidence:
- Lockfile present and CI verifies it.
- Gitleaks secret scanning in CI.
- GitHub Actions pinned to @v4 (not SHA).
- Render/Vercel deploy via GitHub environments with approval gate documented.

Gaps:
- No SRI for frontend assets.
- No signed commits or branch protection as code.
- GitHub Actions not SHA-pinned (supply-chain hardening).
- No OWASP Dependency-Check or SBOM.

### A09 - Security Logging and Monitoring Failures
Status: Good

Evidence:
- Structured Pino logging with request IDs.
- Audit middleware logs auth events (register, login, logout, refresh, verify, resend, forgot/reset password, OAuth callbacks) with outcome, IP, user agent, no tokens/passwords.
- Sentry optional for errors; Prometheus metrics; uptime workflow.
- Account purge and reminder scheduler logged.

Gaps:
- Audit log storage/retention not documented as tamper-resistant.
- No alerting on repeated auth failures beyond rate limits.
- console.log/console.error in auth controller bypass structured logger.

### A10 - Server-Side Request Forgery (SSRF)
Status: Not applicable / Low risk

Evidence:
- No user-controlled URL fetching in deployed API. Cloudinary uploads use SDK with configured creds; avatar URL stored as string.
- Devpost ingestion server-side uses fixed endpoints, not user input.

Gaps:
- If future features accept user URLs (webhooks, link previews), validate with allowlist.

## 4. Dependency audit detail

Command: npm audit --workspaces
Result: 12 moderate, 0 high, 0 critical.

| Package | Advisory | Severity | Path | Fix |
|---|---|---|---|---|
| glob | GHSA-3g3m-2fjr-6pw4 | moderate | @sentry/bundler-plugins -> @sentry/node | breaking (npm audit fix --force) |
| minimatch | GHSA-g3hv-75wg-m249 | moderate | @eslint/config-array, @redocly/openapi-core, nodemon, eslint | breaking (npm audit fix --force) |

Recommendation: upgrade @sentry/node to 10.78+ in a dedicated PR and run full tests; upgrade eslint/openapi-typescript/nodemon in a separate dev-tooling PR. Do not run npm audit fix --force blindly in prod.

Raw output: docs/npm-audit-raw.txt.

## 5. Findings (prioritized)

| # | Finding | Severity | OWASP | Recommendation |
|---|---|---|---|---|
| 1 | No OWASP ZAP/DAST scan or report exists | High (process) | A05/A06 | Run ZAP against staging; add to CI/release gate |
| 2 | No dependency audit in CI | Medium | A06 | Add npm audit --audit-level=high to CI |
| 3 | 12 moderate dependency vulns (dev chain) | Low | A06 | Upgrade sentry/eslint/openapi/nodemon |
| 4 | CSRF only on admin routes; non-admin cookie mutations unreviewed | Medium | A01/A05 | Extend CSRF to all cookie-auth mutations or document Bearer-only |
| 5 | Token verification accepts two secrets | Low | A02 | Unify to single issuer secret |
| 6 | Sanitization only on req.body, not query/params | Low | A03 | Add schema validation middleware |
| 7 | console.log/console.error in auth controller | Low | A09 | Route through Pino logger |
| 8 | GitHub Actions not SHA-pinned | Low | A08 | Pin actions to commit SHAs |
| 9 | No CSP header for frontend | Low | A05 | Define CSP compatible with Vite build |
| 10 | Prototype backend (backend/) ships own auth, divergent security | Low | A05 | Remove or clearly mark non-deployed |
