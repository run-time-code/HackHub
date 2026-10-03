# Contributing to HackHub

Thanks for contributing to HackHub!

## Workflow
1. Fork the repo and clone: `git clone https://github.com/<you>/HackHub.git`
2. Create a branch: `git checkout -b feat/short-name` or `fix/short-name`
3. Install deps: `npm install`
4. Make changes, follow conventions
5. Run lint/tests: `npm run lint` && `npm run build`
6. Commit with conventional commits: `feat:`, `fix:`, `docs:`, `chore:`
7. Push and open a PR against `main`

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
- TypeScript + React functional components
- Tailwind CSS (no custom CSS unless needed)
- ESLint + Prettier (run before commit)
- Keep components small and reusable

## Pull Request Checklist
- [ ] Descriptive title and linked issue
- [ ] Screenshots for UI changes
- [ ] No secrets in code
- [ ] Updated docs if needed

## Reporting Issues
Use GitHub Issues with template: bug / feature / docs. Include steps to reproduce.

## Questions?
Open a discussion or contact maintainers.
