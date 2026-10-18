# Changelog
All notable changes to this project will be documented here.

## [Unreleased]
### Added
- Authentication: register/login/logout, CSRF-protected cookie sessions with
  access-token rotation, email verification, password reset, and Google/GitHub
  OAuth (`apps/api/routes/authRoutes.js`, web `/auth` panels).
- Onboarding wizard and profile handling (skills, interests, preferred mode,
  location, discoverability).
- Dashboard tracking for saved/registered/ongoing/completed hackathons with
  notes (`/saved-hackathons/*`, `/dashboard/summary`) and the web tracking
  screens.
- Public hackathon catalogue API (`GET /hackathons`) and the discovery screen.
- Teams: create/join/leave, leadership transfer, join requests and
  invitations, teammate discovery.
- Notifications with an SSE stream and best-effort email.
- Admin APIs for hackathon visibility/featured flags, user bans and reports.
- Monitoring: Sentry, Prometheus `/metrics`, scheduled uptime checks and a
  Grafana dashboard (`tools/monitoring`).
- Operations: staging and production pipelines, backup/restore drill, k6 load
  scenarios (`tools/loadtest`) and staging smoke checks.
- Python catalogue importer (`tools/data-importer`).
- Frontend "field guide" redesign: an `/auth` panel shell (login, register,
  forgot/reset password, verify email, social sign-in) and a lazy-loaded `/app`
  workspace (dashboard, discover, calendar, preferences, settings).

### Changed
- Restructured into a Turborepo + npm workspaces monorepo: `apps/web`,
  `apps/api`, `apps/backend-prototype`, shared `tools/` and one root lockfile.
- Auth moved from localStorage bearer tokens to httpOnly session cookies with
  CSRF; the SPA restores sessions via `/auth/me`.
- Frontend toolchain: React 19 + Vite + Tailwind CSS v4, ESLint, Vitest.
- Docs refreshed: architecture, API spec (with provisional frontend
  assumptions flagged), staging, monitoring and operations guides.

### Fixed
- Restored mainline OAuth callback handling inside the redesigned login panel.
- Pointed account settings at the real `/users/me` endpoints.

### Removed
- Legacy `frontend/` tree and root `.env.example` (now per-app examples under
  `apps/web` and `apps/api`).

## [0.1.0] - 2026-09-12
### Added
- Initial commit
