# Performance Test Report

**Date:** 2026-10-31  
**Target:** No new target; this assessment did not run a load test

## Current execution

**Status: BLOCKED - NOT RUN.** A dedicated local load-test database and
verified API process were not established. The active API test bootstrap
currently fails before routes load. The local rate-limit window and test-account
state could not be verified. No performance, stress, or staging test was
started.

## Historical evidence reviewed

`docs/qa/WEEK_3/load-test-output.txt` records a 30-second run with 100 maximum
VUs and 2,962 HTTP requests. It reports:

| Metric | Historical result |
|---|---:|
| HTTP requests | 2,962 |
| Throughput | 81.37 requests/second |
| HTTP failed | 2,663 (89.90%) |
| Check success | 299/2,962 (10.09%) |
| p50 | 2.04 ms |
| p90 | 16.05 ms |
| p95 | 68.51 ms |
| Maximum | 710.11 ms |
| Login behavior | HTTP 500 and HTTP 429 observed |
| Overall | FAIL; HTTP error threshold crossed |

The later `tools/loadtest/RESULTS.md` documents a separate local baseline with
186 requests, 0% HTTP failures, 100% checks, and p95 of 129.47 ms. It also
records a repeated-run 429 rate-limit ceiling. The failed run does not provide
a complete per-status breakdown for all 2,663 failed requests. Week 4
pending-work evidence continues to list the login 500 and controlled retest as
open. The root cause of the failed high-error run is not established by the
reviewed evidence.

These are local historical measurements and do not establish staging or
production capacity. No p50/p90/p95/throughput/error metrics are claimed for
this assessment.

## Next safe step

After the API bootstrap is fixed, confirm a dedicated local database and
load-test account, verify the rate-limit window and bounded parameters, then
obtain authorization before any new controlled run. Do not use production or
staging credentials or data.
