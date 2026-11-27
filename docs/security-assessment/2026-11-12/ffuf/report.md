# FFUF - Vulnerability Assessment Report

## 1. Assessment Information

- Tool: ffuf (Fuzz Faster U Fool)
- Tool version requested: v2.3.0
- Assessment date: 15 November 2026
- Repository: HackHub
- Branch: wa9/deva-qa-release
- Environment: Windows 11 development workstation
- Installation method: Official Go module installation
- Executable: `.security-tools/ffuf/ffuf.exe`
- Target: Not scanned
- Assessment status: Blocked by Windows Application Control

## 2. Objective

Assess the availability of ffuf for authorized local web fuzzing and endpoint discovery against the HackHub development application.

## 3. Scope

### Intended scope
- Local HackHub frontend and API only.
- Controlled, low-rate HTTP fuzzing.
- Authorized development environment.

### Exclusions
- Production systems and external websites.
- Destructive testing and state-changing requests.
- Credential attacks, data extraction, and denial-of-service testing.

## 4. Testing Methodology

1. Checked PATH and `.security-tools` for an existing ffuf executable.
2. Confirmed Go version: `go1.27.4 windows/amd64`.
3. Installed the official Go module:
   `github.com/ffuf/ffuf/v2@v2.3.0`
4. Go installation completed with exit code 0.
5. Confirmed the executable was created:
   `.security-tools/ffuf/ffuf.exe`
6. Recorded SHA-256:
   `59E6BCB544D21ACC63258B9FED89310FE9286A9AA30DF21F3C730B58CEC304AC`
7. Authenticode signature status was `NotSigned`.
8. Execution was attempted using the version command.
9. Windows Application Control blocked execution.
10. Code Integrity Operational log contained three Event ID 3077 entries associated with the executable.

No HTTP fuzzing requests were performed because the executable could not run.

## 5. Findings

| ID | Finding | Severity | Affected Component | Status |
|---|---|---|---|---|
| FFUF-001 | Windows Application Control blocked the unsigned ffuf executable | Informational / Environment limitation | Assessment workstation | Open - blocked |

No application vulnerability was confirmed because no fuzzing scan was performed.

## 6. Evidence

Evidence is stored in the `evidence` directory:

- `ffuf-installation-2026-11-15.txt`
- `ffuf-execution-block-2026-11-15.txt`

The executable is located at `.security-tools/ffuf/ffuf.exe`.

## 7. Impact Analysis

The execution restriction prevented the planned fuzzing assessment. Consequently, endpoint discovery, parameter fuzzing, response analysis, and application vulnerability identification could not be completed using ffuf.

This is an assessment coverage limitation. It does not demonstrate that the HackHub application is vulnerable or secure.

## 8. Assessment Result

- Confirmed application vulnerabilities: 0
- Critical: 0 confirmed
- High: 0 confirmed
- Medium: 0 confirmed
- Low: 0 confirmed
- Informational / environment limitations: 1
- Fuzzing requests performed: 0
- Execution status: Blocked

The zero confirmed vulnerabilities result must not be interpreted as a clean fuzzing result.

## 9. Conclusion

The official ffuf v2.3.0 Go module installation completed successfully and produced an executable. However, Windows Code Integrity blocked execution because the binary did not meet the active Enterprise signing-level requirements or violated the applicable code integrity policy.

Three Event ID 3077 records were captured. No policy bypass or weakening was attempted. No fuzzing scan was performed.

The assessment remains incomplete until ffuf can be executed in an appropriately authorized environment.

## 10. References

- Official project: https://github.com/ffuf/ffuf
- Go installation documentation: https://go.dev/doc/install
- Microsoft Code Integrity documentation: https://learn.microsoft.com/en-us/windows/security/application-security/application-control/app-control-for-business/
