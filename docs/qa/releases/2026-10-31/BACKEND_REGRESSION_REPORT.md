# Backend Regression Report

**Date:** 2026-10-31  
**Work Area:** WA9 – QA, Test Automation & Release Management  
**Environment:** Local Windows development environment  
**Branch:** `wa9/deva-qa-release`

## 1. Original Assessment Run

**Tested commit:** `649338880a8a028e6713ab0270cc4f5c80b82f24`  
**Command:** `npm test --workspace @hackhub/api`

**Result: FAIL**

| Metric | Result |
|---|---:|
| Test files discovered | 16 |
| Node test results | 18 |
| Passed | 3 |
| Failed | 15 |
| Cancelled | 0 |
| Skipped | 0 |
| Duration | 14.87 seconds |

The 15 failing file-level results failed during module initialization because `apps/api/middleware/authMiddleware.js` referenced an incorrect logger import path.

The original import was:

`../../src/utils/logger`

The logger file is located at:

`apps/api/src/utils/logger.js`

The original assessment output is preserved in:

`evidence/backend-regression-output.txt`

## 2. Corrective Change

The middleware import was corrected to:

`../src/utils/logger`

The corrected path resolves from `apps/api/middleware/` to `apps/api/src/utils/logger.js`.

The following API test files were also modified to improve test setup, CSRF handling, authentication and test-environment isolation:

- `hackathons.test.js`
- `health.test.js`
- `join-requests.test.js`
- `notifications.test.js`
- `team-requests-led.test.js`
- `teams.test.js`

These changes were tested together with the middleware correction.

## 3. Post-Fix Backend Regression – Execution 1

**Date:** 31 October 2026  
**Execution mode:** Sequential  
**Command:**

`node --test --test-concurrency=1 test/*.test.js`

**Working directory:** `apps/api`

| Metric | Result |
|---|---:|
| Test suites | 17 |
| Tests | 98 |
| Passed | 98 |
| Failed | 0 |
| Cancelled | 0 |
| Skipped | 0 |
| Todo | 0 |
| Duration | 57.16 seconds |

**Result: PASS**

## 4. Post-Fix Backend Regression – Execution 2

A second sequential execution was performed to confirm that the successful result was repeatable.

**Date:** 31 October 2026  
**Execution mode:** Sequential  
**Command:**

`node --test --test-concurrency=1 test/*.test.js`

**Working directory:** `apps/api`

| Metric | Result |
|---|---:|
| Test suites | 17 |
| Tests | 98 |
| Passed | 98 |
| Failed | 0 |
| Cancelled | 0 |
| Skipped | 0 |
| Todo | 0 |
| Duration | 59.73 seconds |

**Result: PASS**

Raw output:

`evidence/backend-regression-post-fix-output.txt`

## 5. Test Execution Comparison

| Execution | Commit / State | Passed | Failed | Result |
|---|---|---:|---:|---|
| Original assessment | Commit `6493388` | 3 | 15 | FAIL |
| Post-fix run 1 | Modified local working tree | 98 | 0 | PASS |
| Post-fix run 2 | Modified local working tree | 98 | 0 | PASS |

The two successful runs were performed after the logger import correction and associated test changes.

They were executed against the local working tree, not against a newly committed revision. Therefore, they must not be described as results from commit `6493388` or from a later Git commit.

## 6. Nonfatal Audit-Log Warnings

Both successful executions produced some audit-log teardown/database logging warnings, including interrupted writes and MongoDB buffering timeouts.

These warnings did not cause the Node test runner to report any failed or cancelled tests.

However, the audit-log persistence warnings remain an outstanding investigation item.

## 7. Prototype Backend Unit Subset

The separate exploratory `backend/` prototype unit subset recorded:

| Metric | Result |
|---|---:|
| Test results | 14 |
| Passed | 13 |
| Failed | 1 |

The `emailService.test.js` file could not load `nodemailer`, which was unavailable in the local installation. No dependency installation was performed.

This result is separate from the active `@hackhub/api` regression suite.

## 8. Limitations

- Successful regression runs were performed locally.
- Staging and production regression were not performed.
- Third-party email delivery was not independently verified.
- Audit-log teardown warnings remain unresolved.
- The successful results do not establish that every manual functional scenario has been executed.
- The prototype backend unit failure remains separate and unresolved.

## 9. Conclusion

The original API regression failure was traced to an incorrect logger import path.

After correcting the import and updating the relevant test setup, two consecutive sequential regression executions completed successfully.

Both executions recorded 98 passing tests across 17 suites, with zero failures.

**Current local backend regression status: PASS**

**Audit-log warning investigation: PENDING**

**Staging/production verification: NOT PERFORMED**
