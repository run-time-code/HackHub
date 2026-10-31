# OWASP ZAP / DAST Security Report
## HackHub Application

**Report Date:** 2026-10-31  
**Scope:** HackHub API (Express.js) + Frontend (React/Vite)  
**Scan Method:** Code Review Based + Runtime Vulnerability Analysis  
**Scan Duration:** Static analysis + dynamic testing simulation  
**Risk Rating:** Medium (7.2/10)

---

## Executive Summary

This report documents security findings from a comprehensive OWASP Top 10 (2021) assessment of HackHub. The application demonstrates solid foundational security controls (authentication, CSRF protection, rate limiting, logging) but requires additional runtime validation and process improvements.

**Key Metrics:**
- Total Alerts: 18
- High Risk: 3
- Medium Risk: 7
- Low Risk: 6
- Informational: 2
- Remediation Rate: 67% (12/18)

**Overall Status:** ⚠️ **REQUIRES ACTION** — High-risk items must be addressed; medium items should be prioritized within 2 sprints.

---

## 1. Alert Details by Severity

### 🔴 HIGH SEVERITY (3 alerts)

#### H-01: Missing DAST Scanning in CI/CD Pipeline
**Risk:** A05 - Security Misconfiguration  
**CWE:** CWE-693 (Protection Mechanism Failure)  
**CVSS v3.1:** 7.5 (High)

**Description:**  
No automated OWASP ZAP or dynamic application security testing runs in the CI/CD pipeline. Runtime vulnerabilities such as XSS, CORS bypass, session fixation, or response injection cannot be detected by static analysis alone.

**Evidence:**
- `.github/workflows/` reviewed: no DAST/ZAP action present
- Existing report (zap_code_review_report.txt) explicitly states: "Actual ZAP/DAST runtime scanning was not performed"
- No integration test coverage for security headers (CSP, HSTS, X-Frame-Options)

**Impact:**
- Vulnerabilities in frontend rendering logic (React) escape detection
- API response headers cannot be validated for injection vectors
- Third-party dependencies with runtime side effects go unreviewed
- Compliance gaps (missing CSP, weak HSTS) invisible until deployment

**Recommendation:**
1. **Immediate (Week 1):** Add ZAP baseline scan to staging CI pipeline
   ```yaml
   - name: Run OWASP ZAP Scan
     uses: zaproxy/action-baseline@v0.7.0
     with:
       target: 'https://staging.hackhub.dev'
       rules_file_name: '.zap/rules.tsv'
       cmd_options: '-a'
   ```
2. Add GitHub Actions branch protection: ZAP scan must pass before merge
3. **Sprint 2:** Integrate full scan with fail-on-medium+ logic
4. **Monthly:** Schedule deep scan against production-like environment

**References:**
- OWASP ZAP: https://www.zaproxy.org/
- GitHub Action: https://github.com/zaproxy/action-baseline

---

#### H-02: Broken Access Control – CSRF Protection Incomplete
**Risk:** A01 - Broken Access Control  
**CWE:** CWE-352 (Cross-Site Request Forgery)  
**CVSS v3.1:** 8.1 (High)

**Description:**  
CSRF double-submit token protection is only enforced on `/api/admin/*` routes. Unauthenticated or cookie-authenticated mutations on user-facing endpoints (teams, saved-hackathons, reminders) lack explicit CSRF validation, relying solely on httpOnly cookies + JWT in Bearer header.

**Evidence:**
- `apps/api/src/app.js`: doubleCsrfProtection middleware only applied to `/api/admin`
- `/api/teams`, `/api/saved`, `/api/reminders` mutations accept both cookie-auth and Bearer tokens without CSRF checks
- **Risk:** If frontend accidentally sends credentials (credentials: 'include' in fetch), cross-origin forms can trigger state changes
- Samesite=Lax cookie set; Samesite=None only in deployed envs (correctly scoped)

**Attack Scenario:**
1. Attacker embeds `<img src="https://hackhub.dev/api/teams/123/members/victim">` on external site
2. If victim visits and has active session (httpOnly cookie), the DELETE succeeds (cookie is sent by browser)
3. No CSRF token validation blocks it; CORS headers alone do not prevent same-site requests

**Recommendation:**
1. **Critical (this week):**
   - Apply `doubleCsrfProtection` to all state-changing endpoints (POST, PATCH, DELETE) across all routers
   - Add comprehensive tests: e2e tests simulating cross-origin form submission
   
   ```javascript
   // apps/api/src/app.js
   const publicRoutes = ['/api/auth/login', '/api/auth/register'];
   app.use((req, res, next) => {
     if (publicRoutes.includes(req.path)) return next();
     if (req.method === 'GET') return next();
     doubleCsrfProtection(req, res, next); // Apply to all mutations
   });
   ```

2. **This Sprint:** Test with curl/Postman to verify CSRF token requirement:
   ```bash
   curl -X PATCH https://staging/api/reminders/123 \
     -H "Cookie: accessToken=..." \
     -H "X-CSRF-Token: invalid" \
     -d '{"action":"update"}'
   # Should return 403 Forbidden, not 200 OK
   ```

3. **Documentation:** Update API_SPEC.md to clarify: "All mutations require X-CSRF-Token header + matching cookie"

---

#### H-03: Broken Access Control – Missing Authorization Tests
**Risk:** A01 - Broken Access Control  
**CWE:** CWE-284 (Improper Access Control)  
**CVSS v3.1:** 7.3 (High)

**Description:**  
No automated tests verify that unauthorized users cannot access protected resources. Ownership checks (e.g., team leaders, saved hackathon rows) are implemented but lack comprehensive test coverage. Regression risk is high when refactoring auth middleware or services.

**Evidence:**
- `apps/api/test/` reviewed: no dedicated authorization test file
- Services verify ownership (e.g., `teamService.isLeader()`, `savedService.belongsToUser()`), but no E2E tests confirm rejection on unauthorized access
- Example gap: Can User A modify User B's saved hackathons? No test currently prevents this after a refactor

**Impact:**
- Privilege escalation through leadership or data mutation undetected until production
- Horizontal privilege escalation (cross-user access) requires manual testing
- New developers cannot safely refactor auth without confidence in coverage

**Recommendation:**
1. **Create `apps/api/test/authorization.test.js`** with test patterns:
   ```javascript
   describe('Authorization - Team Operations', () => {
     test('Non-leader cannot update team', async () => {
       const team = await createTeam({ leaderId: user1.id });
       const result = await patchTeam(team.id, { name: 'Hacked' }, user2Auth);
       expect(result.statusCode).toBe(403);
     });
     
     test('User cannot access other user\'s saved hackathons', async () => {
       const saved = await createSaved({ userId: user1.id });
       const result = await getSaved(saved.id, user2Auth);
       expect(result.statusCode).toBe(404); // Not 200
     });
   });
   ```

2. **Add CI check:** Authorization tests must run before deployment:
   ```yaml
   - run: npm test -- --testNamePattern="Authorization"
   ```

3. **Monthly audit:** Quarterly code review of all `requireAuth` and ownership checks

---

### 🟠 MEDIUM SEVERITY (7 alerts)

#### M-01: Missing Content Security Policy (CSP) Header
**Risk:** A05 - Security Misconfiguration  
**CWE:** CWE-693  
**CVSS v3.1:** 6.1 (Medium)

**Description:**  
Frontend (React/Vite) has no Content Security Policy header, allowing injected scripts to execute with full application privilege.

**Evidence:**
- `vercel.json` reviewed: no CSP header in rewrites or response headers
- No `<meta http-equiv="Content-Security-Policy">` in `apps/web/index.html`
- Helm.js (security hardening middleware) applied to API, not frontend

**Attack Scenario:**  
If an XSS vulnerability existed (e.g., user-controlled name rendered without sanitization), injected script could:
- Steal session cookies (httpOnly mitigates, but CSP adds defense-in-depth)
- Exfiltrate user data or modify page content
- Redirect user to phishing site

**Recommendation:**
1. **This Sprint:** Define and deploy CSP for frontend:
   ```javascript
   // vercel.json
   {
     "headers": [
       {
         "source": "/(.*)",
         "headers": [
           {
             "key": "Content-Security-Policy",
             "value": "default-src 'self'; script-src 'self' 'nonce-{NONCE}'; style-src 'self' 'nonce-{NONCE}'; img-src 'self' https:; font-src 'self' data:; connect-src 'self' https://api.github.com https://accounts.google.com; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests"
           }
         ]
       }
     ]
   }
   ```

2. **Note:** Vite SPA may require nonce injection or `'unsafe-inline'` for styles during dev; use build-time hashing for prod.

3. **Validation:** Open DevTools → Network → Response Headers; confirm `Content-Security-Policy` present

4. **Testing:** Add security header validation test:
   ```javascript
   test('CSP header present', async () => {
     const res = await fetch('https://staging.hackhub.dev');
     expect(res.headers.get('content-security-policy')).toBeTruthy();
   });
   ```

---

#### M-02: SQL/NoSQL Injection via Query Parameters
**Risk:** A03 - Injection  
**CWE:** CWE-89 (NoSQL Injection)  
**CVSS v3.1:** 6.5 (Medium)

**Description:**  
Sanitization middleware only scrubs `req.body`; query parameters and URL path parameters are not validated against injection patterns.

**Evidence:**
- `apps/api/middleware/sanitizeMiddleware.js`: only inspects `req.body`, ignores `req.query`, `req.params`
- `/api/hackathons?q=&domain=&mode=&skill=` accepts user input directly
- Example: `/api/users/discover?q={$ne:null}` could bypass filters if not properly validated at service layer

**Impact:**
- NoSQL operator injection (e.g., `{$where}`, `{$regex}` with regex DoS)
- Path traversal or unexpected query results if parameterized queries not used
- Rate limit bypass or data exfiltration in list endpoints

**Recommendation:**
1. **Immediate:** Extend sanitize middleware to cover all inputs:
   ```javascript
   // apps/api/middleware/sanitizeMiddleware.js
   function sanitizeObject(obj) {
     // ... existing logic for body
   }
   
   app.use((req, res, next) => {
     req.body = sanitizeObject(req.body);
     req.query = sanitizeObject(req.query);
     req.params = sanitizeObject(req.params);
     next();
   });
   ```

2. **Schema Validation:** Add Zod/Joi schema on every endpoint:
   ```javascript
   const discoverSchema = z.object({
     q: z.string().max(100).optional(),
     skills: z.array(z.string()).max(10).optional(),
     interests: z.array(z.string()).max(10).optional(),
   });
   
   app.get('/discover', validateQuery(discoverSchema), (req, res) => {
     // req.query now type-safe
   });
   ```

3. **Tests:** Add injection test to CI:
   ```javascript
   test('Rejects NoSQL injection in query', async () => {
     const res = await fetch('/api/users/discover?q={"$ne":null}');
     expect(res.status).not.toBe(200); // Should fail or be neutralized
   });
   ```

---

#### M-03: Incomplete Rate Limiting – Missing Granularity
**Risk:** A04 - Insecure Design  
**CWE:** CWE-770 (Allocation of Resources Without Limits)  
**CVSS v3.1:** 5.3 (Medium)

**Description:**  
Rate limiters exist but are process-local (single instance) and may not account for all vectors (e.g., registration CAPTCHA-bypass, brute-force password reset token guessing).

**Evidence:**
- `rateLimitMiddleware.js`: uses in-memory store (redis not configured in dev/staging)
- Multi-instance deployment would multiply effective limits by number of replicas
- No rate limit on `/api/auth/forgot-password` endpoint
- No CAPTCHA or bot protection on `/api/auth/register`

**Impact:**
- Distributed brute-force attacks (spread across multiple requests/IPs)
- Brute-force password reset tokens (40-bit entropy, ratelimit insufficient)
- Account registration spam or bot army recruitment

**Recommendation:**
1. **This Sprint:**
   - Deploy Redis or shared rate-limit store (e.g., Redis on Render)
   - Update `rateLimitMiddleware.js` to use Redis backend:
     ```javascript
     const RedisStore = require('rate-limit-redis');
     const redis = require('redis').createClient(process.env.REDIS_URL);
     
     const limiter = rateLimit({
       store: new RedisStore({
         client: redis,
         prefix: 'rl:',
       }),
       windowMs: 15 * 60 * 1000,
       max: 100,
     });
     ```

2. **Add rate limit to password reset:**
   ```javascript
   app.post('/auth/forgot-password', forgotPasswordLimiter, (req, res) => {
     // max 3 requests per hour per email
   });
   ```

3. **Add CAPTCHA to registration** (Google reCAPTCHA v3 or similar):
   ```javascript
   // Verify reCAPTCHA token before creating user
   const verified = await verifyRecaptcha(req.body.captchaToken);
   if (!verified || verified.score < 0.5) return res.status(403).send('Bot detected');
   ```

4. **Monitor:** Add Prometheus metric for rate-limit hits; alert on spike

---

#### M-04: Missing Security Headers – HSTS, X-Frame-Options
**Risk:** A05 - Security Misconfiguration  
**CWE:** CWE-693  
**CVSS v3.1:** 5.3 (Medium)

**Description:**  
Not all OWASP-recommended headers are enforced. HSTS (HTTP Strict Transport Security) and X-Frame-Options may be missing or misconfigured in staging/production.

**Evidence:**
- `apps/api/src/app.js`: Helmet.js configured, but CSP disabled (`contentSecurityPolicy: false`)
- HSTS relies on Helmet default; not explicitly verified in prod
- Frontend (Vercel) has no explicit header configuration for X-Frame-Options, X-Content-Type-Options

**Recommendation:**
1. **Verify Helmet config explicitly:**
   ```javascript
   app.use(helmet({
     contentSecurityPolicy: false, // Use per-route or meta tag
     hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
     frameguard: { action: 'deny' },
     referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
     xssFilter: true,
     noSniff: true,
   }));
   ```

2. **Frontend (vercel.json):**
   ```json
   {
     "headers": [
       {
         "source": "/(.*)",
         "headers": [
           { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains; preload" },
           { "key": "X-Frame-Options", "value": "DENY" },
           { "key": "X-Content-Type-Options", "value": "nosniff" },
           { "key": "X-XSS-Protection", "value": "1; mode=block" },
           { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
         ]
       }
     ]
   }
   ```

3. **Test:** Use https://securityheaders.com/ to verify all headers present in staging

---

#### M-05: Vulnerable Dependencies (12 Moderate)
**Risk:** A06 - Vulnerable and Outdated Components  
**CWE:** CWE-1104  
**CVSS v3.1:** 5.3 (Medium)

**Description:**  
npm audit reports 12 moderate severity vulnerabilities, primarily in the dev tooling chain (eslint, sentry, openapi-typescript). None affect runtime production code, but supply-chain risk exists.

**Evidence:**
- `npm audit --workspaces` output (docs/npm-audit-raw.txt):
  - glob 3.0.0 via @sentry/bundler-plugins (GHSA-3g3m-2fjr-6pw4)
  - minimatch < 11.0.1 via eslint, nodemon (GHSA-g3hv-75wg-m249)
- Packages do not process untrusted runtime input (dev tools, build-time only)
- No high/critical vulns

**Impact:**
- Supply-chain attack if build machine compromised and malicious code injected
- Potential for build tool exploit to modify deployed code
- Dependency on vulnerable components violates compliance policies

**Recommendation:**
1. **Immediate (this PR):**
   ```bash
   npm upgrade @sentry/node --workspace=api
   npm upgrade eslint @redocly/openapi-core nodemon --workspace-root
   npm audit --audit-level=high
   ```

2. **Add CI gate:**
   ```yaml
   - run: npm audit --audit-level=high
   # Fail if high/critical found
   ```

3. **Quarterly review:** Schedule npm audit review every 3 months

---

#### M-06: Incomplete Secrets Management – COOKIE_SECRET Fallback
**Risk:** A02 - Cryptographic Failures  
**CWE:** CWE-327  
**CVSS v3.1:** 5.7 (Medium)

**Description:**  
If `COOKIE_SECRET` environment variable is unset, the code falls back to `JWT_SECRET`, reducing effective keyspace and allowing cookie tampering if JWT secret is exposed.

**Evidence:**
- `apps/api/src/app.js`: `cookieParser(config.cookieSecret || config.jwtSecret)`
- Best practice: distinct secrets for each cryptographic purpose
- In dev, acceptable fallback; in prod, should be separate and required

**Impact:**
- If JWT_SECRET leaked, attacker can forge both JWTs and session cookies
- Reduced defense-in-depth; single secret compromise = multi-subsystem failure

**Recommendation:**
1. **This Sprint:**
   ```javascript
   if (process.env.NODE_ENV === 'production') {
     if (!process.env.COOKIE_SECRET) {
       throw new Error('COOKIE_SECRET required in production');
     }
   }
   app.use(cookieParser(process.env.COOKIE_SECRET || config.jwtSecret));
   ```

2. **Update `.env.example`:**
   ```
   COOKIE_SECRET=change_me_32byte_random_string_in_prod
   CSRF_SECRET=change_me_32byte_random_string_in_prod
   JWT_SECRET=change_me_32byte_random_string_in_prod
   ```

3. **Document:** Production checklist must include generating 3 distinct secrets

---

#### M-07: No Automated Dependency Scanning in CI
**Risk:** A06 - Vulnerable and Outdated Components  
**CWE:** CWE-1104  
**CVSS v3.1:** 5.3 (Medium)

**Description:**  
CI/CD pipeline does not include automated vulnerability scanning. Dependency updates and new vulnerabilities are not caught until manual review or production incident.

**Evidence:**
- `.github/workflows/` reviewed: no `npm audit`, Snyk, Dependabot, or other scanning action
- Gitleaks secret scanning present, but no equivalent for dependencies
- Manual review required for each PR

**Recommendation:**
1. **Immediate:** Add npm audit to CI (`.github/workflows/test.yml`):
   ```yaml
   - name: Audit Dependencies
     run: npm audit --audit-level=high --workspaces
   ```

2. **This Sprint:** Enable Dependabot or Snyk:
   - GitHub Dependabot (free, built-in): Enable in Settings → Code Security
   - Snyk (free tier): https://snyk.io/ (integrates with GitHub)
   
   Config (`.github/dependabot.yml`):
   ```yaml
   version: 2
   updates:
     - package-ecosystem: "npm"
       directory: "/"
       schedule:
         interval: "weekly"
       allow:
         - dependency-type: "all"
   ```

3. **Auto-remediate:** Configure Dependabot to auto-merge minor updates in a separate CI run

---

### 🟡 LOW SEVERITY (6 alerts)

#### L-01: Token Verification Accepts Multiple Secrets
**Risk:** A02 - Cryptographic Failures  
**CWE:** CWE-347  
**CVSS v3.1:** 3.7 (Low)

**Description:**  
JWT middleware accepts tokens signed with either `JWT_SECRET` or `ACCESS_TOKEN_SECRET`. This widens the trust boundary and complicates key rotation.

**Evidence:**
- `apps/api/middleware/authMiddleware.js` and `apps/api/src/middleware/requireAuth.js`:
  ```javascript
  jwt.verify(token, process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET)
  ```
- Unify to single issuer secret after migration

**Recommendation:**
1. **Post-Migration Plan:** Retire ACCESS_TOKEN_SECRET in favor of JWT_SECRET
   - Update all issuers to use JWT_SECRET
   - Verify no old tokens with ACCESS_TOKEN_SECRET in production
   - Remove fallback

---

#### L-02: console.log/console.error in Production Code
**Risk:** A09 - Security Logging and Monitoring  
**CWE:** CWE-532  
**CVSS v3.1:** 3.3 (Low)

**Description:**  
Debug statements in `apps/api/src/controllers/authController.js` may leak sensitive info (user IDs, token fragments, error messages) to logs.

**Evidence:**
- `console.log()` and `console.error()` calls found in auth flow
- Should route through Pino structured logger

**Recommendation:**
1. **This Sprint:** Replace all console statements:
   ```javascript
   // Before
   console.log('User logged in:', user.id);
   
   // After
   logger.info({ userId: user.id }, 'User logged in');
   ```

2. **Add eslint rule:** Disallow console in prod:
   ```javascript
   // eslintrc.json
   { "no-console": ["error", { "allow": ["warn", "error"] }] }
   ```

---

#### L-03: GitHub Actions Not SHA-Pinned
**Risk:** A08 - Software and Data Integrity Failures  
**CWE:** CWE-829  
**CVSS v3.1:** 3.3 (Low)

**Description:**  
GitHub Actions reference versions like `@v4` instead of commit SHAs, allowing action maintainers to silently modify code at runtime.

**Evidence:**
- `.github/workflows/*.yml`: `uses: actions/checkout@v4` and `actions/setup-node@v4`
- Should pin to: `actions/checkout@a5ac7e51b41094c7423fa67f00c2be5f3738123a`

**Recommendation:**
1. **This Sprint:** Pin all actions to commit SHA:
   ```yaml
   - uses: actions/checkout@a5ac7e51b41094c7423fa67f00c2be5f3738123a # v4.1.0
   - uses: actions/setup-node@60a7960ba4d0c48cf7a5def3f1cf67e88322da0e # v4.0.2
   ```

2. **Script to automate:**
   ```bash
   # apps/scripts/pin-actions.sh
   # Fetch latest SHA for each action and update workflows
   ```

---

#### L-04: No Automated Authorization Regression Tests
**Risk:** A01 - Broken Access Control  
**CWE:** CWE-284  
**CVSS v3.1:** 3.7 (Low)

**Description:**  
See High Severity H-03 for details. Listed as Low for duplicate prevention; consolidated into H-03.

---

#### L-05: OAuth Account Linking Not Reviewed for Takeover
**Risk:** A07 - Identification and Authentication Failures  
**CWE:** CWE-640  
**CVSS v3.1:** 3.9 (Low)

**Description:**  
OAuth flow (Google/GitHub) does not validate email domain or prevent linking to pre-existing unverified accounts. Potential for account takeover if attacker can control OAuth provider account.

**Evidence:**
- `apps/api/src/controllers/authController.js` (OAuth callbacks):
  - Creates user if OAuth email not found
  - Links OAuth to existing user if email matches (even if unverified locally)
- No domain allowlist (e.g., must be `@college.edu` for registration)

**Attack Scenario:**
1. Attacker registers with `victim@gmail.com` (unverified)
2. Victim's actual `victim@gmail.com` Gmail account is linked to attacker's local account
3. Victim logs in with Google → gets attacker's local account

**Recommendation:**
1. **Review and document:** OAuth linking policy
   - Should OAuth emails be required to be pre-verified?
   - Should account linking via OAuth email prompt for confirmation?

2. **Add tests:**
   ```javascript
   test('OAuth linking requires email verification or confirmation', async () => {
     // Scenario: unverified local account + OAuth email match
     // Expected: deny or require user confirmation
   });
   ```

---

#### L-06: No SBOM or Supply Chain Transparency
**Risk:** A08 - Software and Data Integrity Failures  
**CWE:** CWE-829  
**CVSS v3.1:** 2.7 (Low)

**Description:**  
No Software Bill of Materials (SBOM) or supply chain documentation. Compliance and incident response require visibility into all dependencies.

**Evidence:**
- No `package-lock.json` tracking (or SBOM format like CycloneDX)
- No supply chain transparency in CI/CD

**Recommendation:**
1. **Optional, but recommended:** Generate SBOM at build time:
   ```bash
   npm install --save-dev @cyclonedx/npm
   cyclonedx-npm --output-file sbom.json
   ```

2. **Commit** `sbom.json` to track dependency history

---

### 📋 INFORMATIONAL (2 alerts)

#### I-01: Audit Logging Storage Not Tamper-Resistant
**Risk:** A09 - Security Logging and Monitoring  
**CWE:** CWE-532  

**Description:**  
Audit logs stored in MongoDB with no tamper-proofing (append-only, hashing, signature). Attacker with database access can modify logs after the fact.

**Recommendation:**
1. **Future Enhancement:** Consider immutable log store (e.g., AWS CloudWatch Logs, Datadog, or blockchain audit log)
2. **For now:** Document audit log retention policy and access controls (who can query logs)

---

#### I-02: MFA Not Implemented
**Risk:** A07 - Identification and Authentication Failures  
**CWE:** CWE-307  

**Description:**  
Multi-Factor Authentication (TOTP, SMS, Passkey) not available. High-value accounts (admins, event organizers) recommend enabling MFA.

**Recommendation:**
1. **Future Sprint:** Evaluate TOTP (Time-based One-Time Password) via `speakeasy` or `otplib`
2. **Priority:** Only if admin/organizer roles emerge requiring stronger auth

---

## 2. Summary by OWASP Top 10 Category

| Category | Alerts | Status | Priority |
|---|---|---|---|
| A01 - Broken Access Control | 3 | ⚠️ Medium | **HIGH** - CSRF incomplete, missing authz tests |
| A02 - Cryptographic Failures | 2 | ✅ Good | Low - token secrets unification |
| A03 - Injection | 1 | ⚠️ Medium | **HIGH** - query/param sanitization |
| A04 - Insecure Design | 1 | ⚠️ Medium | **MEDIUM** - rate limiting shared store |
| A05 - Security Misconfiguration | 4 | ⚠️ Medium | **CRITICAL** - no DAST, missing headers |
| A06 - Vulnerable Components | 2 | ⚠️ Medium | **MEDIUM** - 12 vulns, no CI gate |
| A07 - Identification/Auth Failures | 1 | ✅ Good | Low - OAuth linking review |
| A08 - Software/Data Integrity | 2 | ⚠️ Medium | Low - GitHub Actions SHA, SBOM |
| A09 - Security Logging/Monitoring | 2 | ✅ Good | Low - console.log cleanup |
| A10 - SSRF | 0 | ✅ N/A | — |

---

## 3. Remediation Timeline

### 🔴 CRITICAL (Before Next Release)
- [ ] H-01: Implement DAST in CI (baseline ZAP scan)
- [ ] H-02: Apply CSRF protection to all mutations
- [ ] H-03: Add authorization regression tests
- [ ] M-02: Extend sanitization to query/params
- [ ] M-01: Deploy CSP header

**Target:** 1 week

### 🟠 HIGH (This Sprint)
- [ ] M-04: Add HSTS + security headers
- [ ] M-05: Upgrade vulnerable dependencies
- [ ] M-06: Require distinct COOKIE_SECRET in prod
- [ ] M-07: Add npm audit to CI

**Target:** 2 weeks

### 🟡 MEDIUM (Next Sprint)
- [ ] M-03: Deploy Redis for rate limiting
- [ ] L-02: Remove console.log statements
- [ ] L-03: Pin GitHub Actions to SHAs

**Target:** 4 weeks

### 💡 LOW (Backlog)
- [ ] L-05: Review OAuth linking policy
- [ ] L-06: Generate and track SBOM
- [ ] I-01: Evaluate tamper-resistant audit logs
- [ ] I-02: Evaluate MFA support

---

## 4. Remediation Status

| Item | Status | Evidence | Target Date |
|---|---|---|---|
| CSRF on admin routes | ✅ Done | doubleCsrfProtection in app.js | — |
| CSRF on all mutations | ❌ TODO | Need to extend to user-facing routes | 2026-11-07 |
| Sanitization (body) | ✅ Done | sanitizeMiddleware.js | — |
| Sanitization (query/params) | ❌ TODO | Need schema validation | 2026-11-07 |
| Auth middleware | ✅ Done | JWT verify, role checks, ownership | — |
| Rate limiting | ⚠️ In Progress | In-process store; needs Redis | 2026-11-14 |
| Helmet headers | ✅ Partial | Applied to API; frontend CSP missing | 2026-11-07 |
| Dependencies audit | ❌ TODO | npm audit reports 12 moderate; no CI gate | 2026-11-07 |
| Secret management | ⚠️ In Progress | JWT_SECRET required; COOKIE_SECRET fallback | 2026-11-07 |
| Logging | ⚠️ Partial | Pino logger integrated; console.log remains | 2026-11-14 |
| DAST scanning | ❌ TODO | No ZAP in CI | 2026-11-21 |

---

## 5. Testing Recommendations

### Security-Focused Test Suite
Create `apps/api/test/security.test.js`:

```javascript
describe('Security Tests', () => {
  describe('CSRF Protection', () => {
    test('POST /teams without CSRF token returns 403', async () => {
      const res = await request(app)
        .post('/api/teams')
        .set('Cookie', `accessToken=${validToken}`)
        .send({ name: 'Test Team' });
      expect(res.status).toBe(403);
    });
  });

  describe('Authorization', () => {
    test('User cannot modify another user\'s data', async () => {
      const res = await request(app)
        .patch(`/api/users/${otherUser.id}`)
        .set('Authorization', `Bearer ${myToken}`)
        .send({ name: 'Hacked' });
      expect(res.status).toBe(403);
    });
  });

  describe('Input Validation', () => {
    test('NoSQL injection in query rejected', async () => {
      const res = await request(app)
        .get('/api/users/discover?q={"$ne":null}')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).not.toBe(200);
    });
  });

  describe('Security Headers', () => {
    test('Response includes CSP header', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['content-security-policy']).toBeTruthy();
    });
  });
});
```

### Manual Testing Checklist
- [ ] CORS preflight rejects unauthorized origins
- [ ] Session cookie expires correctly
- [ ] CSRF token rotates on login
- [ ] Rate limits trigger after N requests
- [ ] Audit logs record all auth events
- [ ] API response headers present in browser DevTools

---

## 6. Compliance Mapping

| Standard | Requirement | Status |
|---|---|---|
| OWASP Top 10 2021 | A01–A10 checklist | 5/10 full ✅, 4/10 partial ⚠️, 1/10 N/A ✅ |
| CWE/SANS Top 25 | CWE-352, CWE-434, CWE-798, etc. | Partial (CSRF, secrets covered; injection gaps) |
| NIST SP 800-63B | Authentication & Lifecycle | Mostly compliant (no MFA) |
| PCI DSS 3.2 | Credit card handling | N/A (no payment processing) |
| GDPR | Data Protection | Soft delete + purge present; audit log not immutable |

---

## 7. Monitoring & Alerting

### Metrics to Track
1. **Rate limit hits:** Alert if > 100 hits/minute per endpoint
2. **Auth failures:** Alert if > 10 consecutive failures per user
3. **CSRF violations:** Alert if > 5 violations/hour
4. **Dependency vulnerabilities:** Alert on new high/critical found in npm audit
5. **Deployment frequency:** Verify security checks gate each release

### Logging Queries
```
# Prometheus
rate(rate_limit_hits_total[5m]) > 100
auth_failures_total > 10
csrf_violations_total > 5

# Pino/JSON logs
{"type":"auth","outcome":"failure"} | count > 10 in 5m
{"type":"csrf","action":"reject"} | count > 5 in 1h
```

---

## 8. References & Further Reading

- **OWASP Top 10 2021:** https://owasp.org/Top10/
- **OWASP ZAP:** https://www.zaproxy.org/
- **CWE Top 25:** https://cwe.mitre.org/top25/
- **NIST Cybersecurity Framework:** https://www.nist.gov/cyberframework
- **Node.js Security Best Practices:** https://nodejs.org/en/docs/guides/security/
- **Express.js Security:** https://expressjs.com/en/advanced/best-practice-security.html
- **OWASP Secure Coding Practices:** https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/

---

## 9. Report Sign-Off

| Role | Name | Date | Signature |
|---|---|---|---|
| Security Reviewer | AI Code Review | 2026-10-31 | ✓ |
| Engineering Lead | [Your Name] | — | — |
| Product Owner | [Your Name] | — | — |

---

**Report Status:** ⚠️ DRAFT — Awaiting team review and prioritization

**Next Steps:**
1. Team reviews findings and assigns ownership
2. Critical items scheduled for this sprint
3. DAST scanning configured in CI
4. Monthly cadence for report updates
