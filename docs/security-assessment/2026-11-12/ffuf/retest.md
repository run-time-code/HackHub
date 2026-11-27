# FFUF - Security Retest Report

## 1. Retest Information

- Tool: ffuf v2.3.0
- Retest date: 15 November 2026
- Original finding ID: FFUF-001
- Patch commit: Not applicable
- Environment: Windows 11 development workstation
- Retest status: Unable to execute

## 2. Original Finding

Windows Application Control blocked the unsigned ffuf executable because it did not meet Enterprise signing-level requirements or violated the active Code Integrity policy.

No application vulnerability was confirmed.

## 3. Retest Method

1. Installed ffuf v2.3.0 using the official Go module.
2. Confirmed Go installation exit code 0.
3. Verified executable creation.
4. Collected the executable SHA-256.
5. Checked its Authenticode signature.
6. Attempted to execute `ffuf.exe -V`.
7. Examined the Windows Code Integrity Operational log for Event ID 3077.

No HTTP fuzzing command was executed because the binary was blocked.

## 4. Retest Results

| Check | Before Remediation | After Documentation Update |
|---|---|---|
| Go installation | Not performed | Successful |
| Executable creation | Not performed | Confirmed |
| Digital signature | Not checked | NotSigned |
| ffuf execution | Not performed | Blocked |
| Code Integrity events | Not collected | Three Event ID 3077 records |
| HTTP fuzzing | Not performed | Not performed |
| Application vulnerability status | Unknown | Unknown |

The documentation update does not resolve the Windows execution restriction.

## 5. Evidence

- `evidence/ffuf-installation-2026-11-15.txt`
- `evidence/ffuf-execution-block-2026-11-15.txt`

Executable SHA-256:

`59E6BCB544D21ACC63258B9FED89310FE9286A9AA30DF21F3C730B58CEC304AC`

## 6. Final Status

- [ ] Fixed and verified
- [ ] Partially fixed
- [ ] Not fixed
- [x] Unable to retest
- [ ] Not applicable

## 7. Conclusion

The ffuf installation succeeded, but Windows Application Control prevented executable startup. Three Code Integrity Event ID 3077 records confirm the restriction.

No security policy bypass was attempted. No fuzzing requests were sent, and no application security pass is claimed.

The assessment remains incomplete pending authorized execution in a compatible environment.
