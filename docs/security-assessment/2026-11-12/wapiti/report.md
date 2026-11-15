# Wapiti - Vulnerability Assessment Report

## 1. Assessment Information

- Tool: Wapiti
- Tool version: 3.3.2
- Assessment date: 14 November 2026
- Tester: Repository assessment owner
- Repository: HackHub (`run-time-code/HackHub`)
- Branch: `wa9/deva-qa-release`
- Target: `http://172.25.16.1:5000/api/`
- Environment: Local development API, reached from WSL Ubuntu 24.04
- Runtime: Python 3.12.3 in an isolated WSL virtual environment

## 2. Objective

Perform a restricted web application crawl to verify Wapiti installation, target connectivity, and basic URL discovery without executing vulnerability attack modules.

## 3. Scope

- Authorized target: Local HackHub API under `/api/`
- Components tested: API base URL and crawl accessibility
- Excluded components: Frontend, external services, other hosts, authenticated routes requiring credentials, and destructive or intrusive testing
- Crawl scope: Folder
- Crawl depth: 2
- Maximum links per page: 10
- Maximum scan time: 90 seconds
- Concurrent tasks: 1
- Timeout: 10 seconds

## 4. Testing Methodology

Wapiti 3.3.2 was installed in an isolated Python virtual environment in WSL Ubuntu 24.04.

The Windows API was independently verified as reachable and healthy. WSL-to-Windows connectivity was verified using the WSL gateway address `172.25.16.1`; the API health endpoint returned HTTP 200 and reported database status `up`.

The following crawl-only command was executed:

```bash
wapiti \
  -u http://172.25.16.1:5000/api/ \
  --scope folder \
  --module= \
  --depth 2 \
  --max-links-per-page 10 \
  --max-scan-time 90 \
  --tasks 1 \
  --timeout 10 \
  --flush-session \
  --no-bugreport \
  -v 1 \
  -f json \
  -o wapiti-crawl-only-2026-11-14.json \
  --log wapiti-crawl-only-2026-11-14.log
```

The empty module argument disabled all vulnerability attack modules. No SQL injection, XSS, SSRF, command execution, file upload, authentication brute force, or other active vulnerability tests were performed.

Wapiti completed and generated a JSON report and execution log.

## 5. Findings

| ID | Finding | Severity | Affected Component | Status |
|---|---|---|---|---|
| — | No vulnerability tests performed; attack modules disabled | Informational | API crawl scope | Documented limitation |

The JSON report contained zero entries in all 38 vulnerability categories, both anomaly categories, and all four additional-information categories. These zero entries do not establish that the application is free of vulnerabilities: the attack modules were deliberately disabled.

No confirmed vulnerability was identified by this crawl-only activity. Vulnerability coverage remains unassessed.

## 6. Evidence

Evidence directory: `evidence/`

- `wapiti-crawl-only-2026-11-14.json` — generated JSON report; 44,471 bytes
- `wapiti-crawl-only-2026-11-14.log` — execution log; 481 bytes

Evidence validation:
- JSON parsing: PASS
- Report metadata: Wapiti 3.3.2
- Target recorded in report: `http://172.25.16.1:5000/api/`
- Scope recorded in report: `folder`
- Crawled pages reported: 1
- Log records a GET request to `/api/`
- Wapiti terminal output: 1 URL/form discovered

## 7. Impact Analysis

No security impact can be concluded from a crawl-only assessment. The crawl confirms that the API base path was reachable from WSL and that Wapiti could complete its crawl and generate a report.

Only one page was reported as crawled. The scan did not establish coverage of the API's protected routes, request parameters, authentication flows, or application inputs.

## 8. Assessment Result

- Total confirmed vulnerabilities: 0
- Critical: 0
- High: 0
- Medium: 0
- Low: 0
- Informational: 1 documented scope limitation
- Crawl completion: Successful
- Vulnerability attack modules executed: None
- Vulnerability coverage: Not assessed

## 9. Conclusion

Wapiti 3.3.2 was installed and executed successfully against the local HackHub API. The restricted crawl completed, discovered one URL/form, and produced a valid JSON report and log.

This result is not a vulnerability scan pass. All attack modules were disabled intentionally to avoid intrusive testing. No source-code changes or security remediation were performed. A separate, explicitly authorized vulnerability assessment would be required to evaluate the API's security controls.

## 10. References

- Wapiti official project: https://wapiti-scanner.github.io/
- Wapiti source repository: https://github.com/wapiti-scanner/wapiti
