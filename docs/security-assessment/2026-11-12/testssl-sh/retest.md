# testssl.sh Retest Record

## Retest Date

2026-11-15

## Verification Results

| Test | Result |
|---|---|
| Frontend HTTP | PASS — HTTP 200 |
| API health HTTP | PASS — HTTP 200 |
| Frontend HTTPS | NOT APPLICABLE — TLS handshake failed |
| API HTTPS | NOT APPLICABLE — TLS handshake failed |
| testssl.sh scan | NOT RUN — no working local TLS endpoint |

## Retest Interpretation

The HTTP checks confirm that both local development services are available.

The HTTPS checks did not complete TLS handshakes. Therefore, no TLS protocol, cipher-suite, certificate, or vulnerability conclusions can be made.

## Final Status

Not applicable / blocked by absence of a local TLS endpoint.

This is not a TLS security pass. Repeat the assessment when an authorized HTTPS-enabled target is available.
