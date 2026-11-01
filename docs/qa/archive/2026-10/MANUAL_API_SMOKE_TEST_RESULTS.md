# HackHub – Week 2 Manual API Smoke Test Results

**Work Area:** WA9 – QA  
**Owner:** Deva Kanchana  
**Execution Date:** 31 October 2026  
**Execution Time:** 12:49:49 PM IST  
**Environment:** Local Windows environment  
**API Base URL:** `http://localhost:5000`  
**Test Type:** Manual API smoke and unauthenticated access-control checks

## 1. Execution Summary

| Metric | Result |
|---|---:|
| Checks executed | 9 |
| Passed | 9 |
| Failed | 0 |
| Blocked | 0 |
| Overall result | **PASS** |

## 2. Detailed Test Results

| # | Test | Method | Endpoint | Expected Status | Actual Status | Result |
|---:|---|---|---|---:|---:|---|
| 1 | Health endpoint | GET | `/api/health` | 200 | 200 | PASS |
| 2 | Hackathon catalogue | GET | `/api/hackathons` | 200 | 200 | PASS |
| 3 | Hackathon facets | GET | `/api/hackathons/facets` | 200 | 200 | PASS |
| 4 | Team listing without required hackathonId | GET | `/api/teams` | 400 | 400 | PASS |
| 5 | Protected reminders without login | GET | `/api/reminders` | 401 or 403 | 401 | PASS |
| 6 | Protected notifications without login | GET | `/api/notifications` | 401 or 403 | 401 | PASS |
| 7 | Protected saved items without login | GET | `/api/saved` | 401 or 403 | 401 | PASS |
| 8 | Protected legacy saved tracking without login | GET | `/api/saved-hackathons/status/test` | 401 or 403 | 401 | PASS |
| 9 | Protected admin reports without login | GET | `/api/admin/reports` | 401 or 403 | 401 | PASS |

## 3. Observations

- The health endpoint returned HTTP 200.
- The hackathon catalogue and facets endpoints returned HTTP 200.
- The teams endpoint rejected a request missing its required `hackathonId` query parameter with HTTP 400.
- Protected reminders, notifications, saved items, legacy saved-hackathon tracking, and admin reports rejected unauthenticated requests with HTTP 401.
- All nine tested requests returned their expected HTTP status codes.

## 4. Scope and Limitations

- This was a manual API smoke test, not a complete functional or security assessment.
- Authenticated create, update, and delete workflows were not executed.
- Admin authorization using a valid non-admin account was not tested. Only unauthenticated access was checked.
- The local database was previously found to contain zero user accounts.
- Valid, email-verified QA accounts are required for authenticated workflow testing.
- The remaining manual functional test cases are not considered passed by this smoke test.

## 5. Evidence and Reproduction

The results were captured using PowerShell and `Invoke-WebRequest -UseBasicParsing` against `http://localhost:5000`.

The expected and actual HTTP status codes are recorded in the detailed results table above.

## 6. Conclusion

**Manual API smoke test status: PASS (9/9 checks).**

The tested public endpoints were reachable, the teams endpoint enforced its required query parameter, and the tested protected endpoints rejected unauthenticated requests.

Authenticated workflow validation remains pending.
