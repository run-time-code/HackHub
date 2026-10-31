# HackHub – API Test Results

**Work Area:** WA9 – QA
**Owner:** Deva Kanchana
**Week:** 2
**API Specification:** docs/API_SPEC.md

## 1. API Test Environment

| Item | Details |
|---|---|
| Backend | Express / Node.js |
| Test runner | Node.js built-in test runner |
| Test location | apps/api/test |
| Test command | npm test --workspace @hackhub/api |
| API base path | /api |
| Database | MongoDB-backed application |
| Local execution | Recorded in Week 1 execution report |

## 2. Existing Backend Test Files

The following test files were identified in apps/api/test:

| Test file | Area |
|---|---|
| auth-routes.test.js | Authentication routes |
| auth-security.test.js | Authentication security |
| calendar-reminders-saved.test.js | Calendar, reminders and saved hackathons |
| discovery-contract.test.js | Discovery API contract |
| hackathons.test.js | Hackathon catalogue |
| health.test.js | Health endpoint |
| join-requests.test.js | Join requests |
| notifications.test.js | Notifications |
| profile-contract.test.js | Profile API contract |
| rate-limit.test.js | Rate limiting |
| stats-feedback.test.js | Statistics and feedback |
| team-requests-led.test.js | Team request workflows |
| teams-mine.test.js | User's teams |
| teams.test.js | Team operations |
| user-model.test.js | User model |
| users.test.js | User routes |

## 3. Execution Evidence

The Week 1 execution report records the following aggregate API test result:

| Metric | Result |
|---|---:|
| API test suites | 17 |
| API tests passed | 97 |
| API tests failed | 0 |
| API tests skipped | 0 |
| Result | PASS |

The above is the recorded aggregate result of the API test run. It is not a claim that every functional scenario in FUNCTIONAL_TEST_CASES.md was individually executed.

## 4. API Areas Identified in the Specification

- Authentication and session management
- CSRF protection
- User profiles
- Hackathon catalogue
- Saved hackathons
- Calendar and reminders
- Teams and membership
- Teammate discovery
- Join requests and invitations
- Notifications
- Account settings and personal-data export
- Admin operations
- Health and metrics

## 5. Additional Manual API Validation

| Validation | Status | Evidence |
|---|---|---|
| Registration and login using valid accounts | NOT RUN | Pending |
| Invalid authentication request | NOT RUN | Pending |
| CSRF rejection for an invalid mutation | NOT RUN | Pending |
| Profile update and retrieval | NOT RUN | Pending |
| Hackathon search and filters | NOT RUN | Pending |
| Saved hackathon lifecycle | NOT RUN | Pending |
| Reminder creation and duplicate handling | NOT RUN | Pending |
| Team creation and membership lifecycle | NOT RUN | Pending |
| Notification read operations | NOT RUN | Pending |
| Admin authorization | NOT RUN | Pending |

## 6. Defect Tracking

No new API defects are recorded in this report. This does not establish that the API is defect-free. Defects must be recorded using the Week 1 bug report template.

## 7. Conclusion

The repository contains backend automated tests across the listed API areas. The Week 1 report records 97 passing API tests. Additional manual endpoint validation remains pending and must be supported by request/response evidence before sign-off.
