# npm audit — Vulnerability Assessment Report

## 1. Assessment Information

- Assessment date: 14 November 2026
- Repository: HackHub
- Branch: `wa9/deva-qa-release`
- Tool: npm audit
- Node.js: `v24.18.0`
- npm: `11.21.1`
- Scope: Root and backend npm dependency trees

## 2. Objective

Identify known security vulnerabilities in installed npm dependencies using npm audit.

## 3. Execution

Root command:

```powershell
npm audit --json > docs\security-assessment\2026-11-12\npm-audit\evidence\npm-audit-root-2026-11-14.json 2>&1
```

Backend command, executed from the `backend` directory:

```powershell
npm audit --json > ..\docs\security-assessment\2026-11-12\npm-audit\evidence\npm-audit-backend-2026-11-14.json 2>&1
```

Both commands returned exit code `0`.

## 4. Results

| Severity | Root | Backend |
|---|---:|---:|
| Info | 0 | 0 |
| Low | 0 | 0 |
| Moderate | 0 | 0 |
| High | 0 | 0 |
| Critical | 0 | 0 |
| **Total** | **0** | **0** |

## 5. Evidence

- `evidence/npm-audit-root-2026-11-14.json`
- `evidence/npm-audit-backend-2026-11-14.json`
- `evidence/npm-audit-root.json` — previous 12 November result
- `evidence/npm-audit-backend.json` — previous 12 November result

## 6. Findings

No known dependency vulnerabilities were reported by npm audit in either dependency tree during this assessment.

- Confirmed dependency findings: 0
- Critical: 0
- High: 0
- Moderate: 0
- Low: 0

## 7. Limitations

npm audit checks known vulnerabilities associated with npm dependencies. It does not establish that application source code, runtime behavior, configuration, or non-npm components are free of security issues.

## 8. Conclusion

**Result: PASS**

Both root and backend dependency audits completed successfully and reported zero known vulnerabilities. No dependency remediation was identified as necessary from these audit results.
