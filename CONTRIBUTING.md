# Contributing to HackHub

Thanks for contributing to HackHub!

## Workflow
1. Fork the repo and clone: `git clone https://github.com/<you>/HackHub.git`
2. Create a branch: `git checkout -b feat/short-name` (or `fix/`, `docs/`, `chore/`)
3. Install deps once at the repo root (npm workspaces): `npm install`
4. Make changes, follow conventions
5. Run the checks: `npm run check` (Turborepo lint + test + build), or target
   one app, e.g. `npm run lint --workspace @hackhub/web`
6. Commit with conventional commits: `feat:`, `fix:`, `docs:`, `chore:`
7. Push and open a PR against `main` (CI runs frontend/backend checks and
   Gitleaks, so never commit secrets)

## Daily commands
```sh
npm run dev                             # API + web together (Turborepo)
npm run dev --workspace @hackhub/api    # Express API on :5000
npm run dev --workspace @hackhub/web    # Vite web on :5173
npm test --workspace @hackhub/web       # Vitest
npm test --workspace @hackhub/api       # node --test
```

## Branch Naming
- `feat/calendar-reminders`
- `fix/worth-score-calc`
- `docs/architecture`
- `chore/deps`

## Commit Messages
```
feat: add teammate finder filters
fix: correct deadline timezone handling
docs: update architecture diagram
```

## Code Style
- JavaScript + React 19 function components and hooks (no TypeScript in this repo)
- Tailwind CSS v4 for the web app; keep custom CSS in `apps/web/src/index.css`
  only when Tailwind cannot express it
- API: keep the `routes → controllers → services` layering; models only hold
  schemas
- ESLint passes before commit (`npm run lint`); keep components small and
  reusable

## Docs to update
- Endpoint or contract changes: [`docs/API_SPEC.md`](docs/API_SPEC.md)
- System shape/architecture changes: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- App behavior or env vars: the app README (`apps/web/README.md`,
  `apps/api/README.md`) and the root [`README.md`](README.md)
- Notable work: [`CHANGELOG.md`](CHANGELOG.md)

## Pull Request Checklist
- [ ] `npm run check` passes (or the affected workspace's lint/test/build)
- [ ] Screenshots for UI changes
- [ ] Docs updated when behavior or endpoints change
- [ ] No secrets in code (Gitleaks runs in CI)

## Reporting Issues
Use GitHub Issues with template: bug / feature / docs. Include steps to reproduce.

## Questions?
Open a discussion or contact maintainers.
