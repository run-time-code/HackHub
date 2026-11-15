# ProjectDiscovery httpx Retest Record

**Retest date:** 2026-11-15  
**Status:** NOT COMPLETED — execution remains blocked.

## 1. Original assessment limitation

The ProjectDiscovery httpx executable was installed successfully, but Windows Application Control blocked execution.

Three matching Code Integrity Event ID 3077 records were captured.

Policy ID:

`0283ac0f-fff1-49ae-ada1-8a933130cad6`

## 2. Retest results

| Verification | Result |
|---|---|
| Binary installation | PASS |
| SHA256 captured | PASS |
| Authenticode status captured | PASS — NotSigned |
| Version execution | BLOCKED |
| HTTP probing | NOT PERFORMED |
| Vulnerability retest | NOT PERFORMED |

## 3. Evidence reviewed

- `evidence/httpx-installation-2026-11-15.txt`
- `evidence/httpx-execution-block-2026-11-15.txt`

## 4. Retest conclusion

The execution restriction remains unresolved. No successful ProjectDiscovery httpx scan or application security retest can be claimed.

**Final classification: BLOCKED / UNABLE TO EXECUTE.**

## 5. Required future retest

1. Obtain an organization-approved execution environment or approved binary.
2. Verify its provenance and integrity.
3. Confirm that the tool starts and reports its version.
4. Probe only authorized local HackHub frontend and API endpoints.
5. Preserve raw output and document response coverage.
6. Reassess any observations before assigning security findings.

No Windows security controls were changed. No HackHub application source files were modified.
