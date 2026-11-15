# ProjectDiscovery httpx Assessment Report

**Assessment date:** 2026-11-15  
**Tool:** ProjectDiscovery httpx  
**Result:** BLOCKED — unable to execute  
**Target:** Local HackHub development services  
**Assessment type:** HTTP service probing

## 1. Objective

Assess the availability and HTTP response characteristics of the local HackHub frontend and API using ProjectDiscovery httpx.

## 2. Installation

The official Go module was installed using:

`go install github.com/projectdiscovery/httpx/cmd/httpx@latest`

Installation completed with exit code 0.

- Binary: `.security-tools/httpx/httpx.exe`
- Size: 69,236,736 bytes
- SHA256: `4FBFFC4FE4F5AD7B1FD3357964AAB6DAFD740D8032025E71D81A5A6E382BC77D`
- Authenticode signature: NotSigned

## 3. Execution result

The attempt to execute `httpx.exe -version` was blocked by Windows Application Control.

Three matching Code Integrity Operational events, Event ID 3077, were recorded at approximately 11:04:42–11:04:54 AM on 2026-11-15.

The events identify policy ID:

`0283ac0f-fff1-49ae-ada1-8a933130cad6`

The executable did not meet Enterprise signing-level requirements or violated the active Code Integrity policy.

## 4. Scan coverage

- Tool installation: successful.
- Executable identity/version verification: incomplete.
- HTTP probing: not performed.
- Frontend/API response discovery using ProjectDiscovery httpx: not performed.
- Vulnerability assessment: not performed.

## 5. Findings

No application security findings can be concluded from this attempt because the tool did not execute.

The Windows execution restriction is an environment limitation, not an application vulnerability.

## 6. Evidence

- `evidence/httpx-installation-2026-11-15.txt`
- `evidence/httpx-execution-block-2026-11-15.txt`

## 7. Conclusion

**Classification: BLOCKED / UNABLE TO EXECUTE.**

ProjectDiscovery httpx installed successfully but Windows Application Control prevented execution. No HTTP probes or security scans were performed. This result must not be interpreted as a clean scan or a security pass.

No Windows security policy was disabled or bypassed, and no HackHub application source files were modified.
