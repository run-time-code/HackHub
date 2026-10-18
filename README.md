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
| **Calendar & Reminders** | Monthly calendar view + email/in-app reminders for registration & submission deadlines |
| **Save & Track** | Save, register, mark ongoing/completed in personal dashboard |
| **Team Collaboration** | Profiles with skills, teammate finder, team creation, collaboration requests |
| **Worth Score (0-100)** | Data-driven score: skill relevance, learning value, prize pool, organizer reputation, difficulty |
| **Personal Dashboard** | Single view for saved, registered, ongoing, completed hackathons |

## Demo
> Add your deployed link here: `https://hackhub.vercel.app` | `https://hackhub.netlify.app`

## Tech Stack
- **Frontend:** React 19, JavaScript, Tailwind CSS, Vite
- **Backend:** Node.js, Express.js, JWT Auth
- **Database:** MongoDB (Mongoose)
- **Scraping/Data:** Cheerio / Puppeteer, Cron jobs, Recommendation engine
- **Deployment:** Vercel (frontend), Netlify fallback, MongoDB Atlas
- **Version Control:** GitHub

## Architecture
See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system diagram, data flow, and DB schema overview.
Production release and recovery procedures are in [docs/production-operations.md](docs/production-operations.md); monitoring and alerting setup is in [docs/monitoring.md](docs/monitoring.md).

```
[Scrapers/Cron] -> [Express API] -> [MongoDB]
                         |
                    [React Dashboard + Calendar + Team Finder]
```

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm / yarn / pnpm

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
See each app's `.env.example` for the required keys (API: `MONGODB_URI`, `JWT_SECRET`, …; web: `VITE_API_BASE_URL`, …).

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

## Project Structure
This is a **Turborepo + npm workspaces monorepo**. One lockfile at the root; every app under `apps/` is a workspace.
```
HackHub/
├── apps/
│   ├── web/                  # React frontend (Vite) — @hackhub/web
│   │   ├── components/       # Reusable UI
│   │   ├── pages/            # Dashboard, Search, Calendar, Teams, Profile
│   │   ├── hooks/            # Custom hooks
│   │   ├── lib/              # Utils, Worth Score logic
│   │   └── styles/
│   ├── api/                  # Express API — @hackhub/api (deployed to Render)
│   │   ├── routes/           # hackathons, auth, teams, reminders
│   │   ├── models/           # Mongoose schemas
│   │   ├── controllers/
│   │   ├── jobs/             # Scrapers & cron
│   │   └── middleware/
│   └── backend-prototype/    # @hackhub/backend-prototype (exploratory, not deployed)
├── tools/                    # Non-JS tooling (Python importer, load tests)
├── docs/                     # Documentation
├── turbo.json                # Turborepo pipeline (build/test/lint/dev)
├── package.json              # workspaces root + turbo scripts
├── package-lock.json         # single lockfile for the whole monorepo
├── vercel.json               # builds @hackhub/web
├── netlify.toml
└── README.md
```
Add `--filter` to any task to run it for a single app and whatever it depends on, e.g. `npm run build -- --filter=@hackhub/web`.

## Hackathon Worth Score
Formula in `docs/WORTH_SCORE.md` — weighted composite (0-100):
- Skill Relevance (30%)
- Learning Opportunity (20%)
- Prize Pool (15%)
- Organizer Reputation (20%)
- Difficulty Fit (15%)

Score tiers: `90+ Must Join` | `70-89 Worth It` | `50-69 Consider` | `<50 Skip`

## Roadmap
See [docs/WEEKLY_PLAN.md](docs/WEEKLY_PLAN.md) and [ROADMAP.md](ROADMAP.md)

| Week | Focus |
|---|---|
| 1 | Planning, UI design, DB setup, auth, basic listing |
| 2 | Search/filters, dashboard, recommendations, Worth Score, teams |
| 3 | Calendar/reminders, testing, integration, deployment, docs |

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
