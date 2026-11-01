# Dependency Security Audit

**Work Area:** WA9 - QA, Test Automation & Release Management
**Owner:** Deva Kanchana
**Date:** 31 October 2026
**Command:** `npm audit`

## Result

- Total reported vulnerabilities: 12
- Severity: 12 moderate
- Audit completed: Yes
- Automatic dependency changes: None

## Findings

### 1. glob

Advisory: GHSA-3g3m-2fjr-6pw4

Issue: AbortSignal cancellation bypass may allow post-timeout filesystem traversal.

Affected dependency chain includes:
- glob
- @sentry/bundler-plugins
- @sentry/node

The suggested automatic fix would install @sentry/node 10.78.0 and may introduce a breaking change.

### 2. minimatch

Advisory: GHSA-g3hv-75wg-m249

Issue: Potential denial of service through globparts amplification.

Affected dependency chains include:
- ESLint-related dependencies
- @redocly/openapi-core
- openapi-typescript
- nodemon

The audit reported no available fix for the affected minimatch dependency resolution.

## Risk and action

Status: OPEN - Requires dependency review.

Actions:
1. Do not run `npm audit fix --force`.
2. Review the dependency tree and available compatible updates.
3. Determine whether vulnerable packages are production or development dependencies.
4. Apply only reviewed, compatible updates.
5. Rerun npm ci, npm audit, npm test, npm run lint and npm run build.
6. Record the final audit result.

## Limitation

The audit output alone does not establish whether a vulnerable dependency is reachable in the deployed application or exploitable in its runtime context. Further dependency and usage analysis is required.

**Current decision:** Keep the existing lockfile unchanged pending review.
