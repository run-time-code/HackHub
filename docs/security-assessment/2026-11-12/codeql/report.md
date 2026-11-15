# CodeQL - Vulnerability Assessment Report

## 1. Assessment Information

- Tool: GitHub CodeQL CLI
- Tool version: 2.27.4
- Assessment date: 14 November 2026
- Tester: Repository security assessment
- Repository: run-time-code/HackHub
- Branch: wa9/deva-qa-release
- Target: Local HackHub repository source
- Environment: Windows 11, PowerShell 5.1, Node.js v24.18.0
- Analysis language: JavaScript
- Query suite: javascript-security-and-quality.qls

## 2. Objective

Perform static application security testing (SAST) to identify potentially insecure source-code patterns, security weaknesses, and code-quality issues in the HackHub JavaScript/TypeScript codebase.

## 3. Scope

- Authorized target: Local HackHub repository.
- Components tested: JavaScript/TypeScript source and GitHub Actions files included in the CodeQL database.
- Database source root: Repository root.
- Analysis coverage reported by CodeQL: 335 JavaScript/TypeScript files and 4 GitHub Actions files.
- Excluded components: No separate Python CodeQL database was created for this assessment.
- Scope limitation: The database was created from the repository root. Generated files, local tool directories, third-party files, and test artifacts were also represented in some results. These results require source-path triage and must not automatically be treated as application vulnerabilities.

## 4. Testing Methodology

CodeQL CLI was downloaded from the official GitHub CodeQL bundle release.

The downloaded archive SHA-256 was verified against the published checksum:

`d67fead75936c55a241d26c25342747b07f94664b104f719dfe291b665508c4d`

The CLI version was verified as 2.27.4.

A JavaScript database was created from the repository root using:

`codeql database create .security-tools\codeql-db-hackhub-js --language=javascript --source-root=<repository-root> --threads=2`

The database was analyzed using:

`codeql database analyze .security-tools\codeql-db-hackhub-js <javascript-security-and-quality.qls> --format=sarif-latest --output=<SARIF-file> --threads=2`

The selected query suite includes security and code-quality queries.

The resulting SARIF file was parsed and grouped using the rule metadata severity. Relevant findings were manually compared with application source, middleware, route configuration, and deployment configuration.

Supporting authentication tests were executed:

`node --test apps/api/test/auth-security.test.js`

The test output was saved separately in the evidence directory.

## 5. Findings

The following entries distinguish potential application weaknesses from alerts that were not confirmed as vulnerabilities.

| ID | Finding | Severity / classification | Affected component | Status |
|---|---|---|---|---|
| CQL-001 | Potential prototype manipulation through unfiltered object keys | Potential security weakness | `apps/api/middleware/sanitizeMiddleware.js` | Open; runtime exploitability not established |
| CQL-002 | User-controlled values interpolated into application log messages | Potential security weakness | `apps/api/controllers/hackathonTrackingController.js` | Open; exploitability not demonstrated |
| CQL-003 | Missing-rate-limiting query alerts | Requires manual validation | Multiple reported locations | Not confirmed; global API limiter identified |
| CQL-004 | SQL-injection query alerts | Likely false positives for SQL injection | Mongoose query operations in API and backend controllers/services | No raw SQL sink demonstrated; NoSQL review remains separate |
| CQL-005 | Incomplete multi-character sanitization | Potential sanitization weakness | `apps/api/src/services/devpostIngestionService.js` | No executable XSS path demonstrated |
| CQL-006 | SameSite=None cookie recommendation | Hardening observation | `apps/api/middleware/rateLimitMiddleware.js` | OAuth state verification tests passed; deployment flow requires review |
| CQL-007 | Missing-token-validation alerts | Requires manual validation | Legacy and active API-related locations | Not confirmed |
| CQL-008 | Other security and code-quality alerts | Mixed / informational | Application, generated, and third-party files | Requires individual triage |

### 5.1 Potential prototype manipulation

CodeQL reported `js/remote-property-injection` in `apps/api/middleware/sanitizeMiddleware.js`.

The inspected implementation creates a regular object and assigns recursively sanitized properties using a user-controlled key. A key such as `__proto__` is not explicitly rejected in the inspected assignment path. The file also declares `DANGEROUS_KEYS`, but the inspected implementation does not use that set to filter keys.

This is a credible object-prototype manipulation concern. The assessment did not demonstrate global prototype pollution or a successful runtime exploit.

Recommended action: reject dangerous property names before assignment and add regression tests for `__proto__`, `constructor`, and `prototype`.

### 5.2 Potential log injection

CodeQL reported four `js/log-injection` alerts in `hackathonTrackingController.js`.

The inspected controller interpolates a request-supplied hackathon value into log messages. Presence validation was observed, but the inspected code did not establish comprehensive type, length, or control-character validation.

An attacker-controlled newline or control character could make log records misleading if accepted by the logging path. No runtime log-forging exploit was demonstrated.

Recommended action: validate the input type and length, reject control characters, and use structured logging with separate fields.

### 5.3 Rate-limiting alerts

CodeQL reported 35 `js/missing-rate-limiting` alerts.

Inspection of the active API application showed a global API rate limiter mounted before the API routes, configured for 300 requests per 15 minutes. Separate authentication rate limiting was also present.

Consequently, the 35 alerts must not be interpreted as 35 confirmed unprotected endpoints. Individual route coverage, sensitive operations, and deployment configuration still require review.

### 5.4 SQL-injection alerts

CodeQL reported 21 `js/sql-injection` alerts.

The inspected operations predominantly use Mongoose methods such as `findOne`, `findById`, `find`, `findOneAndUpdate`, and `countDocuments` with JavaScript query objects. No raw SQL execution sink was demonstrated in the inspected locations.

These alerts are therefore treated as likely SQL-injection false positives, not confirmed vulnerabilities. This does not rule out NoSQL injection. Dynamic filters, regular expressions, and user-controlled query operators require separate review, especially in backend-prototype code whose deployment status was not established.

### 5.5 Sanitization and XSS-related alert

CodeQL reported `js/incomplete-multi-character-sanitization` in `devpostIngestionService.js`.

The inspected `cleanText` helper uses regular-expression replacement to remove markup-like strings. This is not a complete HTML sanitization strategy.

The inspected React components render the description as ordinary JSX text, which React escapes by default. No production `dangerouslySetInnerHTML` path was identified in the inspected references. Therefore, this alert does not establish an exploitable XSS vulnerability.

Recommended action: use a well-defined plain-text normalization or HTML sanitization strategy appropriate to the data's intended use.

### 5.6 OAuth cookie and token-validation alerts

The OAuth state cookie uses a signed, random state value and callback verification. The callback checks the supplied state before Passport runs.

The supporting tests verified that missing and forged state values are rejected. The `SameSite=None` alert remains a hardening consideration; changing the cookie policy requires validating the actual OAuth provider redirect flow.

The missing-token-validation alerts also include locations that appear to be legacy or unrelated to actual token validation. They were not classified as confirmed vulnerabilities.

## 6. Evidence

Evidence is stored in:

`docs/security-assessment/2026-11-12/codeql/evidence/`

Files:

- `codeql-javascript-analysis-2026-11-14.txt`
- `codeql-javascript-results-2026-11-14.sarif`
- `codeql-oauth-security-tests-2026-11-14.txt`

The SARIF file contains the original analysis results. The text analysis log records the CodeQL execution.

Supporting test evidence records:

- Tests: 4
- Passed: 4
- Failed: 0
- Skipped: 0
- Cancelled: 0

The test log contains audit-log cleanup warnings after test execution. These did not cause test failures.

## 7. Impact Analysis

Potential prototype manipulation could affect the integrity of objects created during request sanitization and could contribute to unsafe downstream behavior.

Potential log injection could compromise the reliability of security and operational logs.

Insufficient rate limiting on sensitive endpoints, if present after route-level validation, could increase exposure to brute-force or resource-exhaustion attacks.

Unsafe dynamic NoSQL filters could allow unauthorized query behavior if untrusted operators or filter structures reach database operations.

The inspected SQL-injection alerts did not establish raw SQL execution. Generated and third-party findings must be assessed separately from first-party application code.

## 8. Assessment Result

- Total SARIF alerts: 143
- Error-level alerts: 29
- Warning-level alerts: 88
- Note-level alerts: 26
- Confirmed exploitable vulnerabilities: 0 demonstrated by this assessment
- Potential application security weaknesses requiring follow-up: 2
- Other security and hardening observations: Present
- Supporting authentication/OAuth tests: 4 passed, 0 failed

The SARIF severity counts represent query-result classifications, not verified vulnerability severity counts.

The assessment does not establish that the application is free of vulnerabilities. Findings remain subject to manual validation and runtime testing.

## 9. Conclusion

CodeQL completed JavaScript static analysis successfully and produced a valid SARIF report containing 143 alerts.

Manual triage identified potential prototype manipulation and log-injection weaknesses requiring follow-up. Several high-count alert groups were not confirmed as vulnerabilities, including Mongoose operations reported as SQL injection and missing-rate-limiting alerts in an application with a global API limiter.

Supporting authentication and OAuth security tests passed all four cases.

No source-code remediation was performed as part of this assessment. The potential weaknesses remain open pending approved fixes and dedicated retesting.

## 10. References

- GitHub CodeQL documentation: https://docs.github.com/en/code-security/code-scanning
- CodeQL CLI documentation: https://docs.github.com/en/code-security/codeql-cli
- OWASP Input Validation Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
- OWASP Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- OWASP NoSQL Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/NoSQL_Security_Cheat_Sheet.html
