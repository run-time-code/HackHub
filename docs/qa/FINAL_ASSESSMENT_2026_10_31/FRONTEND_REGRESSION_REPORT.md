# Frontend Regression Report

**Date:** 2026-10-31  
**Commit:** `649338880a8a028e6713ab0270cc4f5c80b82f24`  
**Environment:** Local Windows

## Unit and component tests

**Command:** `npm test --workspace @hackhub/web`  
**Result:** **PASS**

| Metric | Result |
|---|---:|
| Test files passed | 8 |
| Tests passed | 32 |
| Failed | 0 |
| Duration | 4.80 seconds |

Coverage includes request handling, CSRF helpers, auth schemas, profile,
discovery, requests, ICS generation, and one axe accessibility smoke test.
These are component/helper assertions and do not establish that full user
journeys or API integration work.

## Browser regression tests

The three configured Chromium checks passed:

| Scenario | Result |
|---|---|
| Login page renders | PASS |
| Registration page renders | PASS |
| Empty login submission displays field validation | PASS |

Successful login/registration, authenticated navigation, logout, and
server-backed API workflows were not tested. During this local UI-only run,
the API base was explicitly pointed at unavailable loopback port 1 so the
browser could not reach staging or production.

## Result and limitations

Frontend unit/component status is **PASS** for the 32 assertions executed.
E2E status is **PASS - LIMITED** for the three listed rendering/validation
scenarios. Do not interpret these results as successful authentication,
complete API integration, or a full end-to-end user journey.

Raw output: `evidence/frontend-regression-output.txt` and
`evidence/playwright-e2e-output.txt`.
