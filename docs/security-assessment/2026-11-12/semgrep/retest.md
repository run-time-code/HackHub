# Semgrep Retest Record

**Retest date:** 15 November 2026  
**Tool version:** Semgrep 1.185.0

## Successful checks

| Check | Result |
|---|---|
| Semgrep CLI version | Successful |
| Local custom rules validation | Successful — 5 rules |
| Temporary `eval()` detection fixture | Successful — 1 expected finding |
| `apps/api/src/server.js` | Successful — 0 findings |
| `apps/api/middleware/sanitizeMiddleware.js` | Successful — 0 findings |

## Incomplete checks

| Scope | Result |
|---|---|
| `apps/api` | Interrupted; RPC subprocess exit code 126 |
| `apps/api/controllers` and `apps/api/middleware` | Interrupted; RPC subprocess exit code 126 |
| Full repository | Not completed |

## Retest conclusion

The local Semgrep installation and individual-file execution work. Multi-file scans remain incomplete. No repository-wide pass can be claimed.

No source-code patch was made, so no vulnerability-specific remediation retest was applicable.

## Required next retest

After resolving the RPC execution issue:
1. Run the custom rules against small source-file groups.
2. Save complete JSON and text outputs.
3. Expand to the API, frontend, backend and workflow scopes.
4. Review all findings manually before assigning vulnerability status.
