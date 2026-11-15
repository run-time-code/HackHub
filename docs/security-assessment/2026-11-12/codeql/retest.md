# CodeQL - Security Retest Report

## 1. Retest Information

- Tool: GitHub CodeQL CLI 2.27.4
- Retest date: 14 November 2026
- Original finding IDs: CQL-001 through CQL-008
- Patch commit: None
- Environment: Windows 11, PowerShell 5.1, Node.js v24.18.0
- Retest type: Supporting authentication/OAuth regression tests; not a post-remediation CodeQL retest.

## 2. Original Vulnerability

The CodeQL analysis identified potential prototype manipulation and log-injection weaknesses, along with other security and code-quality alerts.

No source-code patch was applied during this assessment. Consequently, the original potential weaknesses have not been demonstrated to be fixed.

## 3. Retest Method

The following supporting tests were executed:

`node --test apps/api/test/auth-security.test.js`

The test output was saved as:

`evidence/codeql-oauth-security-tests-2026-11-14.txt`

The tests cover:

- Atomic login lockout after concurrent failed attempts.
- Clearing the lockout after its expiry.
- Generic 401 responses for unknown accounts.
- Issuing a signed OAuth state cookie and state parameter.
- Rejection of missing or forged OAuth state before Passport runs.

The original static analysis is retained in:

- `evidence/codeql-javascript-analysis-2026-11-14.txt`
- `evidence/codeql-javascript-results-2026-11-14.sarif`

## 4. Retest Results

| Check | Before Fix | After Fix / Current Result |
|---|---|---|
| CodeQL static analysis | No prior comparison baseline supplied | 143 alerts in the 14 November analysis |
| Prototype manipulation | Potential weakness identified | Not retested; no patch applied |
| Log injection | Potential weakness identified | Not retested; no patch applied |
| OAuth state verification | Existing implementation under assessment | Supporting tests passed |
| Login lockout | Existing implementation under assessment | Supporting tests passed |
| Authentication test suite | No prior comparison baseline supplied | 4 passed, 0 failed |

The four passing tests are supporting regression evidence. They do not prove that the prototype-manipulation or log-injection concerns have been fixed.

Non-failing audit-log cleanup warnings were observed during test teardown.

## 5. Evidence

Evidence directory:

`docs/security-assessment/2026-11-12/codeql/evidence/`

- `codeql-javascript-analysis-2026-11-14.txt`
- `codeql-javascript-results-2026-11-14.sarif`
- `codeql-oauth-security-tests-2026-11-14.txt`

## 6. Final Status

- [ ] Fixed and verified
- [ ] Partially fixed
- [x] Not fixed
- [ ] Unable to retest
- [ ] Not applicable

The supporting authentication/OAuth tests passed, but no vulnerability-specific remediation retest was possible because no source patch was applied.

## 7. Conclusion

The CodeQL assessment and supporting authentication/OAuth tests completed successfully.

All four supporting tests passed. However, the potential prototype-manipulation and log-injection weaknesses remain open. No post-fix CodeQL scan or vulnerability-specific regression test was performed.

A future retest must include the approved source fixes, regression tests for the affected inputs, and a fresh CodeQL database analysis with the same query suite and documented scope.
