# testssl.sh Security Assessment Report

## 1. Assessment Summary

- Tool: testssl.sh
- Assessment date: 2026-11-15
- Target: Local HackHub development environment
- Result: Not applicable — no local TLS endpoint detected.
- TLS vulnerability scan: Not performed.

## 2. Scope

| Component | URL |
|---|---|
| Frontend | http://localhost:5173/ |
| API health | http://localhost:5000/api/health |

## 3. HTTP Availability Verification

Both local services responded successfully over HTTP.

- Frontend: HTTP 200 OK.
- API health: HTTP 200 OK.
- API service: hackhub-api.
- Database: connected (`db: up`).

## 4. HTTPS Verification

HTTPS requests were attempted against both local development ports.

| Target | Result |
|---|---|
| https://localhost:5173/ | TLS handshake failed |
| https://localhost:5000/api/health | TLS handshake failed |

Windows curl reported:

`SEC_E_INVALID_TOKEN (0x80090308)`

This indicates that the endpoints did not complete a TLS handshake. The local services are serving HTTP rather than HTTPS on these ports.

## 5. testssl.sh Execution Status

testssl.sh was not executed because neither local endpoint provided a working TLS service.

A TLS scanner requires a TLS-enabled target. Running it against these HTTP-only ports would not produce a meaningful TLS configuration assessment.

## 6. Findings

- No TLS configuration findings can be established for these local endpoints.
- TLS protocol versions, cipher suites, certificate validity, and TLS vulnerabilities remain unassessed.
- The API's HSTS response header does not establish that the API itself supports HTTPS.
- The successful HTTP health checks establish service availability, not TLS security.

## 7. Limitations

- Assessment was limited to local development endpoints.
- No authorized staging or production HTTPS target was supplied.
- No TLS scan or certificate inspection was performed.
- This result must not be interpreted as a TLS security pass.

## 8. Conclusion

The local HackHub frontend and API were available over HTTP, but neither completed an HTTPS handshake on its development port. Therefore, testssl.sh could not perform a meaningful TLS assessment.

A separate assessment against an authorized HTTPS-enabled staging or production endpoint is required to evaluate TLS configuration.

## 9. Remediation

No application changes were made.

If HTTPS is required for deployment, configure TLS at the intended deployment endpoint or reverse proxy, then repeat the assessment against that HTTPS endpoint.

## 10. Evidence

See the evidence directory for the recorded HTTP and HTTPS verification results.
