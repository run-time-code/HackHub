# Post-Fix Backend Regression Evidence

Date: 31 October 2026
Command: node --test --test-concurrency=1 test/*.test.js
Working directory: apps/api

| Metric | Run 1 | Run 2 |
|---|---:|---:|
| Suites | 17 | 17 |
| Tests passed | 98 | 98 |
| Tests failed | 0 | 0 |
| Cancelled | 0 | 0 |
| Skipped | 0 | 0 |
| Duration | 57.16 seconds | 59.73 seconds |

Result: PASS for both sequential executions.

Nonfatal audit-log teardown and MongoDB buffering warnings were observed.
They did not cause test failures. Their investigation remains pending.

Both executions were performed against the modified local working tree,
not against a new Git commit or a staging/production environment.
