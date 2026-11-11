# Historical QA Archive — October 2026

This folder contains earlier QA records kept for traceability. **Nothing here is
current release status.** The current test plan is in
[`../test-plan/`](../test-plan/), current test cases are in
[`../test-cases/`](../test-cases/), and the latest release assessment is in
[`../releases/`](../releases/).

The original folders were organised by delivery week. On 2026-11-01 they were
replaced by purpose-based folders. The tables below map the old locations to
the current documents and to the archived copies.

## Re-homed current documents

| Original location | Current location |
|---|---|
| `WEEK_1/ACCEPTANCE_CRITERIA.md` | [`../test-plan/ACCEPTANCE_CRITERIA.md`](../test-plan/ACCEPTANCE_CRITERIA.md) |
| `WEEK_1/TEST_STRATEGY.md` | [`../test-plan/TEST_STRATEGY.md`](../test-plan/TEST_STRATEGY.md) |
| `WEEK_1/TEST_TOOLING.md` | [`../test-plan/TEST_TOOLING.md`](../test-plan/TEST_TOOLING.md) |
| `WEEK_1/BUG_REPORT_TEMPLATE.md` | [`../test-plan/BUG_REPORT_TEMPLATE.md`](../test-plan/BUG_REPORT_TEMPLATE.md) |
| `WEEK_1/BUG_SEVERITY.md` | [`../test-plan/BUG_SEVERITY.md`](../test-plan/BUG_SEVERITY.md) |
| `WEEK_1/DEPENDENCY_AUDIT.md` | [`../test-plan/DEPENDENCY_AUDIT.md`](../test-plan/DEPENDENCY_AUDIT.md) |
| `WEEK_2/FUNCTIONAL_TEST_CASES.md` | [`../test-cases/FUNCTIONAL_TEST_CASES.md`](../test-cases/FUNCTIONAL_TEST_CASES.md) |
| `FINAL_ASSESSMENT_2026_10_31/*` | [`../releases/2026-10-31/`](../releases/2026-10-31/) |

## Historical reports

| Record | Covers | Original location |
|---|---|---|
| [QA_FOUNDATION_EXECUTION_REPORT.md](2026-10/QA_FOUNDATION_EXECUTION_REPORT.md) | Test-planning phase execution and sign-off notes | `WEEK_1/TEST_EXECUTION_REPORT.md` |
| [API_TEST_RESULTS.md](2026-10/API_TEST_RESULTS.md) | Earlier API test results | `WEEK_2/API_TEST_RESULTS.md` |
| [MANUAL_API_SMOKE_TEST_RESULTS.md](2026-10/MANUAL_API_SMOKE_TEST_RESULTS.md) | Earlier unauthenticated API smoke run | `WEEK_2/MANUAL_API_SMOKE_TEST_RESULTS.md` |
| [REGRESSION_REPORT.md](2026-10/REGRESSION_REPORT.md) | Earlier regression record | `WEEK_2/REGRESSION_REPORT.md` |
| [DATA_QUALITY_REPORT_DETAILED.md](2026-10/DATA_QUALITY_REPORT_DETAILED.md) | Detailed API-level data checks | `WEEK_2/DATA_QUALITY_REPORT.md` |
| [LOAD_TEST_REPORT.md](2026-10/LOAD_TEST_REPORT.md) | Historical load-test run | `WEEK_3/LOAD_TEST_REPORT.md` |
| [SCHEDULER_TEST_RESULTS.md](2026-10/SCHEDULER_TEST_RESULTS.md) | Reminder scheduler test detail | `WEEK_3/SCHEDULER_TEST_RESULTS.md` |
| [PERFORMANCE_AND_AUTOMATION_COMPLETION_REPORT.md](2026-10/PERFORMANCE_AND_AUTOMATION_COMPLETION_REPORT.md) | Performance/automation phase close-out | `WEEK_3/WEEK_3_COMPLETION_REPORT.md` |
| [AUTHENTICATION_OBSERVATION.md](2026-10/AUTHENTICATION_OBSERVATION.md) | Early authentication observation | `WEEK_4/AUTHENTICATION_OBSERVATION.md` |
| [FINAL_REGRESSION_REPORT.md](2026-10/FINAL_REGRESSION_REPORT.md) | Earlier final regression record | `WEEK_4/FINAL_REGRESSION_REPORT.md` |
| [SECURITY_AND_RELEASE_PENDING_WORK_REPORT.md](2026-10/SECURITY_AND_RELEASE_PENDING_WORK_REPORT.md) | Security/release pending work | `WEEK_4/WEEK_4_PENDING_WORK_REPORT.md` |
| [PROGRAM_COMPLETION_AND_PENDING_WORK.md](2026-10/PROGRAM_COMPLETION_AND_PENDING_WORK.md) | Comprehensive programme completion report | `FINAL_ASSESSMENT_2026_10_31/WA9_FOUR_WEEK_WORK_COMPLETION_AND_PENDING_TASKS_REPORT.md` |

## Raw logs

Historical execution logs are in [`2026-10/evidence/`](2026-10/evidence/):
backend, frontend, build, lint, Playwright, load-test, scheduler, manual API
and ZAP-related output. These logs support the archived reports only.

## Current counterparts

| Historical topic | Current document |
|---|---|
| Test strategy, tooling, bug process | [`../test-plan/`](../test-plan/) |
| Functional scenarios | [`../test-cases/FUNCTIONAL_TEST_CASES.md`](../test-cases/FUNCTIONAL_TEST_CASES.md) |
| Data quality | [`../releases/2026-10-31/DATA_QUALITY_REPORT.md`](../releases/2026-10-31/DATA_QUALITY_REPORT.md) |
| Performance | [`../releases/2026-10-31/PERFORMANCE_TEST_REPORT.md`](../releases/2026-10-31/PERFORMANCE_TEST_REPORT.md) |
| Scheduler | [`../releases/2026-10-31/SCHEDULER_VALIDATION_REPORT.md`](../releases/2026-10-31/SCHEDULER_VALIDATION_REPORT.md) |
| Security | [`../releases/2026-10-31/SECURITY_ASSESSMENT_REPORT.md`](../releases/2026-10-31/SECURITY_ASSESSMENT_REPORT.md) |
| Release status | [`../releases/2026-10-31/FINAL_QA_SUMMARY.md`](../releases/2026-10-31/FINAL_QA_SUMMARY.md) |

## Rules for this folder

- Do not update archived reports to reflect new results. Add a new dated
  validation or release snapshot instead.
- Do not use these files as the current go/no-go decision.
- Keep historical raw logs free of credentials, tokens and personal data.
