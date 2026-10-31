# Playwright E2E Report

**Date:** 2026-10-31  
**Environment:** Local Chromium / Vite server; API calls intentionally isolated

## Execution

Executed from `apps/web`:

```text
npx --no-install playwright test --workers=1 --output=<assessment evidence>/playwright-results --reporter=list
```

The process used `CI=1` to avoid reusing an existing server and set
`VITE_API_BASE_URL` and `VITE_API_URL` to
`http://127.0.0.1:1/api`. This prevented browser requests to staging,
production, or any available local API. The new output path preserved the
existing untracked `apps/web/playwright-report/` and `apps/web/test-results/`
directories.

## Results

| Test | Result |
|---|---|
| E2E-001: login page renders | PASS |
| E2E-002: registration page renders | PASS |
| E2E-003: empty login validation | PASS |
| **Total** | **3 passed, 0 failed (9.8 seconds)** |

No valid test credentials, email verification, successful login, successful
registration, authenticated navigation, or logout were exercised. Those
scenarios are **BLOCKED / NOT RUN**, not passed.

Raw output: `evidence/playwright-e2e-output.txt`. Playwright's run metadata is
under `evidence/playwright-results/`.
