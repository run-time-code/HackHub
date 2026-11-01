# HackHub – QA Test Tooling Configuration

**Owner:** Deva Kanchana  
**Work Area:** WA9 – QA

## 1. Existing project tooling

| Tool | Purpose | Repository location / configuration |
|---|---|---|
| Node.js node:test | Backend tests | `apps/api/test/` |
| Vitest | Frontend tests | `apps/web/` |
| ESLint | Static code checks | API and web workspaces |
| Vite | Frontend production build | `apps/web` |
| Turbo | Workspace task orchestration | Root `package.json` |
| GitHub Actions | Continuous integration | `.github/workflows/ci.yml` |
| Gitleaks | Secret scanning | CI workflow |
| k6 | Performance testing | `tools/loadtest/` |
| axe-core | Accessibility checks | Frontend development dependency |
| OpenAPI | API contract documentation | `apps/api/openapi.yaml` |

## 2. Existing commands

Run commands from the repository root.

Install dependencies:

`npm ci`

Run all workspace tests:

`npm test`

Run all workspace lint checks:

`npm run lint`

Run all workspace builds:

`npm run build`

Run frontend tests:

`npm test --workspace @hackhub/web`

Run backend tests:

`npm test --workspace @hackhub/api`

Run frontend lint:

`npm run lint --workspace @hackhub/web`

Run backend lint:

`npm run lint --workspace @hackhub/api`

Run frontend build:

`npm run build --workspace @hackhub/web`

## 3. Continuous integration

The existing `.github/workflows/ci.yml` defines:

- Frontend lint, tests and build.
- Backend lint and tests.
- Root lockfile validation.
- Gitleaks secret scanning.

The workflow is configured for pushes to `main` and `develop` and pull
requests targeting those branches. A push to a separate feature branch
does not automatically trigger this workflow under the current triggers.

## 4. Tools requiring additional setup or verification

| Tool | Intended use | Current status |
|---|---|---|
| Playwright | Browser end-to-end tests | Not listed in workspace package dependencies |
| Postman | API collections and manual API verification | Collection not found in inspected files |
| Mailtrap | Email integration testing | Configuration not verified |
| Vitest coverage | Frontend coverage reporting | Coverage package exists; CI threshold not verified |
| Supertest | HTTP API test convenience | Not listed in API dependencies |

Do not install or introduce these tools until the need, compatibility and
project-owner approval have been established.

## 5. Test environment requirements

- Node.js version 20 or newer.
- npm compatible with the repository lockfile.
- Environment variables configured using safe local environment files.
- Test database or configured in-memory database.
- No production credentials in local test configuration.

## 6. Tooling verification

Record actual installation and execution results in the test run report.
A dependency appearing in package.json does not prove that a test has run.
