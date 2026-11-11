# Local Auth Fix Validation — 2026-11-01

**Scope:** Local development working tree only  
**Release impact:** None by itself — this is not a release approval  
**Related snapshot:** [2026-10-31 release assessment](../2026-10-31/FINAL_QA_SUMMARY.md)

## Change under test

The active API middleware previously verified access tokens with `JWT_SECRET`
only, while token issuance used `ACCESS_TOKEN_SECRET` when present. That split
caused a successful login to be followed by `401` from `/users/me`, which
cleared the client session and returned the user to the login panel.

The middleware now accepts both `ACCESS_TOKEN_SECRET` and `JWT_SECRET` while
the legacy secret is retired. A regression test covers a token signed with
`ACCESS_TOKEN_SECRET`.

## Command

From `apps/api`:

```powershell
node --test test/auth-routes.test.js test/auth-security.test.js
```

## Result

| Metric | Result |
|---|---:|
| Test suites | 3 |
| Tests | 9 |
| Passed | 9 |
| Failed | 0 |
| Cancelled | 0 |
| Skipped | 0 |
| Duration | 12.87 s |

**Result: PASS**

Evidence: [evidence/auth-tests-output.txt](evidence/auth-tests-output.txt)

## What this proves

- The `/users/me` route accepts an access token signed with
  `ACCESS_TOKEN_SECRET`.
- The auth route and auth security suites still pass, including session
  restoration, refresh rotation, login lockout and OAuth state checks.

## What this does not prove

- It is not a full API regression run on the release commit.
- It does not cover every authenticated product workflow.
- It does not verify security, performance, accessibility, UAT, staging or
  production behavior.
- It does not change the `NOT APPROVED` release decision.

The full release gate set in the [QA index](../../README.md) still applies.
