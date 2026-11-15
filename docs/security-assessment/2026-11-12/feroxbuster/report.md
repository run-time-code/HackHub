# Feroxbuster - Vulnerability Assessment Report

## 1. Assessment Information

- Tool: Feroxbuster
- Tool version: 2.13.1
- Assessment date: 14 November 2026
- Tester: Manual assessment execution
- Repository: HackHub
- Branch: wa9/deva-qa-release
- Target: http://localhost:5000/api
- Environment: Local Windows environment; API running on localhost

## 2. Objective

Discover API routes and identify potentially exposed web resources using a controlled, read-only content discovery scan.

## 3. Scope

- Authorized target: Local HackHub API at http://localhost:5000/api
- Components tested: 11 known API route prefixes using GET requests.
- Excluded components: External systems, production environments, authenticated-only workflows, write operations, and unrestricted recursive discovery.
- Scan rate: 2 requests per second.
- Concurrency: 2 threads.
- Timeout: 10 seconds.
- Maximum scan duration: 2 minutes.
- Recursion: Disabled.

## 4. Testing Methodology

Feroxbuster v2.13.1 was downloaded from the official GitHub release.

- Release archive SHA-256: `6255FC1998220833D22B221E5C740895ADA2A5FBAF31587E799276C59DA7DAB2`
- Executable SHA-256: `50CEFCE12C1FD3910895E160E81C515F84151F9A99B8C0F9095AE7521C1DFEA6`
- HTTP method: GET
- Wordlist: `feroxbuster-wordlist-2026-11-14.txt`
- Output: JSON Lines and text output
- State saving: Disabled

The scan used a limited wordlist derived from known API route names. Follow-up requests were made to validate the `/api/teams` endpoint.

## 5. Findings

| ID | Finding | Severity | Affected Component | Status |
|---|---|---|---|---|
| - | No confirmed vulnerability identified | Informational | Tested API routes | No finding |

Observed responses:

| Endpoint | Response | Assessment |
|---|---:|---|
| `/api/health` | 200 | Accessible |
| `/api/hackathons` | 200 | Accessible |
| `/api/stats` | 200 | Accessible |
| `/api/teams` without required parameter | 400 | Expected validation |
| `/api/teams` with external Unstop ID | 400 | Invalid identifier format |
| `/api/teams` with valid MongoDB ObjectId | 200 | Valid request accepted |
| `/api/notifications` | 401 | Authentication required |
| `/api/calendar` | 401 | Authentication required |
| `/api/reminders` | 401 | Authentication required |
| `/api/saved` | 401 | Authentication required |

The 401 responses do not independently demonstrate an authentication vulnerability. The 400 response from `/api/teams` was explained by the service's ObjectId validation.

## 6. Evidence

Evidence is stored under `evidence/`:

- `feroxbuster-wordlist-2026-11-14.txt`
- `feroxbuster-scan-2026-11-14.jsonl`
- `feroxbuster-scan-2026-11-14.txt`
- `feroxbuster-teams-validation-2026-11-14.txt`

The scan JSON output is JSON Lines (one JSON object per line), not a single JSON document. Ten lines were validated as valid JSON records.

## 7. Impact Analysis

No confirmed security impact was identified from this scan.

The scan was limited to known route prefixes and unauthenticated GET requests. It did not test authorization boundaries with multiple user identities, parameter fuzzing, business logic, or write operations. Therefore, the absence of findings does not establish that the entire API is secure.

## 8. Assessment Result

- Confirmed vulnerabilities: 0
- Critical: 0
- High: 0
- Medium: 0
- Low: 0
- Informational findings: 0
- Scan execution: Successful
- Follow-up endpoint validation: Successful

## 9. Conclusion

Feroxbuster v2.13.1 executed successfully against the local HackHub API. The scan discovered accessible routes and authentication-protected endpoints. Follow-up testing confirmed that `/api/teams` accepts a valid MongoDB ObjectId and returns HTTP 200.

No confirmed vulnerability was identified within the limited assessment scope. No application code changes or security remediation were required based on these results.

## 10. References

- Feroxbuster: https://github.com/epi052/feroxbuster
- Feroxbuster documentation: https://epi052.github.io/feroxbuster-docs/
