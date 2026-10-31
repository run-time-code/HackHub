\# HackHub – Week 3 QA Completion Report



\*\*Work Area:\*\* WA9 – QA, Test Automation \& Release Management  

\*\*Owner:\*\* Deva Kanchana  

\*\*Week:\*\* 3  

\*\*Branch:\*\* `wa9/deva-qa-release`  

\*\*Execution Date:\*\* 31 October 2026



\## 1. Objective



Week 3 focused on browser-based end-to-end testing, reminder scheduler validation and performance/load testing of the HackHub application.



The objective was to validate important user-facing workflows, confirm scheduled reminder behavior and evaluate API performance under concurrent requests.



\## 2. Summary of Execution



| Task | Activity | Result |

|---|---|---|

| W3.T1 | Playwright browser E2E testing | 3 passed |

| W3.T2 | Reminder scheduler testing | 98 passed |

| W3.T3 | API load testing | Executed – failed error-rate threshold |



\## 3. W3.T1 – Playwright E2E Testing



\*\*Tool:\*\* Playwright  

\*\*Browser:\*\* Chromium



Three browser tests were implemented and executed.



| Test ID | Scenario | Result |

|---|---|---|

| E2E-001 | Login page renders correctly | PASS |

| E2E-002 | Registration page renders correctly | PASS |

| E2E-003 | Empty login form displays validation errors | PASS |



\*\*Execution result:\*\*

\- Tests passed: 3

\- Tests failed: 0

\- Browser: Chromium



The tests confirm authentication-page rendering and client-side validation.



\*\*Limitations:\*\* Successful authentication, account registration, discovery, team workflows and other authenticated journeys have not yet been covered by these three E2E tests.



\## 4. W3.T2 – Reminder Scheduler Testing



The reminder scheduler was tested for delivery behavior, duplicate prevention, quiet hours and failure isolation.



An additional test was introduced to verify that reminders falling within overnight quiet hours are postponed until the exact end of the quiet-hours period in Indian Standard Time.



\*\*Execution result:\*\*



| Metric | Result |

|---|---:|

| Test suites | 17 |

| Tests passed | 98 |

| Tests failed | 0 |

| Tests skipped | 0 |

| Tests cancelled | 0 |



The new quiet-hours test verified that a reminder due during quiet hours was postponed to the expected IST end time, without creating a notification or marking the reminder as delivered.



\*\*Limitations:\*\*

\- Actual email-provider delivery and inbox receipt were not verified.

\- The scheduler uses a fixed IST offset; daylight-saving behavior in other time zones was not tested.

\- Nonfatal teardown log warnings were observed, although the test run completed with 98 passing tests.



\*\*Overall scheduler test result: PASS\*\*



\## 5. W3.T3 – API Load Testing



\*\*Tool:\*\* k6  

\*\*Environment:\*\* Local development environment  

\*\*API port:\*\* 5100  

\*\*Load:\*\* 100 virtual users  

\*\*Duration:\*\* 30 seconds



The workload included browsing, searching and login scenarios.



\### 5.1 Execution results



| Metric | Result |

|---|---:|

| Maximum virtual users | 100 |

| Total iterations | 2,959 |

| HTTP requests | 2,962 |

| Failed requests | 89.90% |

| Successful checks | 10.09% |

| Average HTTP duration | 22.53 ms |

| Median HTTP duration | 2.04 ms |

| 90th percentile | 16.05 ms |

| 95th percentile | 68.51 ms |

| Maximum HTTP duration | 710.11 ms |

| Throughput | 81.37 requests/sec |



\### 5.2 Threshold evaluation



| Threshold | Expected | Actual | Result |

|---|---|---|---|

| HTTP failure rate | Below 1% | 89.90% | FAIL |

| HTTP p95 latency | Below 1,000 ms | 68.51 ms | PASS |



\*\*Overall load-test result: EXECUTED – FAILED THRESHOLD\*\*



\### 5.3 Identified rate-limit issue



The API uses a global rate limiter configured in `apps/api/src/app.js`.



\- Limit: 300 requests

\- Window: 15 minutes

\- Scope: Shared client IP



Because all virtual users originated from the same local IP, the test exhausted the shared request allowance.



The resulting HTTP responses included:

\- HTTP 429 – Too Many Requests

\- `ratelimit-remaining: 0`

\- `retry-after: 832` seconds in the observed response



Both browsing and search endpoints returned HTTP 429 during the exhausted rate-limit window.



\### 5.4 Login error investigation



The load-test output also recorded an initial HTTP 500 response during login, followed by HTTP 429 responses.



The authentication controller catches unexpected errors and returns a generic `Server error` response.



The original HTTP 500 has not yet been traced to its underlying exception because the relevant backend stack trace has not been obtained.



It must remain an unresolved investigation item.



\### 5.5 Limitations



\- The test was conducted in a local development environment.

\- All virtual users shared one IP address.

\- CPU, memory and database connection-pool metrics were not collected.

\- The initial login HTTP 500 remains unexplained.

\- The test does not establish the maximum API capacity of the application.



\## 6. Evidence Files



The following evidence files were created:



| Evidence file | Description |

|---|---|

| `load-test-output.txt` | Raw k6 execution output |

| `LOAD\_TEST\_REPORT.md` | Detailed load-test report |

| `scheduler-test-output.txt` | Raw scheduler test output |

| `SCHEDULER\_TEST\_RESULTS.md` | Scheduler test results |



The Playwright configuration and E2E test files are located under `apps/web/`.



\## 7. Outstanding Actions



| ID | Action | Status |

|---|---|---|

| W3-P01 | Configure an isolated test-only rate-limit setup for controlled load testing | PENDING |

| W3-P02 | Investigate the initial login HTTP 500 | PENDING |

| W3-P03 | Verify successful login under controlled load | PENDING |

| W3-P04 | Collect CPU, memory and database resource metrics | PENDING |

| W3-P05 | Expand E2E coverage to authenticated workflows | PENDING |



\## 8. Conclusion



Week 3 testing activities were executed across browser E2E testing, reminder scheduling and API load testing.



Playwright completed three tests successfully. The reminder scheduler test run completed with 98 passing tests and zero failures.



The load test was executed with 100 virtual users but failed the HTTP error-rate threshold. Investigation identified exhaustion of the shared IP-based API rate limit as a major cause of the failures. An initial login HTTP 500 also remains unresolved.



The load-test result must not be classified as PASS. Controlled performance retesting and further authentication investigation remain necessary.



\*\*Week 3 execution status: COMPLETED WITH OUTSTANDING ISSUES\*\*



\*\*Week 3 QA sign-off: PENDING\*\*



