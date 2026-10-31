# HackHub – Week 2 Regression Test Report

**Work Area:** WA9 – QA  
**Owner:** Deva Kanchana  
**Week:** 2  
**Execution Date:** 31 October 2026

## 1. Objective

Evaluate the existing HackHub functionality through automated regression testing and record the execution evidence, outstanding validation and known limitations.

## 2. Automated Regression Execution Results

| Test layer | Framework | Tests passed | Tests failed | Result |
|---|---|---:|---:|---|
| Backend | Node.js built-in test runner | 97 | 0 | PASS |
| Frontend | Vitest | 32 | 0 | PASS |
| Combined | Backend + Frontend | 129 | 0 | PASS |

### Backend execution

Command:

`npm test --workspace @hackhub/api`

- Test suites: 17
- Tests: 97
- Passed: 97
- Failed: 0
- Skipped: 0
- Duration: approximately 16.95 seconds

### Frontend execution

Recorded evidence:

- Test files: 8
- Tests passed: 32
- Tests failed: 0

### Full regression result

The combined automated regression evidence records 129 passing tests and zero failures.

Evidence:
- `backend-test-output.txt`
- `frontend-test-output.txt`
- `full-regression-output.txt`

## 3. Regression Coverage

| Regression ID | Area | Evidence | Status |
|---|---|---|---|
| REG-001 | Authentication | auth-routes.test.js, auth-security.test.js | PASS |
| REG-002 | CSRF and requests | Backend security tests and frontend request tests | PASS |
| REG-003 | User profiles | profile-contract.test.js and frontend profile tests | PASS |
| REG-004 | Hackathon discovery | hackathons.test.js, discovery-contract.test.js | PASS |
| REG-005 | Saved hackathons | calendar-reminders-saved.test.js | PASS |
| REG-006 | Calendar and reminders | calendar-reminders-saved.test.js | PASS |
| REG-007 | Team operations | teams.test.js, teams-mine.test.js | PASS |
| REG-008 | Join requests | join-requests.test.js, team-requests-led.test.js | PASS |
| REG-009 | Notifications | notifications.test.js | PASS |
| REG-010 | Rate limiting | rate-limit.test.js | PASS |
| REG-011 | Accessibility | Separate accessibility validation not confirmed | PENDING |
| REG-012 | Calendar ICS utilities | Separate ICS test evidence not confirmed | PENDING |

## 4. Manual API Smoke Test

Nine manual API checks were executed on 31 October 2026.

| Metric | Result |
|---|---:|
| Requests executed | 9 |
| Passed | 9 |
| Failed | 0 |

The checks covered:
- Health endpoint
- Hackathon catalogue
- Hackathon facets
- Team listing validation
- Reminder authentication
- Notification authentication
- Saved hackathon authentication
- Saved hackathon status authentication
- Admin report authorization

Evidence: `MANUAL_API_SMOKE_TEST_RESULTS.md`

These checks verify the tested HTTP responses and do not replace full authenticated end-to-end workflow testing.

## 5. Supporting Quality Checks

| Check | Evidence file | Status |
|---|---|---|
| Backend automated tests | backend-test-output.txt | PASS |
| Frontend automated tests | frontend-test-output.txt | PASS |
| Combined regression | full-regression-output.txt | PASS |
| Lint | lint-output.txt | Review recorded output |
| Production build | build-output.txt | PASS, bundle-size warning recorded |
| API manual smoke test | MANUAL_API_SMOKE_TEST_RESULTS.md | PASS |

## 6. Known Limitations and Pending Work

1. Manual functional scenarios have not all been executed.
2. Staging regression testing remains pending.
3. User acceptance testing remains pending.
4. Dedicated accessibility validation remains pending.
5. Security testing with dedicated security tools remains pending.
6. The production build reports a large bundle warning that requires optimization review.
7. Production database data-quality auditing remains pending.

## 7. Regression Execution Procedure

For future application changes:

1. Identify affected modules and dependent features.
2. Execute relevant targeted tests.
3. Execute the complete backend and frontend regression suites.
4. Run lint checks.
5. Run the production build.
6. Compare the results against the previous execution.
7. Investigate failures and record defects.
8. Preserve test logs and supporting evidence.

## 8. Conclusion

The Week 2 automated regression evidence records **129 passing tests and zero failures**, comprising 97 backend tests and 32 frontend tests.

Nine manual API smoke checks also passed.

The automated regression result is PASS. However, full QA sign-off remains pending until manual functional testing, staging validation, UAT, accessibility and security validation are completed.

**Automated regression status: PASS**  
**Manual API smoke test status: PASS**  
**Overall Week 2 QA sign-off: PENDING**