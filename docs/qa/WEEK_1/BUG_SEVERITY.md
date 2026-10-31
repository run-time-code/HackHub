# HackHub – Bug Severity and Priority Definitions

**Owner:** Deva Kanchana  
**Work Area:** WA9 – QA

## 1. Severity levels

| Severity | Name | Definition | Example |
|---|---|---|---|
| S1 | Critical | Application unavailable, major security exposure, data loss or complete failure of a critical user journey | Authentication bypass or production database data loss |
| S2 | High | Major functionality is broken and no reasonable workaround exists | Users cannot log in or submit team invitations |
| S3 | Medium | Functionality is impaired but a workaround exists | Search filter returns incorrect results for a particular combination |
| S4 | Low | Minor UI, wording or non-critical behaviour issue | Incorrect label or minor spacing issue |

## 2. Priority levels

| Priority | Meaning |
|---|---|
| P1 | Fix immediately; blocks release or critical usage |
| P2 | Fix before the next planned release |
| P3 | Fix when scheduled; workaround is available |
| P4 | Minor improvement; can be considered for backlog |

## 3. Severity versus priority

Severity describes the technical and user impact of a defect.
Priority describes how urgently the team should resolve it.

A low-severity defect may receive high priority if it affects a critical
business deadline.

## 4. Defect handling

- S1: Escalate immediately and investigate release impact.
- S2: Assign an owner and prioritize correction.
- S3: Schedule correction and verify the workaround.
- S4: Record and address during routine maintenance.

## 5. Closure criteria

A defect can be closed after:

1. The correction is available in the test environment.
2. The original reproduction steps no longer produce the defect.
3. Relevant regression tests pass.
4. Evidence is attached.
5. The result is reviewed.

## 6. Status values

- OPEN: Defect identified.
- ASSIGNED: Owner allocated.
- IN PROGRESS: Correction underway.
- FIXED: Correction implemented; verification pending.
- RETEST: Ready for QA verification.
- CLOSED: Verification passed.
- REOPENED: Defect persists or has returned.
- BLOCKED: Verification cannot proceed because of a dependency.
