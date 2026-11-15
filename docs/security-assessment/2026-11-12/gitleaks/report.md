# Gitleaks - Vulnerability Assessment Report

## 1. Assessment Information

- Tool: Gitleaks
- Tool version: 8.30.1
- Assessment date: 14 November 2026
- Tester: Security assessment
- Repository: HackHub
- Branch: wa9/deva-qa-release
- Target: Local repository working tree and Git history
- Environment: Windows 10 Home, PowerShell 5.1

## 2. Objective

Identify potential hard-coded secrets, API keys, tokens and credentials in the repository and its Git history.

## 3. Scope

- Authorized target: Local HackHub repository.
- Working-tree directories scanned: apps, backend, data_importer, tools and .github.
- Git history: Repository history scanned using `gitleaks git`.
- Excluded from working-tree directory scans: .git, .security-tools, .apps, .turbo, node_modules, docs and root-level files.
- The working-tree assessment is therefore a targeted scan, not a complete scan of every repository file.

## 4. Testing Methodology

- Installed Gitleaks v8.30.1 from its official GitHub release.
- Verified the downloaded archive SHA-256 against the published checksum:
  D29144DEFF3A68AA93CED33DDDF84B7FDC26070ADD4AA0F4513094C8332AFC4E
- Verified the executable version and command help.
- Scanned Git history using `gitleaks git`.
- Scanned each selected working-tree directory separately using `gitleaks dir`.
- Used JSON output with redaction enabled.
- Inspected finding metadata and local environment-file tracking/ignore status without printing secret values.
- Checked variable names and value lengths only. No credential values were copied into assessment documents.

## 5. Findings

| ID | Finding | Severity | Affected Component | Status |
|---|---|---|---|---|
| GL-001 | Eight generic-api-key detections in local environment files | Review required | apps/api/.env and apps/api/apps/api/.env | Owner verification pending |

### Finding details

Gitleaks reported eight `generic-api-key` detections:

- `apps/api/.env`: JWT_SECRET, ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, RESEND_API_KEY, CLOUDINARY_API_SECRET, GOOGLE_CLIENT_SECRET and CSRF_SECRET.
- `apps/api/apps/api/.env`: RESEND_API_KEY.

Both files were verified as not tracked by Git and covered by existing Git ignore rules.

The Git history scan returned zero findings. The other scanned working-tree directories also returned zero findings.

The detections establish that non-empty values matching Gitleaks' generic API key rule exist in these local files. They do not establish that the values are active, valid, externally accessible or exposed in a public repository.

No confirmed committed credential exposure was identified by this assessment.

## 6. Evidence

Evidence is stored in:

`docs/security-assessment/2026-11-12/gitleaks/evidence/`

Relevant files:

- `gitleaks-git-history-2026-11-14.json`
- `gitleaks-apps-2026-11-14.json`
- `gitleaks-backend-2026-11-14.json`
- `gitleaks-data_importer-2026-11-14.json`
- `gitleaks-tools-2026-11-14.json`
- `gitleaks--github-2026-11-14.json`
- Corresponding error logs and installation evidence, where generated.

The initial working-tree command using an unsupported `--exclude-path` option failed and is not counted as a successful scan.

## 7. Impact Analysis

If any detected value is an active credential and becomes accessible to an unauthorized party, possible impacts include:

- Unauthorized token signing or session-related activity if application secrets are exposed.
- Unauthorized email service usage if the Resend key is active.
- Unauthorized Cloudinary operations if the Cloudinary secret is active.
- Unauthorized Google OAuth application operations if the Google client secret is active.

These are potential impacts only. Credential validity and exposure outside the local ignored files have not been established.

## 8. Assessment Result

- Total Gitleaks detections: 8
- Critical confirmed vulnerabilities: 0
- High confirmed vulnerabilities: 0
- Medium confirmed vulnerabilities: 0
- Low confirmed vulnerabilities: 0
- Informational / review-required detections: 8
- Git history detections: 0
- Other selected working-tree directories: 0 detections

## 9. Conclusion

Gitleaks v8.30.1 executed successfully.

Eight potential secret detections were found in two local environment files under `apps`. Both files are ignored by Git and are not tracked. The Git history scan found no detections.

No confirmed credential exposure or exploitable vulnerability was established. The eight detections require the repository owner to verify whether the values are active credentials and whether they have ever been shared, committed, uploaded or otherwise exposed.

The assessment is limited to the directories and history described above. It is not a complete scan of every repository file.

Overall status: FINDINGS - OWNER VERIFICATION REQUIRED.

## 10. References

- Gitleaks documentation: https://github.com/gitleaks/gitleaks
- Gitleaks usage: https://github.com/gitleaks/gitleaks#usage
