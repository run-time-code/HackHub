# API Functional Test Report

**Date:** 2026-10-31  
**Environment:** Local-only assessment; no external API target used

## Current execution

No new HTTP API smoke or authenticated functional workflow was run. The
current API regression command fails while loading
`apps/api/middleware/authMiddleware.js` due to an unresolved logger import.
No isolated test database or dedicated verified local test accounts were
confirmed. The Playwright run used an intentionally unavailable loopback API
endpoint and therefore did not exercise API behavior.

Current status: **BLOCKED** for fresh API functional validation.

## Prior evidence reviewed

The archived technical functional output
(`docs/qa/archive/2026-10/evidence/technical-functional-test-output.txt`) and
final regression report record the previous `WA9_API_Test_Suite.ps1` outcome:

| Prior result | Count |
|---|---:|
| PASS | 5 |
| FAIL | 1 |
| REVIEW | 0 |
| BLOCKED | 6 |
| NOT RUN | 0 |
| Total | 12 |

The prior failure was invalid-email registration validation; its root cause
was not established in the submitted evidence. Six authenticated workflows
were blocked after the dedicated QA accounts returned HTTP 401. No test
credentials were reused and the script was not rerun.

The archived manual smoke report
(`docs/qa/archive/2026-10/MANUAL_API_SMOKE_TEST_RESULTS.md`) separately records
9/9 unauthenticated checks
passing against local `http://localhost:5000` on 2026-10-31. It expressly does
not cover authenticated create/update/delete workflows. These are historical
results, not current execution.

## Coverage disposition

| Area | Current status | Reason |
|---|---|---|
| Health and CSRF bootstrap | NOT RUN | No fresh API service validation |
| Invalid authentication | NOT RUN | No fresh API service validation |
| Registration and login | BLOCKED | API bootstrap failure; dedicated verified accounts unavailable |
| Profile retrieval/update | BLOCKED | Authenticated account and API test setup unavailable |
| Hackathon search | NOT RUN | Historical smoke evidence only |
| Saved-hackathon lifecycle | BLOCKED | Authenticated workflow not rerun |
| Reminder creation/duplicate handling | BLOCKED | Authenticated workflow not rerun |
| Team creation/membership | BLOCKED | Authenticated workflow not rerun |
| Notifications | BLOCKED | Authenticated workflow not rerun |
| Admin authorization | BLOCKED | No valid admin/non-admin test accounts |

Do not treat BLOCKED or historical results as FAIL or PASS for this assessment.
