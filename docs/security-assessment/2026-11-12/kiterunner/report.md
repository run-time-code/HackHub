# Kiterunner Security Assessment Report

## 1. Assessment Information

| Field | Details |
|---|---|
| Assessment date | 14 November 2026 |
| Project | HackHub |
| Repository | `run-time-code/HackHub` |
| Branch | `wa9/deva-qa-release` |
| Tool | Kiterunner |
| Tool source | Assetnote official GitHub repository |
| Tester | Deva Kanchana |
| Intended target | `http://localhost:5000` |
| Assessment status | **BLOCKED — Scan not performed** |

## 2. Objective

The objective was to use Kiterunner to discover API routes and identify potentially exposed endpoints in the local HackHub API.

The assessment was intended to use a controlled scan against the locally running application.

## 3. Environment and Installation

| Component | Result |
|---|---|
| Operating system | Windows 10 Home, build 26200 |
| Architecture | AMD64 |
| Go version | 1.27.4 |
| Kiterunner source | Cloned successfully |
| Build configuration | Windows / AMD64 / CGO disabled |
| Executable generation | Successful |
| Executable path | `.security-tools\Scripts\kr.exe` |
| Executable size | 24,153,600 bytes |
| Authenticode signature | NotSigned |

The Kiterunner source was cloned from:

`https://github.com/assetnote/kiterunner`

The executable was successfully compiled using Go.

**Build exit code: 0**

## 4. Execution Failure

When attempting to execute the compiled binary using the version and help commands, Windows prevented execution.

Error:

`An Application Control policy has blocked this file.`

Windows Code Integrity recorded Event ID **3077** for the blocked executable.

### Policy investigation

Administrator-level inspection identified the following active policy:

| Property | Value |
|---|---|
| Policy name | VerifiedAndReputableDesktop |
| Policy ID | `0283ac0f-fff1-49ae-ada1-8a933130cad6` |
| Signed | Yes |
| Authorized | Yes |
| Currently enforced | Yes |

Additional inspection returned:

| Security setting | Result |
|---|---|
| Smart App Control | On |
| Defender antimalware mode | Normal |
| Kiterunner Authenticode status | NotSigned |

The unsigned executable was blocked by the active Windows application-control policy.

## 5. Scan Results

| Test | Result |
|---|---|
| Source repository cloned | PASS |
| Go environment verified | PASS |
| Windows executable compiled | PASS |
| Executable generated | PASS |
| Executable version check | BLOCKED |
| Executable help check | BLOCKED |
| API route discovery scan | NOT PERFORMED |
| Vulnerability identification | NOT ASSESSED |

No Kiterunner scan was completed. Therefore, no API vulnerabilities can be confirmed or ruled out based on this tool.

## 6. Executable Integrity Evidence

**SHA-256:**

`50CEFCE12C1FD3910895E160E81C515F84151F9A99B8C0F9095AE7521C1DFEA6`

The executable was generated locally from the cloned source repository. Its signature check returned `NotSigned`.

## 7. Remediation and Next Steps

1. Preserve the source checkout and compiled executable for assessment traceability.
2. Do not disable Smart App Control or weaken Windows security settings solely to execute this tool.
3. Check whether Assetnote provides a trusted, appropriately signed Windows release.
4. Alternatively, request access to an approved testing environment where Kiterunner can execute.
5. Once execution is authorized, perform a controlled API route discovery scan against the local HackHub API.
6. Review discovered routes and validate any findings before classifying them as vulnerabilities.

## 8. Final Assessment

**Final status: BLOCKED — EXECUTION PREVENTED BY WINDOWS APPLICATION CONTROL**

The Kiterunner source was obtained and the Windows AMD64 executable was compiled successfully. However, Smart App Control blocked execution because the binary was unsigned.

The intended API scan could not be performed.

This is an environment/tool-execution limitation, not a confirmed vulnerability in HackHub. The assessment must remain marked as incomplete until an authorized execution environment is available.
