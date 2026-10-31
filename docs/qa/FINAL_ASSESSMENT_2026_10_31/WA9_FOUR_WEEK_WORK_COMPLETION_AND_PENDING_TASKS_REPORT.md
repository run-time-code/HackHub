# HACKHUB
# WA9 – QA, TEST AUTOMATION & RELEASE MANAGEMENT

## Four-Week Work Completion and Pending Tasks Report

**Prepared by:** Deva Kanchana  
**Work Area:** WA9 – QA, Test Automation & Release Management  
**Repository:** run-time-code/HackHub  
**Working Branch:** `wa9/deva-qa-release`  
**Reporting Date:** 31 October 2026  
**Last Previously Assessed Commit:** `649338880a8a028e6713ab0270cc4f5c80b82f24`  
**Latest Local Regression:** 31 October 2026

> **Report basis:** This report consolidates the existing Week 1–4 QA documentation, previously recorded test evidence and the latest local backend regression execution. It distinguishes historical results from the latest local results. The latest test corrections have not yet been confirmed as committed or pushed.

---

# 1. EXECUTIVE SUMMARY

This report summarizes the QA activities performed during Weeks 1–4 of the HackHub project. It covers test planning, API and frontend testing, automated regression, browser automation, reminder scheduler validation, performance testing, security assessment, accessibility, user acceptance testing and release preparation.

During this period, QA documentation and automated test coverage were developed and maintained. Backend and frontend tests were executed, browser-based E2E tests were introduced, reminder scheduler behavior was validated, and performance testing was attempted.

The latest backend regression execution completed successfully when the test suites were run sequentially.

### Latest verified local results

| Test area | Result |
|---|---:|
| Backend regression | 98 passed across 17 suites |
| Backend failures | 0 |
| Backend cancellations | 0 |
| Frontend regression | 32 passed across 8 files (previously recorded Week 4 run) |
| Playwright E2E | 3 passed (previously recorded Week 4 run) |
| API lint | PASS (previously recorded Week 4 run) |
| Frontend lint | PASS (previously recorded Week 4 run) |
| Frontend build | PASS with chunk-size advisory warning (previously recorded Week 4 run) |

The backend result was obtained using sequential test execution. An earlier parallel execution produced 86 passing tests and 12 cancellations because the join-request suite encountered a CSRF setup error.

Performance testing remains incomplete because an earlier load test exceeded its HTTP failure-rate threshold. Security, accessibility, UAT and release-readiness activities also require further work.

**Overall QA status: IN PROGRESS**

**Final QA sign-off: PENDING**

**Release approval: PENDING**

# 2. WEEK 1 – QA FOUNDATION AND TEST PLANNING

### Objective

Establish the QA foundation for HackHub by defining testing standards, acceptance criteria, tools and defect-management procedures.

### Tasks completed

1. Test Strategy and Planning.
2. Test Tooling Setup.
3. Acceptance Criteria Definition.
4. Bug Report Template Preparation.
5. Bug Severity Classification.
6. Dependency Audit Documentation.
7. Test Execution Reporting.

### Deliverables created

Location: `docs/qa/WEEK_1/`

| File | Purpose |
|---|---|
| TEST_STRATEGY.md | Defines testing approach and scope |
| TEST_TOOLING.md | Documents QA tools and configuration |
| ACCEPTANCE_CRITERIA.md | Defines feature acceptance conditions |
| BUG_REPORT_TEMPLATE.md | Standard defect reporting template |
| BUG_SEVERITY.md | Defines defect severity levels |
| DEPENDENCY_AUDIT.md | Dependency audit documentation |
| TEST_EXECUTION_REPORT.md | Test execution reporting format |

### Completion status

**WEEK 1: DOCUMENTATION COMPLETED**

The seven QA documents were included in the earlier Week 1–2 submission.

# 3. WEEK 2 – FUNCTIONAL, API AND REGRESSION TESTING

### Objective

Validate HackHub backend APIs, frontend functionality, application builds, data quality and existing automated test coverage.

### Tasks completed

1. Backend API test execution.
2. Frontend automated test execution.
3. API manual smoke testing.
4. Functional test case preparation.
5. Regression testing.
6. Data quality validation.
7. Build and lint verification.
8. Test evidence documentation.

### 3.1 Historical backend testing results

Command:

`npm test --workspace @hackhub/api`

| Metric | Historical result |
|---|---:|
| Test suites | 17 |
| Tests passed | 97 |
| Tests failed | 0 |
| Cancelled | 0 |
| Skipped | 0 |

**Historical backend result: PASS**

The latest backend regression result is documented separately in Section 5.

### 3.2 Frontend testing results

| Metric | Historical result |
|---|---:|
| Tests passed | 32 |
| Tests failed | 0 |

**Frontend result: PASS**

### 3.3 Manual API smoke testing

Nine API smoke checks were previously recorded as successful.

The checks covered:

- API health.
- Hackathon catalogue.
- Hackathon facets.
- Team endpoint validation.
- Reminder authentication.
- Notification authentication.
- Saved hackathon authentication.
- Saved-hackathon status authentication.
- Admin endpoint authorization.

**Historical result: 9 PASS, 0 FAIL**

These checks primarily establish unauthenticated endpoint behavior and validation. They do not establish complete authenticated create, update and delete workflows.

### 3.4 Data quality validation

The Week 2 data quality report recorded:

- 12 planned checks.
- 11 PASS.
- 1 NOT VERIFIED.

The checks covered profile validation, privacy, hackathon identifiers, saved items, calendar events, reminders, teams, join requests and notification ownership.

These are API-level checks, not a complete production database audit.

### 3.5 Functional test case documentation

Thirty functional test scenarios were documented.

The scenarios cover:

- Registration and login.
- Session management.
- CSRF protection.
- Profiles.
- Discovery.
- Hackathons.
- Saved items.
- Calendar and reminders.
- Teams.
- Notifications.
- Account management.
- Health and administration.

Some manual functional scenarios remain pending or blocked.

### Deliverables created

Location: `docs/qa/WEEK_2/`

1. API_TEST_RESULTS.md
2. backend-test-output.txt
3. build-output.txt
4. DATA_QUALITY_REPORT.md
5. frontend-test-output.txt
6. full-regression-output.txt
7. FUNCTIONAL_TEST_CASES.md
8. lint-output.txt
9. MANUAL_API_SMOKE_TEST_RESULTS.md
10. REGRESSION_REPORT.md

### Completion status

**WEEK 2: AUTOMATED QA AND DOCUMENTATION COMPLETED FOR RECORDED TEST RUNS**

Remaining manual functional validation and data-quality verification must be completed before final QA approval.

# 4. WEEK 3 – AUTOMATION, SCHEDULER AND PERFORMANCE TESTING

### Objective

Introduce browser-based end-to-end automation, validate reminder scheduler behavior and establish a performance baseline.

## 4.1 End-to-End Automation

Playwright was configured for Chromium browser testing.

The following E2E test scenarios were implemented:

| Test ID | Scenario | Result |
|---|---|---|
| E2E-001 | Login page rendering | PASS |
| E2E-002 | Registration page rendering | PASS |
| E2E-003 | Empty login form validation | PASS |

**Result: 3 PASSED, 0 FAILED**

These tests validate authentication-page rendering and client-side validation. Successful authentication and complete authenticated user journeys require additional automation.

## 4.2 Reminder Scheduler Testing

The reminder scheduler was tested using the Node.js test runner.

An additional test verified that reminders falling within overnight quiet hours are postponed until the exact end of the configured quiet-hours period in Indian Standard Time.

### Historical execution results

| Metric | Result |
|---|---:|
| Test suites | 17 |
| Tests passed | 98 |
| Tests failed | 0 |
| Cancelled | 0 |
| Skipped | 0 |

**Historical scheduler result: PASS**

Other tested behaviors included:

- Reminder delivery.
- Duplicate prevention.
- Quiet-hours validation.
- Failure isolation.
- Batch reminder processing.
- Notification creation.

Actual third-party email-provider invocation and inbox receipt were not independently verified.

The scheduler test result is historical evidence and should not be interpreted as a separate fresh scheduler verification during the latest regression session.

## 4.3 Performance and Load Testing

A local load test was executed using k6.

### Test configuration

| Parameter | Value |
|---|---|
| Virtual users | 100 |
| Duration | 30 seconds |
| Seeded hackathons | 300 |
| HTTP requests | 2,962 |
| Iterations | 2,959 |

### Recorded results

| Metric | Result |
|---|---:|
| Request failure rate | 89.90% |
| Successful checks | 10.09% |
| Average response time | 22.53 ms |
| Median response time | 2.04 ms |
| p90 latency | 16.05 ms |
| p95 latency | 68.51 ms |
| Maximum latency | 710.11 ms |
| Throughput | 81.37 requests/second |

### Findings

The latency threshold passed, but the HTTP failure-rate threshold failed.

The API's global rate limiter permits 300 requests per 15 minutes per IP. Since the test generated traffic from one local IP address, many requests received HTTP 429 responses.

An initial login attempt also returned HTTP 500. The underlying cause has not yet been established.

A separate later local baseline was reported in `tools/loadtest/RESULTS.md`, with 186 requests, 0% HTTP failures, 100% successful checks and p95 latency of 129.47 ms. That report also records rate-limit responses on a repeated run.

The different results have not been fully reconciled.

**Performance status: EXECUTED – FOLLOW-UP AND CONTROLLED RETEST REQUIRED**

No fresh load test was executed during the latest backend regression session.

### Deliverables created

Location: `docs/qa/WEEK_3/`

- LOAD_TEST_REPORT.md
- SCHEDULER_TEST_RESULTS.md
- WEEK_3_COMPLETION_REPORT.md
- load-test-output.txt
- scheduler-test-output.txt

### Completion status

**WEEK 3: PARTIALLY COMPLETED**

E2E and scheduler test evidence exists. Performance testing was executed, but the earlier failed threshold and later separate baseline require investigation.

# 5. WEEK 4 – FINAL REGRESSION, SECURITY, UAT AND RELEASE MANAGEMENT

### Objective

Complete final regression validation, security testing, accessibility verification, student UAT and release-readiness assessment.

## 5.1 Backend Regression – Latest Local Execution

The backend regression suite was executed after correcting test setup issues involving CSRF protection and environment-dependent OAuth behavior.

### Corrections made

**A. CSRF test setup**

Several integration test helpers did not initially obtain and send the CSRF token required by the application's mutation routes.

The affected test setups were corrected to:

- Request a CSRF token from `/auth/csrf-token`.
- Capture the CSRF cookie.
- Send the token using the `x-csrf-token` header.
- Include the corresponding cookie in mutation requests.

These corrections were made in test code. Application CSRF protection was not disabled.

**B. OAuth environment-dependent test**

The health test previously expected the Google OAuth endpoint to return HTTP 503 when provider credentials were unavailable.

The local `.env` contained Google OAuth credentials, making the test environment-dependent.

The test was corrected to temporarily remove the relevant OAuth environment variables for that specific test and restore them afterward.

No permanent OAuth configuration or `.env` changes were required for this test correction.

## 5.2 Parallel Backend Regression Execution

The ordinary command:

`npm test`

produced the following result:

| Metric | Result |
|---|---:|
| Total tests | 98 |
| Passed | 86 |
| Assertion failures | 0 |
| Cancelled | 12 |
| Skipped | 0 |

The 12 cancellations occurred because the `join-requests.test.js` suite failed during its initial team-creation setup with an invalid CSRF token.

The remaining tests in that suite were cancelled when its parent setup failed.

The result indicates an issue with test setup under parallel execution. It does not establish that 12 individual functional assertions failed.

## 5.3 Sequential Full Backend Regression Execution

To investigate the parallel execution issue, the complete backend suite was executed sequentially.

Command:

`node --test --test-concurrency=1 test/*.test.js`

### Latest execution result

| Metric | Result |
|---|---:|
| Test suites | 17 |
| Total tests | 98 |
| Tests passed | 98 |
| Tests failed | 0 |
| Cancelled | 0 |
| Skipped | 0 |
| Todo | 0 |
| Duration | Approximately 70.08 seconds |

<badge color="success">PASS</badge>

**Latest sequential backend regression: 98 PASSED, 0 FAILED, 0 CANCELLED.**

All 17 backend test suites completed successfully in this execution.

The successful sequential run confirms that the complete backend suite can pass under sequential conditions. Parallel execution interference still requires investigation.

## 5.4 Audit Log Warnings

Some test executions produced nonfatal audit-log persistence warnings after test cases had completed.

Observed messages included:

- `Operation interrupted because client was closed`
- `Cannot use a session that has ended`
- `Operation auditlogs.insertOne() buffering timed out after 10000ms`

The latest sequential backend regression still completed with 98 passing tests and zero failures.

These warnings have not been fully investigated. Audit-log persistence and test database connection teardown should be reviewed separately before final QA sign-off.

They are recorded as outstanding investigation items, not as confirmed application defects.

## 5.5 Frontend Regression Testing

The recorded Week 4 frontend regression result was:

| Metric | Result |
|---|---:|
| Test files passed | 8 |
| Tests passed | 32 |
| Tests failed | 0 |

**Result: PASS**

The Vitest configuration was updated to exclude Playwright E2E tests from Vitest discovery.

## 5.6 Playwright E2E Regression

| Metric | Result |
|---|---:|
| Browser | Chromium |
| Tests passed | 3 |
| Tests failed | 0 |

**Result: PASS**

The three tests cover authentication-page rendering and empty-login validation.

They do not establish successful registration, login or complete authenticated workflows.

## 5.7 Combined Week 4 Automated Regression

| Category | Passed | Failed |
|---|---:|---:|
| Backend | 98 | 0 |
| Frontend | 32 | 0 |
| Playwright | 3 | 0 |
| **Total** | **133** | **0** |

These are separate test executions across three test runners, not 133 unique functional scenarios.

The backend figure refers to the latest successful sequential execution. Frontend and Playwright figures refer to their recorded Week 4 runs.

## 5.8 Integrated API Functional Testing

The previously recorded PowerShell API test suite result was:

| Status | Count |
|---|---:|
| PASS | 5 |
| FAIL | 1 |
| REVIEW | 0 |
| BLOCKED | 6 |
| NOT RUN | 0 |

The failed scenario involved invalid-email registration validation.

The three dedicated QA accounts returned HTTP 401 during authentication. This blocked:

- Profile update and retrieval.
- Saved hackathon lifecycle.
- Reminder creation and duplicate handling.
- Team and membership lifecycle.
- Notification read operations.
- Admin authorization.

These integrated API suite results are separate from the Node.js backend regression. The latest 98/98 backend regression does not automatically resolve the previously blocked authenticated PowerShell workflows.

The QA accounts must be valid and verified before those workflows can be retested.

## 5.9 Authentication Observation

An authentication observation was documented after the browser displayed HTTP 401 responses for unauthenticated requests to:

- `/api/users/me`
- `/api/auth/refresh`

These responses may be expected when a user is logged out. Their behavior after successful authentication still requires verification.

The observation is recorded as an open investigation, not a confirmed application defect.

## 5.10 Security Testing

An OWASP ZAP Baseline Scan was previously attempted using Docker, but Docker Desktop's Linux engine was not running.

The scan could not start during that attempt.

Submitted security reports were also reviewed. They describe static code review and do not establish that a runtime OWASP ZAP scan was completed.

Therefore:

- A completed frontend ZAP scan has not been verified.
- A completed API ZAP scan has not been verified.
- Runtime vulnerability findings have not been established through a verified ZAP scan.
- Security testing remains pending.

No ZAP scan was repeated during the latest regression session.

## 5.11 Accessibility Testing

The frontend contains an accessibility-related automated test, but a dedicated Lighthouse and comprehensive axe accessibility audit has not been completed and documented.

A separate accessibility report remains pending.

The existing automated accessibility smoke test does not establish full WCAG compliance.

## 5.12 User Acceptance Testing

Student UAT is planned with 10–15 participants.

Actual participant testing, feedback collection and acceptance have not yet been performed.

The UAT report must be updated using genuine participant feedback.

## 5.13 Release Management

The following activities remain outstanding:

- Release checklist preparation.
- Release notes preparation.
- Production smoke testing.
- Rollback rehearsal.
- Final launch approval.
- 48-hour post-release monitoring.
- Final go/no-go decision.

### Week 4 deliverables

Location: `docs/qa/WEEK_4/`

- AUTHENTICATION_OBSERVATION.md
- FINAL_REGRESSION_REPORT.md
- WEEK_4_PENDING_WORK_REPORT.md
- backend-regression-output.txt
- frontend-regression-output.txt
- playwright-e2e-output.txt
- technical-functional-test-output.txt
- zap-frontend-scan-output.txt

The ZAP output file records an unsuccessful scan attempt, not a completed runtime security assessment.

### Completion status

**WEEK 4: PARTIALLY COMPLETED**

The latest sequential backend regression passed. Recorded frontend and Playwright regression runs also passed.

Integrated functional API testing, parallel test execution investigation, security, accessibility, UAT and release activities require further work.

# 6. DEPENDENCIES ON OTHER TEAM MEMBERS

My QA work is not entirely dependent on other people. I can independently prepare test cases, execute local automated tests, maintain reports, investigate failures and organize evidence.

However, certain activities require coordination and support.

| Person / Group | Area of Dependency | Support Required |
|---|---|---|
| Nandhini | Application performance | Review browsing/search bottlenecks and application behavior identified during load testing |
| Senthil | Infrastructure and API performance | Assist with API capacity, database resources, environment metrics and controlled load retesting |
| Berwin | Security findings | Coordinate investigation and remediation of confirmed security findings |
| QA account administrator / backend team | Test account provisioning | Create or verify dedicated QA User A, QA User B and Admin accounts |
| 10–15 student participants | User Acceptance Testing | Execute real UAT scenarios and provide feedback |
| DevOps / release owner | Release environment | Provide staging/production access, deployment support, rollback procedures and monitoring |

These are coordination dependencies based on the current project work. Their availability and ownership should be confirmed with the project team.

## Work I can perform independently

1. Prepare and update QA documentation.
2. Develop automated test cases.
3. Execute backend and frontend tests locally.
4. Run Playwright browser tests.
5. Investigate application test failures.
6. Prepare security and accessibility test plans.
7. Generate test evidence.
8. Prepare release checklists and release notes.
9. Maintain the final QA status report.


# 7. GITHUB SUBMISSION DETAILS

**Repository:** `https://github.com/run-time-code/HackHub`  
**Working branch:** `wa9/deva-qa-release`

### Previously recorded commits

| Commit | Description |
|---|---|
| 974bc61 | Week 1 and Week 2 QA deliverables |
| 202ed14 | Week 3 and current Week 4 QA evidence |

Both commits were previously reported as pushed to the working branch.

### Latest local changes

The latest backend test corrections and successful sequential regression have been verified locally.

Latest command:

`node --test --test-concurrency=1 test/*.test.js`

Result:

- 17 suites.
- 98 tests passed.
- 0 failed.
- 0 cancelled.

**Latest changes: AWAITING REVIEW, COMMIT AND PUSH.**

The latest test corrections and updated evidence must be reviewed and submitted separately. No new commit hash is recorded for these changes.

Existing untracked CSV files, Playwright artifacts and audit files should be reviewed before staging. Only intended QA deliverables should be included in the submission.

# 8. OVERALL COMPLETION STATUS

| Work Area | Status |
|---|---|
| Week 1 QA documentation | COMPLETED |
| Week 2 historical automated regression | COMPLETED FOR RECORDED RUNS |
| Week 2 manual functional testing | PARTIALLY COMPLETED |
| Week 3 E2E automation | INITIAL TESTS COMPLETED |
| Week 3 scheduler testing | HISTORICAL TEST RUN PASSED |
| Week 3 performance testing | EXECUTED – FAILED THRESHOLD; RETEST PENDING |
| Week 4 backend sequential regression | PASS – 98 TESTS |
| Week 4 backend parallel execution | INVESTIGATION PENDING |
| Week 4 frontend regression | PASS – 32 TESTS |
| Week 4 Playwright regression | PASS – 3 TESTS |
| Week 4 audit-log warnings | INVESTIGATION PENDING |
| Week 4 technical functional testing | PARTIAL |
| Week 4 security testing | PENDING |
| Week 4 accessibility testing | PENDING |
| Week 4 student UAT | PENDING |
| Week 4 release management | PENDING |
| Latest GitHub submission | PENDING COMMIT AND PUSH |

# 9. FINAL CONCLUSION

Across the four weeks, I established the QA documentation structure, executed backend and frontend automated tests, developed browser-based E2E tests, validated reminder scheduler behavior, performed API smoke testing and executed a local performance test.

During the latest Week 4 regression work, I corrected CSRF handling in affected integration test setups and resolved an environment-dependent OAuth test assumption.

The complete backend regression was then executed sequentially. All 98 tests across 17 suites passed, with zero failures and zero cancellations.

The recorded frontend regression achieved 32 passing tests, and Playwright completed three browser tests successfully.

The earlier parallel backend execution produced 86 passes and 12 cancellations because the join-request suite encountered a CSRF setup failure. Further investigation is required to establish reliable parallel execution.

Some nonfatal audit-log persistence warnings also remain under investigation.

The historical performance test did not meet its HTTP failure-rate threshold. A separate later local baseline reported different results, and the discrepancy remains unresolved.

The separate integrated API suite still contains one recorded failure and six blocked scenarios. Runtime security testing, full accessibility validation, UAT and release activities remain incomplete.

The latest backend corrections and successful sequential regression are ready for review and a separate GitHub commit and push.

My work can continue independently in several areas, but final completion requires support with QA account provisioning, student participation, performance investigation, security coordination and release-environment access.

**OVERALL QA STATUS: IN PROGRESS**

**LATEST SEQUENTIAL BACKEND REGRESSION: PASS – 98/98**

**FRONTEND REGRESSION: PASS – 32/32 (RECORDED RUN)**

**PLAYWRIGHT: PASS – 3/3 (RECORDED RUN)**

**PERFORMANCE RETEST: PENDING**

**SECURITY VALIDATION: PENDING**

**UAT: PENDING – AWAITING PARTICIPANT EXECUTION**

**FINAL QA SIGN-OFF: PENDING**

**RELEASE APPROVAL: PENDING**

---

**Prepared by:** Deva Kanchana  
**Work Area:** WA9 – QA, Test Automation & Release Management  
**Project:** HackHub  
**Date:** 31 October 2026
