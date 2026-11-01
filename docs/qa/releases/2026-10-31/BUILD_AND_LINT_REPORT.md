# Build and Lint Report

**Date:** 2026-10-31  
**Environment:** Local Windows

| Command | Result | Notes |
|---|---|---|
| `npm run lint --workspace @hackhub/api` | PASS | ESLint completed without reported errors |
| `npm run lint --workspace @hackhub/web` | PASS | ESLint completed without reported errors |
| `npm run build --workspace @hackhub/web` | PASS WITH WARNING | Vite build completed |

The frontend build reports a generated JavaScript chunk of approximately
564.35 kB (181.60 kB gzip), above the configured 500 kB advisory threshold.
The build also reported plugin callback timing. These are warnings, not build
errors.

No separate API build, TypeScript type-check, or configured type-check script
was found in the inspected package manifests. The root `backend/` package has
no build or lint script. The active API is JavaScript and its configured lint
command passed.

CI workflow source inspection shows frontend lint/test/build, API lint/test,
and Gitleaks jobs. A dependency audit gate was not found. The checked-in
GitHub Actions references are commit-SHA pinned, contrary to older static
report claims that they were tag-pinned.

Raw output:

- `evidence/api-lint-output.txt`
- `evidence/frontend-lint-output.txt`
- `evidence/frontend-build-output.txt`
