\# HackHub – Week 4 Final Regression Report



\*\*Work Area:\*\* WA9 – QA, Test Automation \& Release Management  

\*\*Owner:\*\* Deva Kanchana  

\*\*Week:\*\* 4  

\*\*Branch:\*\* `wa9/deva-qa-release`  

\*\*Execution Date:\*\* 31 October 2026



\## 1. Objective



The purpose of Week 4 regression testing was to validate the existing HackHub backend, frontend and browser-based authentication workflows before release-readiness assessment.



Testing was performed using Node.js built-in test runner, Vitest and Playwright.



\## 2. Automated Regression Summary



| Test Category | Test Files / Suites | Passed | Failed |

|---|---:|---:|---:|

| Backend API | 17 suites | 98 | 0 |

| Frontend | 8 files | 32 | 0 |

| Browser E2E | 3 tests | 3 | 0 |

| \*\*Total\*\* | | \*\*133\*\* | \*\*0\*\* |



All three automated test categories completed successfully.



\## 3. Backend Regression Results



\*\*Command:\*\* `npm test --workspace @hackhub/api`



| Metric | Result |

|---|---:|

| Test suites | 17 |

| Tests passed | 98 |

| Tests failed | 0 |

| Cancelled | 0 |

| Skipped | 0 |

| Todo | 0 |

| Duration | Approximately 13.41 seconds |



Coverage included authentication, session handling, security, profiles, discovery, hackathons, reminders, calendar, teams, notifications, rate limiting, health and feedback.



Nonfatal audit-log teardown warnings were observed. They did not cause test failures.



\*\*Result: PASS\*\*



\## 4. Frontend Regression Results



\*\*Command:\*\* `npm test --workspace @hackhub/web`



| Metric | Result |

|---|---:|

| Test files passed | 8 |

| Tests passed | 32 |

| Test files failed | 0 |

| Tests failed | 0 |

| Duration | Approximately 1.43 seconds |



Frontend test coverage included API request handling, CSRF, authentication schemas, profiles, discovery, requests, ICS functionality and accessibility-related tests.



A test discovery conflict was identified because Vitest initially attempted to execute the Playwright E2E file.



The Vite configuration was updated to exclude `\*\*/e2e/\*\*` from Vitest discovery while preserving the React and Tailwind plugins.



The subsequent frontend test run completed successfully.



\*\*Result: PASS\*\*



\## 5. Playwright Browser E2E Results



\*\*Tool:\*\* Playwright  

\*\*Browser:\*\* Chromium  

\*\*Configuration:\*\* `apps/web/playwright.config.js`



| Test ID | Scenario | Result |

|---|---|---|

| E2E-001 | Login page renders correctly | PASS |

| E2E-002 | Registration page renders correctly | PASS |

| E2E-003 | Empty login form displays validation errors | PASS |



| Metric | Result |

|---|---:|

| Tests executed | 3 |

| Passed | 3 |

| Failed | 0 |

| Duration | Approximately 5.1 seconds |



The tests validate authentication-page rendering and client-side validation.



Successful login, successful registration, authenticated discovery and team workflows remain outside the current browser E2E coverage.



\*\*Result: PASS\*\*



\## 6. Technical Functional API Test Results



The separate integrated API test suite was executed using `WA9\_API\_Test\_Suite.ps1`.



| Result | Count |

|---|---:|

| PASS | 5 |

| FAIL | 1 |

| REVIEW | 0 |

| BLOCKED | 6 |

| NOT RUN | 0 |

| \*\*Total\*\* | \*\*12\*\* |



The invalid-email registration validation scenario failed.



Authentication for the three dedicated QA accounts returned HTTP 401, preventing the execution of profile, saved hackathon, reminder, team, notification and admin workflows.



These results are reported separately from automated regression results.



\*\*Result: PARTIAL – FOLLOW-UP REQUIRED\*\*



\## 7. Manual API Smoke Test Results



The Week 2 manual API smoke test recorded nine successful checks:



\- API health.

\- Hackathon catalogue.

\- Hackathon facets.

\- Team endpoint validation.

\- Authentication enforcement for reminders.

\- Authentication enforcement for notifications.

\- Authentication enforcement for saved hackathons.

\- Saved-hackathon status authentication.

\- Admin endpoint authorization.



\*\*Recorded result: 9 PASS, 0 FAIL.\*\*



These are previously recorded smoke-test results, not a new Week 4 execution.



\## 8. Evidence Files



| File | Evidence |

|---|---|

| `backend-regression-output.txt` | Week 4 backend test output |

| `frontend-regression-output.txt` | Week 4 frontend test output |

| `playwright-e2e-output.txt` | Week 4 browser E2E output |

| `technical-functional-test-output.txt` | Integrated API functional test output |

| `AUTHENTICATION\_OBSERVATION.md` | Authentication investigation record |



\## 9. Outstanding Issues



| ID | Issue / Action | Status |

|---|---|---|

| REG-001 | Investigate invalid-email registration test failure | OPEN |

| REG-002 | Configure valid, verified QA accounts | BLOCKED |

| REG-003 | Execute authenticated API workflows | PENDING |

| REG-004 | Expand successful-login and registration E2E coverage | PENDING |

| REG-005 | Investigate the initial load-test login HTTP 500 | OPEN |

| REG-006 | Complete controlled performance retesting | PENDING |

| REG-007 | Complete student UAT with 10–15 participants | PENDING |



\## 10. Conclusion



Week 4 automated regression testing completed successfully across the backend, frontend and Playwright browser test categories.



A total of 133 automated test executions passed with zero failures.



However, the separate technical functional API suite recorded one failure and six blocked scenarios. Authenticated workflows therefore require additional validation.



The successful automated regression results do not independently establish complete application readiness or release approval.



\*\*Automated regression status: PASS\*\*



\*\*Technical functional API status: PARTIAL – FOLLOW-UP REQUIRED\*\*



\*\*Overall Week 4 QA sign-off: PENDING\*\*

