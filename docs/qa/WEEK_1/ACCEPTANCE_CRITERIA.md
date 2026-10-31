# HackHub – Week 1 Acceptance Criteria

**Owner:** Deva Kanchana  
**Work Area:** WA9 – QA

Acceptance criteria use the Given / When / Then format.

## TC-W1-001: Test strategy documentation

Given the HackHub repository and its application architecture are available,

When the QA strategy is reviewed,

Then the document must define scope, test levels, environments, entry criteria,
exit criteria, defect management and evidence requirements.

## TC-W1-002: Bug severity definitions

Given a defect has been identified,

When the QA team classifies the defect,

Then it must be assigned a severity and priority using the documented
definitions.

## TC-W1-003: Bug report template

Given a tester identifies a defect,

When the tester prepares a bug report,

Then the report must include reproduction steps, expected result, actual
result, environment, severity, evidence and ownership.

## TC-W1-004: Backend test tooling

Given API dependencies are installed,

When the backend test command is executed,

Then the Node.js built-in test runner must execute the API test files and
report pass/fail results.

## TC-W1-005: Frontend test tooling

Given frontend dependencies are installed,

When the frontend test command is executed,

Then Vitest must execute the frontend test suite and report pass/fail results.

## TC-W1-006: Continuous integration

Given a qualifying push or pull request targets a configured CI branch,

When the GitHub Actions workflow runs,

Then the configured lint, test, build and secret-scanning jobs must execute.

## TC-W1-007: Week 1 documentation review

Given all Week 1 QA documents have been created,

When the documentation is reviewed,

Then the files must be present, internally consistent and committed to the
WA9 working branch.

## Verification record

| Test ID | Expected result | Actual result | Status | Evidence |
|---|---|---|---|---|
| TC-W1-001 | Strategy document exists and covers required sections | Pending | NOT RUN | Pending |
| TC-W1-002 | Severity definitions exist | Pending | NOT RUN | Pending |
| TC-W1-003 | Bug template exists | Pending | NOT RUN | Pending |
| TC-W1-004 | API test command executes | Pending | NOT RUN | Pending |
| TC-W1-005 | Frontend test command executes | Pending | NOT RUN | Pending |
| TC-W1-006 | CI workflow configuration verified | Configuration inspected; execution pending | PARTIAL | `.github/workflows/ci.yml` |
| TC-W1-007 | Documents committed to WA9 branch | Pending | NOT RUN | Pending |

## Sign-off

- QA owner: Deva Kanchana
- Review date:
- Review outcome: PENDING
- Reviewer:
- Outstanding issues:
