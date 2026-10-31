# HackHub – Functional Test Cases

**Work Area:** WA9 – QA, Test Automation & Release Management
**Owner:** Deva Kanchana
**Week:** 2
**Basis:** `docs/API_SPEC.md` and existing application functionality

## 1. Objective

Define functional test cases for the major HackHub workflows. Each test case must be executed and supported by evidence before it can be marked PASS.

This document distinguishes between planned manual functional testing and existing automated regression coverage.

## 2. Functional Test Cases

| Test ID | Module        | Scenario                                       | Expected Result                                                                       | Status  |
| ------- | ------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------- | ------- |
| FT-001  | Registration  | Register with valid user details               | Account is created successfully and verification email is sent                        | NOT RUN |
| FT-002  | Registration  | Register with invalid or missing fields        | Validation error is returned                                                          | NOT RUN |
| FT-003  | Login         | Login with valid, verified credentials         | Session cookies are established                                                       | NOT RUN |
| FT-004  | Login         | Login with invalid credentials                 | Authentication is rejected                                                            | NOT RUN |
| FT-005  | Session       | Refresh an expired session                     | Session is rotated successfully                                                       | NOT RUN |
| FT-006  | Session       | Logout                                         | Session cookies are cleared                                                           | NOT RUN |
| FT-007  | CSRF          | Submit a mutation without a valid CSRF token   | Request is rejected                                                                   | NOT RUN |
| FT-008  | Profile       | Retrieve own profile                           | Secret-free profile is returned                                                       | NOT RUN |
| FT-009  | Profile       | Update profile with valid fields               | Profile is updated and persisted                                                      | NOT RUN |
| FT-010  | Profile       | Retrieve another user's public profile         | Public fields are returned without private information                                | NOT RUN |
| FT-011  | Discovery     | Search discoverable users by skills            | Matching opted-in users are returned                                                  | NOT RUN |
| FT-012  | Hackathons    | Retrieve hackathon catalogue                   | Visible hackathons are returned                                                       | NOT RUN |
| FT-013  | Hackathons    | Search using filters and pagination            | Results match supplied filters                                                        | NOT RUN |
| FT-014  | Saved items   | Save a hackathon                               | Hackathon is saved; duplicate save is idempotent                                      | NOT RUN |
| FT-015  | Saved items   | Update saved hackathon status                  | Tracking status is updated                                                            | NOT RUN |
| FT-016  | Saved items   | Delete a saved hackathon                       | Saved entry is removed                                                                | NOT RUN |
| FT-017  | Calendar      | Retrieve calendar for a month                  | Relevant deadline events are returned                                                 | NOT RUN |
| FT-018  | Reminders     | Create a reminder                              | Reminder is created                                                                   | NOT RUN |
| FT-019  | Reminders     | Create a duplicate reminder                    | 409 REMINDER_EXISTS is returned                                                       | NOT RUN |
| FT-020  | Reminders     | Update reminder preferences                    | Preferences are saved                                                                 | NOT RUN |
| FT-021  | Teams         | Create a team                                  | Caller becomes team leader                                                            | NOT RUN |
| FT-022  | Teams         | Join a team through a request                  | Request is recorded as pending                                                        | NOT RUN |
| FT-023  | Teams         | Accept a join request                          | Membership is updated                                                                 | NOT RUN |
| FT-024  | Teams         | Attempt to join a full or closed team          | Request is rejected                                                                   | NOT RUN |
| FT-025  | Notifications | Retrieve notifications                         | Caller notifications are returned                                                     | NOT RUN |
| FT-026  | Notifications | Mark a notification as read                    | Read status is updated                                                                | NOT RUN |
| FT-027  | Account       | Export personal data                           | JSON export containing the user's permitted account data is returned                  | NOT RUN |
| FT-028  | Account       | Soft-delete own account                        | Account is deactivated, tokens are invalidated and authentication cookies are cleared | NOT RUN |
| FT-029  | Health        | Check API health                               | Health and database status are returned                                               | NOT RUN |
| FT-030  | Admin         | Access admin-only functionality as a non-admin | Access is rejected                                                                    | NOT RUN |

## 3. Existing Automated Regression Coverage

The following existing test files provide automated coverage related to some functional scenarios.

| Test file                          | Related functional areas                                          |
| ---------------------------------- | ----------------------------------------------------------------- |
| `auth-routes.test.js`              | CSRF bootstrap, session and authentication routes                 |
| `auth-security.test.js`            | Authentication security, login lockout and OAuth state validation |
| `profile-contract.test.js`         | FT-008, FT-009 and FT-010                                         |
| `users.test.js`                    | FT-010 and FT-011                                                 |
| `discovery-contract.test.js`       | Discovery API contract                                            |
| `hackathons.test.js`               | FT-012 and FT-013                                                 |
| `calendar-reminders-saved.test.js` | FT-014 to FT-020                                                  |
| `teams.test.js`                    | Team operations                                                   |
| `teams-mine.test.js`               | User team operations                                              |
| `team-requests-led.test.js`        | Team request workflows                                            |
| `join-requests.test.js`            | Join request operations                                           |
| `notifications.test.js`            | FT-025 and FT-026                                                 |
| `health.test.js`                   | FT-029                                                            |

**Coverage limitations:**

- Existing automated tests run against isolated test environments and do not establish that every manual scenario has been independently executed.
- FT-027 and FT-028 require additional execution evidence.
- The account deletion controller implements soft deletion and token invalidation. A separate purge-queue operation has not yet been verified.
- FT-030 requires explicit verification of a non-admin request against an admin-only endpoint.

## 4. Execution Record

| Field                          | Value           |
| ------------------------------ | --------------- |
| Environment                    | Local           |
| Execution date                 | 31 October 2026 |
| Tester                         | Deva Kanchana   |
| Functional test cases executed | 0               |
| Passed                         | 0               |
| Failed                         | 0               |
| Blocked                        | 0               |
| Not run                        | 30              |

### Separate Integrated API Test Suite Result

The additional PowerShell API test suite produced the following result on its latest recorded run:

| Result  | Count |
| ------- | ----: |
| PASS    |     5 |
| FAIL    |     0 |
| REVIEW  |     0 |
| BLOCKED |     7 |
| NOT RUN |     0 |

The integrated API suite results are recorded separately and must not be added to the manual functional test execution totals above.

## 5. Evidence Requirements

For every executed functional test, record:

1. Test ID.
2. Execution date and environment.
3. Request or user action performed.
4. Expected result.
5. Actual result.
6. Final status: PASS, FAIL or BLOCKED.
7. Screenshot, API response or execution log.
8. Defect ID, if applicable.

## 6. Notes and Limitations

- These test cases are derived from the API specification and existing application functionality.
- Automated regression results provide supporting evidence of backend and frontend test coverage.
- Manual functional test cases must be executed separately before receiving PASS status.
- BLOCKED indicates that prerequisites prevent execution; it must not be reported as a product failure without further investigation.
- Any discovered defects must be recorded using the Week 1 bug report template.

## 7. Conclusion

The Week 2 functional test plan contains 30 defined scenarios covering authentication, profiles, discovery, hackathons, saved items, calendar, reminders, teams, notifications, account management and administration.

Automated regression testing has been completed successfully, but the 30 manual functional scenarios remain pending execution and evidence collection.

**Overall manual functional testing status: PENDING**
**Automated regression coverage: COMPLETED**
