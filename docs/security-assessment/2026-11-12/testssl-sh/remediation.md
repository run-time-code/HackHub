# testssl.sh Remediation Record

## Assessment Status

Not applicable to the local development endpoints because neither endpoint completed a TLS handshake.

## Observations

1. Frontend HTTP endpoint returned HTTP 200.
2. API health endpoint returned HTTP 200.
3. Frontend HTTPS request failed with Windows curl TLS handshake error `SEC_E_INVALID_TOKEN (0x80090308)`.
4. API HTTPS request failed with the same TLS handshake error.
5. No testssl.sh scan was performed.

## Remediation Actions

- No application source code was changed.
- No TLS configuration was changed.
- No certificate or cipher-suite remediation was attempted.
- The API HSTS response header was not treated as proof of HTTPS support.

## Recommended Follow-up

When an authorized HTTPS-enabled staging or production endpoint is available:

1. Confirm that the endpoint completes a TLS handshake.
2. Run testssl.sh against that hostname.
3. Preserve the complete scanner output.
4. Review protocol versions, cipher suites, certificate chain, and security findings.
5. Record any required remediation and repeat the scan.

## Current Status

Open — TLS configuration remains unassessed.
