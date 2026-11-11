\# HackHub – Week 3 Load Test Report



\*\*Work Area:\*\* WA9 – QA, Test Automation \& Release Management  

\*\*Owner:\*\* Deva Kanchana  

\*\*Execution Date:\*\* 31 October 2026  

\*\*Test Tool:\*\* Grafana k6 v2.3.0  

\*\*Environment:\*\* Local Windows environment  

\*\*API:\*\* `http://127.0.0.1:5100`  

\*\*Database:\*\* `hackhub\_loadtest` (isolated local database)



\## 1. Objective



Evaluate HackHub API behaviour under 100 concurrent virtual users across three major workflows:



\- Hackathon browsing

\- Hackathon searching

\- User login



The test was configured to run each scenario for 30 seconds.



\## 2. Test Environment



| Item | Configuration |

|---|---|

| Virtual users – browsing | 89 |

| Virtual users – searching | 10 |

| Virtual users – login | 1 |

| Total maximum VUs | 100 |

| Duration per scenario | 30 seconds |

| Seeded test account | loadtest@example.com |

| Seeded hackathon records | 300 |

| MongoDB database | hackhub\_loadtest |

| API port | 5100 |



\## 3. Execution Results



| Metric | Observed result |

|---|---:|

| Maximum concurrent VUs | 100 |

| Total HTTP requests | 2,962 |

| Request failure rate | 89.90% |

| Successful checks | 299 |

| Failed checks | 2,663 |

| Average HTTP response time | 22.53 ms |

| Median HTTP response time | 2.04 ms |

| p90 HTTP response time | 16.05 ms |

| p95 HTTP response time | 68.51 ms |

| Maximum HTTP response time | 710.11 ms |

| HTTP request rate | 81.37 requests/second |



\### Threshold evaluation



| Threshold | Required | Actual | Status |

|---|---:|---:|---|

| HTTP failure rate | Below 1% | 89.90% | FAIL |

| p95 response time | Below 1,000 ms | 68.51 ms | PASS |



\*\*Overall load-test result: FAIL\*\*



The latency threshold passed, but the error-rate threshold failed substantially.



\## 4. Bottleneck Investigation



\### 4.1 Global API rate limiter



Source inspected: `apps/api/src/app.js`



The application configures the global API limiter as follows:



\- Window: 15 minutes

\- Request limit: 300

\- Mount point: `/api`



The load test generated 2,962 HTTP requests from a single local machine/IP during the test.



After the rate limit was exceeded, the browsing and searching endpoints returned HTTP 429 responses.



A separate endpoint verification confirmed:



| Endpoint | Observed response |

|---|---|

| `/api/hackathons?page=1\&limit=20` | HTTP 429 |

| `/api/hackathons?q=ai\&skills=react\&page=1\&limit=20` | HTTP 429 |



This confirms that rate limiting materially affected the test results.



\### 4.2 Login failures



The login scenario also encountered:



\- HTTP 500 – Server error

\- HTTP 429 – Too many requests



The login workflow requires a CSRF bootstrap request before the login request. The login limiter also restricts repeated authentication attempts.



The HTTP 500 response requires separate investigation in the API logs. The HTTP 429 responses indicate rate-limit rejection.



\### 4.3 Interpretation



The test primarily measured the configured rate-limiting behaviour under a concentrated single-IP workload.



The low p95 response time must not be interpreted as proof that the API can sustain 100 concurrent users successfully.



The actual database and application processing capacity under an unrestricted controlled workload remains unverified.



\## 5. Findings and Recommendations



| ID | Finding | Recommended action |

|---|---|---|

| LT-001 | Global API rate limiter reached during load test | Review rate-limit behaviour and design a controlled test-only configuration |

| LT-002 | Browsing endpoint returned HTTP 429 | Repeat browsing test after controlled limiter setup |

| LT-003 | Search endpoint returned HTTP 429 | Repeat search test after controlled limiter setup |

| LT-004 | Login returned HTTP 500 | Investigate server-side login error logs |

| LT-005 | Login returned HTTP 429 | Respect login limiter and isolate authentication testing |

| LT-006 | Database/application capacity not independently established | Repeat controlled load test and monitor MongoDB and API resources |



Do not weaken production rate limits merely to obtain a passing load-test result.



Any test-specific limiter configuration must remain isolated from production settings and must be reviewed before use.



\## 6. Evidence



| Evidence | Location |

|---|---|

| Raw k6 execution output | `docs/qa/WEEK\_3/load-test-output.txt` |

| Load-test scenario | `tools/loadtest/scenarios.js` |

| Load-test instructions | `tools/loadtest/README.md` |

| Rate-limit implementation | `apps/api/src/app.js` |

| Endpoint verification | Terminal execution recorded on 31 October 2026 |



\## 7. Communication and Ownership



\- \*\*Nandhini:\*\* Review browsing/search performance findings and investigate application-level bottlenecks.

\- \*\*Senthil:\*\* Review load-test infrastructure, API capacity and database resource behaviour.

\- \*\*QA – Deva Kanchana:\*\* Preserve execution evidence, track findings and coordinate retesting.



\## 8. Limitations



\- Test was conducted against a local environment, not staging or production.

\- All virtual users originated from one machine/IP.

\- Rate limiting significantly affected the result.

\- CPU, memory, MongoDB connection-pool utilisation and database query performance were not captured.

\- The login HTTP 500 cause remains undiagnosed.

\- A successful 100-user capacity test has not yet been established.



\## 9. Conclusion



The 100-VU k6 test completed its configured 30-second scenarios but failed the HTTP error-rate threshold with 89.90% failed requests.



Investigation confirmed that the global API rate limiter (300 requests per 15 minutes per IP) was exceeded. Browsing and searching returned HTTP 429, and login encountered HTTP 500 and HTTP 429 responses.



The findings have been identified for review by Nandhini and Senthil. A controlled retest is required before confirming HackHub's 100-concurrent-user performance.



\*\*Week 3 Load Test Status: EXECUTED – FAILED THRESHOLD\*\*



\*\*Capacity Validation Status: PENDING\*\*

