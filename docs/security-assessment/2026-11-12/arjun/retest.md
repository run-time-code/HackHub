# Arjun - Retest Record

## 1. Retest Information

- Retest date: 14 November 2026
- Tool: Arjun 2.2.7
- Target: `http://localhost:5000/api/hackathons`
- HTTP method: GET

## 2. Retest Objective

Verify that the discovered `sort` parameter accepts supported values and rejects unsupported values.

## 3. Retest Results

| Test case | Expected result | Actual result | Status |
|---|---|---|---|
| `sort=title` | HTTP 200 | HTTP 200 | PASS |
| `sort=newest` | HTTP 200 | HTTP 200 | PASS |
| `sort=deadline` | HTTP 200 | HTTP 200 | PASS |
| `sort=invalid` | HTTP 400 | HTTP 400 | PASS |

## 4. Verification

The three supported sorting values were accepted.

The unsupported sorting value was rejected with HTTP 400.

No source-code modification was needed for this assessment.

## 5. Final Status

- Arjun execution: Completed
- Parameter discovery: Successful
- Manual validation: Passed
- Confirmed vulnerabilities: None
- Remediation required: No
- Retest status: PASS


