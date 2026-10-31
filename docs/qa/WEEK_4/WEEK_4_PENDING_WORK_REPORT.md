\# HackHub – Week 4 Pending Work Report



\*\*Work Area:\*\* WA9 – QA, Test Automation \& Release Management  

\*\*Owner:\*\* Deva Kanchana  

\*\*Branch:\*\* `wa9/deva-qa-release`  

\*\*Reporting Date:\*\* 31 October 2026



\## 1. Objective



This report records the remaining Week 4 QA activities required to complete security testing, accessibility validation, user acceptance testing and release-readiness assessment.



It distinguishes completed work from pending activities. No unexecuted test or release activity is marked as completed.



\## 2. Completed Activities



\### 2.1 Automated Regression Testing



| Test Category | Executed | Passed | Failed | Status |

|---|---:|---:|---:|---|

| Backend regression | 98 | 98 | 0 | PASS |

| Frontend regression | 32 | 32 | 0 | PASS |

| Playwright browser E2E | 3 | 3 | 0 | PASS |

| \*\*Total\*\* | \*\*133\*\* | \*\*133\*\* | \*\*0\*\* | \*\*PASS\*\* |



\### 2.2 Technical Functional API Testing



| Result | Count |

|---|---:|

| PASS | 5 |

| FAIL | 1 |

| REVIEW | 0 |

| BLOCKED | 6 |

| NOT RUN | 0 |



The invalid-email registration test requires investigation. Six authenticated workflows were blocked because the dedicated QA accounts returned HTTP 401.



\### 2.3 Existing Evidence



\- `backend-regression-output.txt`

\- `frontend-regression-output.txt`

\- `playwright-e2e-output.txt`

\- `technical-functional-test-output.txt`

\- `AUTHENTICATION\_OBSERVATION.md`



The final regression report has been prepared separately. Its saved-file confirmation remains to be checked.



\## 3. Pending Week 4 Activities



\### W4.T1 – Final Regression and UAT



| Activity | Status |

|---|---|

| Save and verify `FINAL\_REGRESSION\_REPORT.md` | PENDING |

| Investigate invalid-email registration test failure | PENDING |

| Create valid, verified QA accounts | BLOCKED |

| Execute the six blocked authenticated API workflows | PENDING |

| Expand successful login and registration E2E coverage | PENDING |

| Conduct UAT with 10–15 student participants | NOT RUN |

| Collect UAT feedback and acceptance | NOT RUN |

| Finalize `UAT\_REPORT.md` | PENDING |



\*\*Required deliverables:\*\*

\- `FINAL\_REGRESSION\_REPORT.md`

\- `UAT\_REPORT.md`



\### W4.T2 – Security and Accessibility Testing



| Activity | Status |

|---|---|

| Start Docker Desktop engine | BLOCKED |

| Run OWASP ZAP frontend baseline scan | NOT RUN |

| Run OWASP ZAP API baseline scan | NOT RUN |

| Review and classify ZAP findings | NOT RUN |

| Conduct authentication-abuse testing | NOT RUN |

| Perform Lighthouse audit | NOT RUN |

| Perform axe accessibility validation | NOT RUN |

| Document security findings and remediation | NOT RUN |



\*\*Current blocker:\*\* Docker is installed, but its Linux engine is not running. The ZAP Docker command failed before the scan started. No ZAP scan results have been produced.



\*\*Required deliverables:\*\*

\- `SECURITY\_TEST\_REPORT.md`

\- `ACCESSIBILITY\_REPORT.md`

\- ZAP HTML and JSON scan evidence for the frontend and API.



\### W4.T3 – Release Management



| Activity | Status |

|---|---|

| Prepare release checklist | PENDING |

| Prepare release notes | PENDING |

| Verify production configuration | PENDING |

| Perform production smoke testing | NOT RUN |

| Conduct rollback rehearsal | NOT RUN |

| Obtain final launch approval | NOT RUN |

| Begin 48-hour post-release monitoring | NOT RUN |

| Record final go/no-go decision | NOT RUN |



\*\*Required deliverables:\*\*

\- `RELEASE\_CHECKLIST.md`

\- `RELEASE\_NOTES.md`

\- Production smoke-test evidence

\- Rollback rehearsal evidence

\- Monitoring record

\- Release approval record



\## 4. Outstanding Technical Issues



| Issue ID | Description | Required Action |

|---|---|---|

| W4-01 | Invalid-email registration test failure | Investigate expected versus actual response |

| W4-02 | Dedicated QA accounts return HTTP 401 | Configure valid and verified test accounts |

| W4-03 | Authenticated functional tests blocked | Re-run after account setup |

| W4-04 | Docker engine unavailable | Start Docker Desktop and verify `docker info` |

| W4-05 | Initial load-test login returned HTTP 500 | Investigate backend error logs |

| W4-06 | Load-test error threshold failed due to rate limiting | Perform a controlled performance retest |



\## 5. Final Week 4 Deliverable Checklist



| Deliverable | Current Status |

|---|---|

| Final regression report | Prepared; save confirmation pending |

| UAT report | Draft prepared; actual UAT pending |

| Security test report | Not created |

| Accessibility report | Not created |

| Release checklist | Not created |

| Release notes | Not created |

| ZAP scan evidence | Not generated |

| Production smoke-test evidence | Not generated |

| Rollback evidence | Not generated |

| Release approval | Pending |



\## 6. Recommended Resumption Order



1\. Save and verify the final regression report.

2\. Resolve the QA account and registration validation issues.

3\. Complete the blocked authenticated API tests.

4\. Start Docker Desktop and execute OWASP ZAP scans.

5\. Complete authentication-abuse and accessibility testing.

6\. Conduct UAT with 10–15 students and record genuine feedback.

7\. Prepare release checklist and release notes.

8\. Perform production smoke testing and rollback rehearsal in the release environment.

9\. Complete 48-hour monitoring after deployment.

10\. Record the final release go/no-go decision.



\## 7. Overall Status



\*\*Automated regression:\*\* COMPLETED – PASS



\*\*Technical functional API testing:\*\* PARTIAL – 1 FAIL, 6 BLOCKED



\*\*Security testing:\*\* PENDING



\*\*Accessibility testing:\*\* PENDING



\*\*Student UAT:\*\* PENDING



\*\*Release management:\*\* PENDING



\*\*Overall Week 4 QA sign-off: PENDING\*\*



The project must not be marked fully QA-approved or release-ready until the outstanding tests, UAT activities, security checks and release requirements have been completed and supported by evidence.



\---



\*\*Prepared by:\*\* Deva Kanchana  

\*\*Work Area:\*\* WA9 – QA, Test Automation \& Release Management

