# Semgrep Security Assessment Report

**Assessment date:** 15 November 2026  
**Tool:** Semgrep CLI 1.185.0  
**Assessment status:** Partially executed — limited file-level coverage

## 1. Objective

Perform a targeted static application security analysis of the HackHub repository using five locally defined Semgrep rules.

## 2. Environment

- Execution environment: WSL Ubuntu 24.04
- Python: 3.12.3
- Semgrep CLI: 1.185.0
- Rules file: `evidence/hackhub-local-security-rules-2026-11-15.yml`
- Rules validated successfully: 5
- `pip check`: no broken requirements reported.

## 3. Custom rules

The local rules check for:
1. `eval()` usage.
2. Dynamic `Function` constructor usage.
3. Assignment to `innerHTML`.
4. `document.write()` usage.
5. Child-process `exec()` with `shell: true`.

These are targeted pattern checks, not a comprehensive security ruleset.

## 4. Successful execution results

| Target | Files scanned | Findings | Status |
|---|---:|---:|---|
| Temporary detection fixture | 1 | 1 expected `eval()` finding | Successful |
| `apps/api/src/server.js` | 1 | 0 | Successful |
| `apps/api/middleware/sanitizeMiddleware.js` | 1 | 0 | Successful |

All successful scans executed the five custom rules and reported approximately 100% parsing for the target file.

The temporary fixture finding demonstrates that the custom `eval()` rule can detect its intended test expression. It is not a HackHub application finding.

## 5. Incomplete multi-file scans

Attempts to scan `apps/api` and then `apps/api/controllers` plus `apps/api/middleware` did not complete.

The commands were interrupted after extended execution. Semgrep reported an RPC subprocess failure with exit code 126.

These attempts are classified as incomplete. They must not be interpreted as zero findings or successful scans.

## 6. Findings and interpretation

- One expected finding was detected in the temporary test fixture.
- No findings were reported in the two successfully scanned application files.
- No confirmed vulnerability was established by these limited scans.
- The zero-finding result for `sanitizeMiddleware.js` does not resolve the separate prototype-key handling concern raised during CodeQL review. The custom rules do not specifically test that behavior.

## 7. Coverage limitations

- Only two application source files were scanned successfully.
- The full API, frontend, backend-prototype and GitHub Actions scopes were not successfully scanned.
- No remote Semgrep registry ruleset was successfully executed.
- The five custom rules cover only a small set of patterns.
- Authentication-dependent, runtime, stored-input and deployment behavior were not tested.

## 8. Remediation status

No application source code was modified as part of this Semgrep assessment. Multi-file execution limitations remain unresolved.

## 9. Conclusion

Semgrep installation, local rule validation and selected individual-file scans succeeded. Multi-file scans failed to complete because of RPC subprocess errors. The assessment is therefore **partially executed with limited coverage**, not a repository-wide security pass.

## 10. Evidence

See the `evidence` directory for:
- Local custom rules YAML.
- Semgrep help and installation evidence.
- Successful test fixture output.
- Successful `server.js` and sanitizer summaries.
- Multi-file scan failure summary.
