# Security Assessment Report

**Date:** 2026-10-31  
**Method:** Review of submitted reports and source/configuration only  
**Runtime testing:** No new DAST, penetration test, or external-target request

## OWASP/ZAP evidence verification

**OWASP ZAP status: COMPLETED – TEAMMATE EVIDENCE SUBMITTED (subject to
report verification).**  
**Actual runtime OWASP ZAP scan status: NOT VERIFIED / NOT EVIDENCED.**

Evidence reviewed:

- `docs/OWASP_SECURITY_REPORT.md`
- `docs/OWASP_ZAP_DAST_REPORT.md`
- `zap_code_review_report.txt`
- `docs/npm-audit-raw.txt`

The submitted reports do not establish an actual ZAP runtime scan:

- The security report says OWASP ZAP/DAST was not done.
- The DAST-named report says its method was code-review-based and explicitly
  states that actual ZAP/DAST runtime scanning was not performed.
- `zap_code_review_report.txt` labels its method a static code-review
  simulation.
- The DAST-named report gives 18 alerts (3 high, 7 medium, 6 low, 2
  informational); the static report gives 14 alerts (3 high, 5 medium, 6
  low). These counts are not reconciled.
- The reports provide a date but no scan timestamp or target URL. They do not
  provide verifiable runtime alert output or false-positive dispositions.

This assessment did not repeat ZAP. The submitted evidence is recorded as
teammate-submitted static-review material, not proof of completed DAST.

## Findings and current source cross-check

| Finding | Severity | Evidence | Status | Recommended action |
|---|---|---|---|---|
| Runtime DAST is not evidenced; report methodologies/counts conflict | High - release assurance | Reports explicitly say runtime scan was not performed; totals differ (18 vs 14) | REVIEW REQUIRED | Security owner to reconcile the evidence and provide an authorized, verifiable runtime report or arrange an approved scan |
| Frontend CSP may block the deployed API | Medium - release/configuration | `vercel.json` sets `connect-src 'self'`; staging/production workflows inject a separate API URL from Render into `VITE_API_BASE_URL` | OPEN / REVIEW REQUIRED | Permit only the intended API origin(s), and validate API calls in a browser against the deployed-like configuration before release |
| Cookie signing secret falls back to JWT secret | Medium | `apps/api/src/app.js` uses `COOKIE_SECRET || config.jwtSecret` | OPEN | Require a distinct cookie secret in deployed environments and verify deployment configuration without exposing values |
| Token verification still accepts two secrets on the active source route | Low | `apps/api/src/middleware/requireAuth.js` checks `config.jwtSecret` and `ACCESS_TOKEN_SECRET`; this conflicts with the report's claimed unification | OPEN | Define a migration/issuer policy and remove the fallback only after token compatibility is addressed |
| Rate limiting uses an in-process store | Medium | `apps/api/src/app.js` and `apps/api/middleware/rateLimitMiddleware.js` use default `express-rate-limit` storage; deployment docs describe a single instance | OPEN / REVIEW REQUIRED | Keep deployment single-instance or adopt a shared store before horizontal scaling; validate limits safely |
| Dependency advisories and no CI audit gate | Medium | Submitted npm audit output reports 12 moderate advisories; inspected CI has no npm audit step | OPEN | Review the current lockfile advisories and add an agreed CI audit gate; do not run force upgrades blindly |
| Console calls remain in the legacy auth controller | Low | `apps/api/controllers/authController.js` contains `console.log`/`console.error`; static report claims they were routed through Pino | OPEN | Review logged data and route operational messages through the structured logger |
| CSRF coverage on reviewed mutation routes | High historically | Current route source attaches `doubleCsrfProtection` to auth/user/saved/team/join-request/reminder/notification/admin mutations; no runtime response was observed | FIXED - VERIFIED (source only) | Keep route coverage tests; rerun once API bootstrap is repaired |
| Input sanitization of body, query, and path parameters | Medium historically | `apps/api/middleware/sanitizeMiddleware.js` handles `req.body`, `req.query`, and `req.params` | FIXED - VERIFIED (source only) | Preserve schema validation and execute the relevant tests after API bootstrap repair |
| GitHub Actions SHA pinning | Low historically | Inspected CI and deployment workflows use commit SHA references | FIXED - VERIFIED (source) | Continue pinning and periodically review action revisions |
| Authorization regression coverage cannot be confirmed by this run | High assurance | Tests exist for auth and team workflows, but 15 API test results fail before assertions | REVIEW REQUIRED | Restore API test initialization and execute ownership/role denial assertions |

The source checks above do not constitute a penetration test. The API test
bootstrap error blocks runtime verification of CSRF, authorization, security
headers, session behavior, and rate-limit responses.

## Dependency and other OWASP areas

The submitted raw npm audit output reports 12 moderate findings involving
`glob` and `minimatch` dependency paths and no reported high/critical findings.
This assessment did not rerun `npm audit`; do not treat the submitted output as
a fresh audit. The CI workflow inspected has Gitleaks but no dependency audit
gate.

The older reports also discuss OAuth account linking, MFA, audit-log
immutability, frontend headers, and SSRF. These were not dynamically tested.
No claim is made that the application is vulnerability-free or compliant with
an OWASP category.

## Conclusion

The teammate report review is complete, but DAST completion is **not
verified**. Source inspection confirms several reported remediations, while
also identifying current gaps and contradictions. Release security sign-off
remains **REVIEW REQUIRED**.
