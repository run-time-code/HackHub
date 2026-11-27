# Checkov - Infrastructure Security Assessment Report

## 1. Assessment Information

- Tool: Checkov
- Tool version: 3.4.5
- Assessment date: 15 November 2026
- Tester: Repository owner / authorized assessor
- Repository: HackHub
- Branch: wa9/deva-qa-release
- Target: Local repository configuration files
- Environment: Windows PowerShell; Python 3.12.10 virtual environment

## 2. Objective

Assess infrastructure-as-code and GitHub Actions configuration against Checkov security policies. Identify configuration weaknesses, review the affected workflow definitions, apply authorized remediation, and verify the changes through a subsequent scan.

## 3. Scope

Files supplied as scan inputs:

- `apps/api/Dockerfile`
- `apps/api/docker-compose.yml`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy-production.yml`
- `.github/workflows/deploy-staging.yml`
- `.github/workflows/uptime.yml`

Frameworks used in the successful scans:

- Dockerfile
- GitHub Actions

Coverage limitations:

- The successful JSON reports contained Dockerfile and GitHub Actions results only.
- YAML and secrets results were not present in the reports.
- The Docker Compose file was supplied as an input but was not independently confirmed as scanned.
- The assessment did not cover live cloud infrastructure or production deployment execution.

Excluded from scope:

- Live production infrastructure
- External service configurations
- Actual production or staging deployment execution
- Runtime penetration testing
- Independent Docker Compose security validation

## 4. Testing Methodology

Checkov 3.4.5 was installed in the isolated virtual environment:

`.security-tools/checkov-venv`

The successful scans used the following framework arguments:

- `dockerfile`
- `yaml`
- `github_actions`
- `secrets`

The initial successful scan supplied the six target paths listed in Section 3.

The JSON output was parsed and inspected to identify the framework summaries and failed policies.

### Initial scan results

| Framework | Passed | Failed | Parsing errors |
|---|---:|---:|---:|
| Dockerfile | 48 | 0 | 0 |
| GitHub Actions | 219 | 5 | 0 |
| **Total reported** | **267** | **5** | **0** |

The five failed GitHub Actions policy checks were reviewed against the corresponding workflow source files.

Authorized remediation was applied to exactly these three files:

- `.github/workflows/ci.yml`
- `.github/workflows/deploy-production.yml`
- `.github/workflows/deploy-staging.yml`

The subsequent scan used the same six input paths and framework arguments.

### Retest results

| Framework | Passed | Failed | Parsing errors |
|---|---:|---:|---:|
| Dockerfile | 48 | 0 | 0 |
| GitHub Actions | 224 | 0 | 0 |
| **Total reported** | **272** | **0** | **0** |

The retest Checkov process exit code was `0`.

## 5. Findings

| ID | Checkov policy | Finding | Affected component | Initial status | Retest |
|---|---|---|---|---|---|
| CK-001 | CKV_GHA_3 | Suspicious use of curl with secrets | Staging Render deploy hook | Failed | Passed |
| CK-002 | CKV_GHA_3 | Suspicious use of curl with secrets | Staging API health check | Failed | Passed |
| CK-003 | CKV2_GHA_1 | Explicit top-level least-privilege permissions missing | CI workflow | Failed | Passed |
| CK-004 | CKV2_GHA_1 | Explicit top-level least-privilege permissions missing | Production deployment workflow | Failed | Passed |
| CK-005 | CKV2_GHA_1 | Explicit top-level least-privilege permissions missing | Staging deployment workflow | Failed | Passed |

Severity was not assigned because the returned Checkov findings did not provide a verified severity classification.

These are configuration-policy findings. They do not establish that an attacker successfully exploited the workflows or obtained credentials.

## 6. Evidence

Evidence is stored under:

`docs/security-assessment/2026-11-12/checkov/evidence/`

Relevant evidence files:

- `checkov-config-scan-retry-2026-11-15.txt`
- `checkov-config-scan-retry-2026-11-15.json/results_json.json`
- `checkov-remediation-scan-2026-11-15.txt`
- `checkov-remediation-scan-2026-11-15.json/results_json.json`
- `workflow-backups-2026-11-15/`
- `documentation-backups-2026-11-15/`

The earlier unsuccessful CLI configuration attempt was retained as evidence and was not counted as a completed scan.

## 7. Impact Analysis

### Direct secret interpolation in shell commands

Directly interpolating secrets into shell command strings can expose values to shell interpretation and increase injection risk when command construction or input handling is unsafe.

### Missing explicit workflow-level permissions

Without an explicit workflow-level token permission policy, effective GitHub Actions token permissions can depend on repository or organization defaults.

### Remediation applied

The affected workflows were updated to:

- Declare explicit workflow-level `contents: read` permissions.
- Pass staging deployment credentials through step-level environment variables.
- Reference those environment variables in shell commands rather than directly interpolating GitHub secrets into the command text.

No successful exploit or credential disclosure was demonstrated during this assessment.

## 8. Assessment Result

### Initial scan

- Total reported checks: 272
- Passed: 267
- Failed: 5
- Parsing errors: 0

### Remediation retest

- Total reported checks: 272
- Passed: 272
- Failed: 0
- Parsing errors: 0
- Checkov process exit code: 0

The initial and retest framework pass counts differ. Therefore, the comparison should be interpreted using the five original failed policies becoming passing checks, rather than assuming every individual check maps identically between the two summaries.

## 9. Conclusion

All five originally reported GitHub Actions policy failures passed in the remediation retest. The Dockerfile checks also remained at 48 passed and zero failed.

The retest completed with exit code `0` and no parsing errors.

This represents a successful Checkov remediation retest for the reported Dockerfile and GitHub Actions checks.

It is not a complete infrastructure security certification. YAML-specific results, secrets-specific results, Docker Compose-specific coverage, live deployment behavior, and runtime security require separate validation.

## 10. References

- Checkov documentation: https://www.checkov.io/
- GitHub Actions workflow permissions: https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication
- GitHub Actions security hardening: https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions
