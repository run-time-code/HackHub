# Arjun - Parameter Discovery Assessment Report

## 1. Assessment Information

- Assessment date: 14 November 2026
- Repository: HackHub
- Branch: `wa9/deva-qa-release`
- Tool: Arjun
- Version: 2.2.7
- Target: `http://localhost:5000/api/hackathons`
- HTTP method: GET
- Assessment type: Parameter discovery
- Execution status: Completed
- Exit code: 0

## 2. Objective

Identify potentially undocumented HTTP query parameters accepted by the public HackHub hackathons API endpoint.

## 3. Environment

- Python: 3.12.10
- Arjun executable: `.security-tools\Scripts\arjun.exe`
- API server: Running locally
- MongoDB: Connected
- API health check: HTTP 200
- Hackathons endpoint: HTTP 200

## 4. Scan Configuration

- Method: GET
- Threads: 1
- Delay: 1 second
- Timeout: 10 seconds
- Stable response comparison: Enabled
- Target: Local HackHub API only

## 5. Scan Results

Arjun completed its parameter discovery process successfully.

Detected parameter:

- `sort`

Arjun identified this parameter based on HTTP response-code differences.

The parameter is already implemented in the application.

The hackathons service supports:
- `title`
- `newest`
- `deadline`

## 6. Manual Validation

The discovered parameter was manually validated using HTTP GET requests.

| Request | Observed HTTP status | Result |
|---|---:|---|
| `?sort=title` | 200 | PASS |
| `?sort=newest` | 200 | PASS |
| `?sort=deadline` | 200 | PASS |
| `?sort=invalid` | 400 | PASS |

The three supported values were accepted. An unsupported value was rejected with HTTP 400.

## 7. Findings

No security vulnerability was confirmed.

The discovered `sort` parameter is an expected application parameter rather than an undocumented security weakness.

The service validates sort values against an explicit allowlist.

## 8. Conclusion

Arjun 2.2.7 executed successfully against the local HackHub API.

One parameter, `sort`, was discovered and manually validated. The application accepted supported values and rejected an unsupported value.

No confirmed vulnerability was identified during this parameter-discovery assessment.

This result does not establish that the entire API is free from vulnerabilities.

## 9. Evidence

Evidence is stored in `evidence/`:

- `arjun-help-2026-11-14.txt`
- `arjun-installation-2026-11-14.txt`
- `target-verification-2026-11-14.txt`
- `arjun-scan-2026-11-14.json`
- `arjun-scan-2026-11-14.txt`

