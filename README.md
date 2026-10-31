# HackHub — Discover. Team Up. Compete.

> One platform to discover, track, and win hackathons.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Stack: MERN](https://img.shields.io/badge/Stack-MERN-0FAAFF)](https://github.com/run-time-code/HackHub)
[![Deploy: Vercel](https://img.shields.io/badge/Deploy-Vercel-black)](https://vercel.com)
[![Deploy: Netlify](https://img.shields.io/badge/Deploy-Netlify-00C7B7)](https://netlify.com)

**HackHub** centralizes hackathons from **Devpost, Unstop, Devfolio, HackerEarth, MLH, Hack2Skill** and more — so students never miss a deadline, find the right event by skills/interests, and build winning teams.

---

## Table of Contents
- [Problem](#problem)
- [Solution & Features](#solution--features)
- [Demo](#demo)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Hackathon Worth Score](#hackathon-worth-score)
- [Roadmap](#roadmap)
- [Team](#team)
- [Contributing](#contributing)
- [License](#license)

## Problem
- Hackathon info is scattered across 6+ platforms
- Students miss deadlines and relevant opportunities
- Hard to filter by skills, domain, mode (online/offline)
- No easy way to find teammates
- No signal on whether a hackathon is *worth* entering
- No single place to manage saved / registered / ongoing / completed hackathons

## Solution & Features

| Feature | Description |
|---|---|
| **Unified Discovery** | Aggregated listings scraped/fetched from multiple sources, normalized and deduplicated |
| **Smart Search & Filters** | By skills, interests, tech domain, mode, prize, deadline, organizer |
| **Public Field Guide** | A story-led landing page, live network numbers, legal and help pages, shareable `/u/:id` builder cards |
| **Builder Cards** | Profile editor with skills, links, hackathon history, availability and public/private visibility |
| **Teammate Finder** | Opt-in discovery, skill/interest match scoring, filters, sorting and direct invitations |
| **Team Hub** | Create and edit crews, browse open teams, view members, manage seats and leadership controls |
| **Request Wire** | Incoming/outgoing join requests and invitations, accept/decline/cancel history |
| **Notifications** | Bell inbox with unread counts, mark-one/mark-all, SSE stream with polling fallback |
| **Dashboard** | One view for crews, open seats, pending handshakes, deadlines, profile checklist and suggested people |
| **Consent-aware Analytics** | No analytics loads before opt-in; preferences can be changed from the cookie settings |
| **Calendar & Reminders** | Month/week/agenda deadline views backed by `GET /calendar`; create reminders and save per-user reminder preferences |
| **Save & Track** | Save, register, mark ongoing/completed and keep private notes from the dashboard (`/saved` CRUD) |
| **Worth Score (0-100)** | Data-driven score: skill relevance, learning value, prize pool, organizer reputation, difficulty |

> **Status:** the WA3 frontend ships the public field guide, builder cards,
> dashboard, teammate finder, team hub, request inbox, notifications, legal/help,
> and consent-aware analytics. Authentication, catalogue discovery, calendar,
> reminders, saved-hackathon tracking, and account settings are wired to the
> active API. Recommendations include a heuristic `worthScore`; validating a
> production scoring model, automated catalogue scrapers, and optional ICS
> export remain future work. Staging and production still need provider-backed
> verification; see [docs/staging.md](docs/staging.md) and
> [docs/production-operations.md](docs/production-operations.md).

## Demo

### Zero-service demo (recommended for UI review)

The frontend includes a complete MSW demo: no MongoDB, API server or environment file required.

```bash
npm install
npm run dev:demo --workspace @hackhub/web
```

Open the printed Vite URL (usually `http://localhost:5173`), sign in with any non-empty email/password, and the demo hydrates as Asha Raman. Fixtures reset on every reload. The demo banner in the app shell makes that explicit.

The same switch is available without the npm script:

```bash
# apps/web/.env
VITE_USE_MOCKS=true
```

See [docs/DEMO.md](docs/DEMO.md) for the guided tour, supported interactions, and demo build instructions.

### Full stack

Set `VITE_API_BASE_URL` and the API environment described below. The deployed-demo links are placeholders: `https://hackhub.vercel.app` | `https://hackhub.netlify.app`.

## Tech Stack
- **Frontend:** React 19, Vite, custom CSS design system (Tailwind CSS v4 for auth/legacy surfaces), Radix UI primitives, TanStack Query, Framer Motion
- **Backend:** Node.js, Express.js, session cookies (JWT access/refresh) + CSRF, Passport (Google/GitHub OAuth)
- **Database:** MongoDB (Mongoose)
- **Data:** Python importer for the hackathon catalogue (`tools/data-importer`); scrapers planned
- **Deployment:** Render (API), Vercel (web), MongoDB Atlas
- **Monitoring:** Sentry, Prometheus `/metrics`, scheduled uptime checks
- **Version Control:** GitHub

## Architecture
See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system diagram, data flow, and DB schema overview.
Production release and recovery procedures are in [docs/production-operations.md](docs/production-operations.md); monitoring and alerting setup is in [docs/monitoring.md](docs/monitoring.md).

```
[tools/data-importer] ──> [Express API /api] <──> [MongoDB Atlas]
[scrapers (planned)] ────>        ▲
                                  │  cookies + CSRF, Google/GitHub OAuth
                     [React 19 web app (field guide)]
```

## Getting Started

### Prerequisites
- Node.js 20+ (see `engines` in the root `package.json`)
- MongoDB (local or Atlas)
- npm (the repo uses npm workspaces with a single root lockfile)

### 1. Clone
```bash
git clone https://github.com/run-time-code/HackHub.git
cd HackHub
```

### 2. Install dependencies (monorepo, single install)
```bash
npm install
```

### 3. Environment variables
Copy the example env files for the apps you run:
```bash
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
```
See each app's `.env.example` for the required keys (API: `MONGODB_URI`, `JWT_SECRET`, `ACCESS_TOKEN_SECRET`, `CSRF_SECRET`, …; web: `VITE_API_BASE_URL`, optional `VITE_USE_MOCKS`, optional `VITE_SENTRY_DSN`). OAuth is optional: set `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` and/or `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` (plus callback URLs) to enable the Google/GitHub sign-in buttons. To explore the UI without any services, skip this step and run the zero-service demo above.

The hackathon importer needs `BRABBLE_API_KEY` and `MONGODB_URI`. Put them in
`tools/data-importer/.env` (the importer also recognizes the older
`data_importer/.env` location), then run this from the repository root:

```bash
python tools/data-importer/import_hackathons.py
```

Keep the `.env` file private; do not commit it.

### 4. Run the apps
```bash
npm run dev          # starts API + web together via Turborepo
```
Or run them individually:
```bash
npm run dev --workspace @hackhub/api     # Express API on :5000
npm run dev --workspace @hackhub/web     # Vite web on :5173
```

### 5. Build
```bash
npm run build        # builds every workspace via Turborepo
```

### 6. Checks
```bash
npm run check        # turbo lint + test + build across all workspaces
```

## Project Structure
This is a **Turborepo + npm workspaces monorepo**. One lockfile at the root; every app under `apps/` is a workspace.
```
HackHub/
├── apps/
│   ├── web/                  # React 19 + Vite frontend — @hackhub/web
│   │   └── src/
│   │       ├── components/   # AppShell, builder cards, team/request UI, shared primitives
│   │       ├── pages/        # Landing, Dashboard, Teammates, Teams, Requests, Profile, legal/help…
│   │       ├── mocks/        # MSW fixtures + handlers for the zero-service demo
│   │       ├── context/      # Auth provider (+ shared hook)
│   │       ├── styles/       # WA3 design tokens, layouts and components
│   │       └── lib/          # API clients, hooks, validation, demo/discovery/request helpers
│   ├── api/                  # Express API — @hackhub/api (deployed to Render)
│   │   ├── src/              # production entrypoint: app factory, routes, services, models
│   │   ├── routes/           # legacy-but-mounted auth, users, saved hackathons, dashboard, admin
│   │   ├── models/           # User, Hackathon, Registration, SavedHackathon, AuditLog
│   │   └── middleware/       # auth, CSRF, rate limits, sanitize, audit
│   └── backend-prototype/    # @hackhub/backend-prototype (exploratory, not deployed)
├── tools/
│   ├── data-importer/        # Python importer for the hackathon catalogue
│   ├── loadtest/             # k6 load scenarios
│   └── monitoring/           # Grafana dashboard JSON
├── docs/                     # Architecture, API spec, staging, monitoring, operations
├── turbo.json                # Turborepo pipeline (build/test/lint/dev)
├── package.json              # workspaces root + turbo scripts
├── package-lock.json         # single lockfile for the whole monorepo
├── vercel.json               # builds @hackhub/web
├── netlify.toml
└── README.md
```
Add `--filter` to any task to run it for a single app and whatever it depends on, e.g. `npm run build -- --filter=@hackhub/web`.

## Hackathon Worth Score
> Planned — the scoring service and endpoints are not implemented yet.

Formula in `docs/WORTH_SCORE.md` — weighted composite (0-100):
- Skill Relevance (30%)
- Learning Opportunity (20%)
- Prize Pool (15%)
- Organizer Reputation (20%)
- Difficulty Fit (15%)

Score tiers: `90+ Must Join` | `70-89 Worth It` | `50-69 Consider` | `<50 Skip`

## Roadmap
Shipped work is tracked in [CHANGELOG.md](CHANGELOG.md). The API reference is
[docs/API_SPEC.md](docs/API_SPEC.md); remaining planned features are marked there.

| Phase | Focus |
|---|---|
| 1 | Planning, UI design, DB setup, auth, basic listing |
| 2 | Search/filters, dashboard, teams, teammate discovery |
| 3 | Calendar/reminders, testing, integration, deployment, docs |
| 4 | Security hardening, monitoring, staging/production operations |

Still planned: automated multi-source scrapers and optional ICS calendar
export. Recommendations currently expose an explainable heuristic `worthScore`;
its scoring model still needs product validation. Calendar/reminders,
saved-hackathon CRUD, and account settings are covered by
`apps/api/test/calendar-reminders-saved.test.js`. The Python importer remains
an operator-run job.

## Team
| Role | Responsibility |
|---|---|
| Frontend Developer | UI, search, filters, dashboard, calendar |
| Backend Developer | APIs, auth, server logic |
| Database | Schema design, scraping/fetching across platforms |
| Data/Recommendation | Recommendation engine + Worth Score |
| Tester/Deployment | QA, bug fixes, deployment |

## Contributing
We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

```bash
git checkout -b feat/your-feature
git commit -m "feat: add your feature"
git push origin feat/your-feature
```

## License
[MIT](LICENSE) © 2026 RunTimeCode
