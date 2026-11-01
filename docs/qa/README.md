# HackHub QA & Release Documentation

**Release decision:** NOT APPROVED  
**Latest release snapshot:** 2026-10-31  
**Last documentation revision:** 2026-11-01

This directory is organised by QA purpose, not by delivery week. Current test
guidance is separated from date-stamped release evidence, and historical
week-based records are retained in `archive/` only for traceability.

## Start here

| I need to... | Read |
|---|---|
| See the release decision and consolidated results | [releases/2026-10-31/FINAL_QA_SUMMARY.md](releases/2026-10-31/FINAL_QA_SUMMARY.md) |
| Understand what blocks production | [releases/2026-10-31/RELEASE_READINESS_REPORT.md](releases/2026-10-31/RELEASE_READINESS_REPORT.md) |
| Assign the remaining work | [releases/2026-10-31/PENDING_TASKS_AND_TEAM_DEPENDENCIES.md](releases/2026-10-31/PENDING_TASKS_AND_TEAM_DEPENDENCIES.md) |
| Review the test approach | [test-plan/TEST_STRATEGY.md](test-plan/TEST_STRATEGY.md) |
| Run manual scenarios | [test-cases/FUNCTIONAL_TEST_CASES.md](test-cases/FUNCTIONAL_TEST_CASES.md) |
| See the latest local auth validation | [releases/2026-11-01-local-validation/README.md](releases/2026-11-01-local-validation/README.md) |
| Trace a historical result | [archive/README.md](archive/README.md) |

## Release gate status

| Gate | Status | Evidence |
|---|---|---|
| Backend API regression | **PASS — local post-fix** | 98/98 tests in two sequential runs; [BACKEND_REGRESSION_REPORT.md](releases/2026-10-31/BACKEND_REGRESSION_REPORT.md) |
| Auth and session hydration | **PASS — local regression** | 9/9 auth route/security tests; browser smoke still pending; [local validation](releases/2026-11-01-local-validation/README.md) |
| Frontend unit tests | **PASS** | 32/32; [FRONTEND_REGRESSION_REPORT.md](releases/2026-10-31/FRONTEND_REGRESSION_REPORT.md) |
| Playwright E2E | **PASS — limited scope** | 3/3 page and validation checks; [PLAYWRIGHT_E2E_REPORT.md](releases/2026-10-31/PLAYWRIGHT_E2E_REPORT.md) |
| Build and lint | **PASS WITH WARNING** | Large JavaScript chunk advisory; [BUILD_AND_LINT_REPORT.md](releases/2026-10-31/BUILD_AND_LINT_REPORT.md) |
| API functional workflows | **PARTIAL** | Historical 5 PASS, 1 FAIL, 6 BLOCKED; no fresh run in the snapshot; [API_FUNCTIONAL_TEST_REPORT.md](releases/2026-10-31/API_FUNCTIONAL_TEST_REPORT.md) |
| Performance | **BLOCKED** | Historical threshold failure; no controlled retest; [PERFORMANCE_TEST_REPORT.md](releases/2026-10-31/PERFORMANCE_TEST_REPORT.md) |
| Security / DAST | **REVIEW REQUIRED** | Runtime ZAP evidence not verified; [SECURITY_ASSESSMENT_REPORT.md](releases/2026-10-31/SECURITY_ASSESSMENT_REPORT.md) |
| Rate limiting | **REVIEW REQUIRED** | Source configuration only; no boundary run; [RATE_LIMIT_VALIDATION_REPORT.md](releases/2026-10-31/RATE_LIMIT_VALIDATION_REPORT.md) |
| Scheduler / reminders | **PASS — automated only** | Provider delivery and inbox receipt not verified; [SCHEDULER_VALIDATION_REPORT.md](releases/2026-10-31/SCHEDULER_VALIDATION_REPORT.md) |
| Data quality | **REVIEW REQUIRED** | No database-wide audit; [DATA_QUALITY_REPORT.md](releases/2026-10-31/DATA_QUALITY_REPORT.md) |
| Accessibility | **PARTIAL** | One automated smoke view; [ACCESSIBILITY_REPORT.md](releases/2026-10-31/ACCESSIBILITY_REPORT.md) |
| UAT | **PENDING** | No participant sessions or feedback recorded; [UAT_READINESS_REPORT.md](releases/2026-10-31/UAT_READINESS_REPORT.md) |
| Staging / production smoke | **NOT RUN** | No deployment or external-target validation |
| Rollback rehearsal | **NOT RUN** | Procedure documented, not rehearsed |
| Release approval | **NOT GRANTED** | Project owner retains final authority |

The 2026-10-31 snapshot is point-in-time evidence. Some reports in it predate
the local logger and auth fixes. Re-run the complete gate set on the exact
release commit; do not promote from a historical snapshot.

## Document map

### Test plan and governance

- [TEST_STRATEGY.md](test-plan/TEST_STRATEGY.md) — scope, approach, environments, entry/exit criteria.
- [ACCEPTANCE_CRITERIA.md](test-plan/ACCEPTANCE_CRITERIA.md) — Given/When/Then acceptance conditions.
- [TEST_TOOLING.md](test-plan/TEST_TOOLING.md) — commands, runners and configuration.
- [BUG_SEVERITY.md](test-plan/BUG_SEVERITY.md) — severity and priority definitions.
- [BUG_REPORT_TEMPLATE.md](test-plan/BUG_REPORT_TEMPLATE.md) — defect record template.
- [DEPENDENCY_AUDIT.md](test-plan/DEPENDENCY_AUDIT.md) — dependency-audit record.

### Test cases

- [FUNCTIONAL_TEST_CASES.md](test-cases/FUNCTIONAL_TEST_CASES.md) — 30 planned functional scenarios across auth, profiles, discovery, saved items, calendar, reminders, teams, notifications, account and admin.

### Release snapshots and validation

- [2026-10-31](releases/2026-10-31/README.md) — full release-readiness snapshot and raw evidence.
- [2026-11-01 local validation](releases/2026-11-01-local-validation/README.md) — post-snapshot auth regression evidence.

### Historical archive

- [October 2026 archive](archive/README.md) — earlier weekly QA records and execution logs. These are historical evidence, not current status.

## Production promotion checklist

- [ ] Run the complete API regression suite on the release commit.
- [ ] Run frontend unit tests, lint and production build.
- [ ] Re-run auth, authorization and CSRF smoke checks against the deployed-like configuration.
- [ ] Verify the CSP permits the intended API origin and no broader origin.
- [ ] Complete a controlled performance retest and reconcile the historical 89.90% failure.
- [ ] Obtain verifiable runtime security evidence and reconcile the conflicting DAST reports.
- [ ] Complete the accessibility audit.
- [ ] Complete student UAT and record authentic feedback.
- [ ] Run staging and production smoke tests.
- [ ] Rehearse rollback and record recovery time.
- [ ] Obtain project-owner go/no-go approval.

## Conventions

- Keep current guidance in `test-plan/` and `test-cases/`; do not add new week-numbered folders.
- Store each release assessment as a date-stamped snapshot under `releases/`.
- Keep raw logs with the report that cites them in the snapshot’s `evidence/` folder.
- Treat `archive/` as historical and read-only.
- Never store credentials, tokens, personal data or production data in QA evidence.
