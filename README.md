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
- **Frontend:** React.js + Next.js, TypeScript, Tailwind CSS, Vite
- **Backend:** Node.js, Express.js, JWT Auth
- **Database:** MongoDB (Mongoose)
- **Scraping/Data:** Cheerio / Puppeteer, Cron jobs, Recommendation engine
- **Deployment:** Vercel (frontend), Netlify fallback, MongoDB Atlas
- **Version Control:** GitHub

## Architecture
See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system diagram, data flow, and DB schema overview.

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

### 2. Setup Frontend
```bash
npm install
cp .env.example .env
npm run dev
```

### 3. Setup Backend (when available)
```bash
cd server
npm install
cp .env.example .env
npm run dev
```

### 4. Environment Variables
Create `.env` from `.env.example`:
```
MONGODB_URI=mongodb://localhost:27017/hackhub
JWT_SECRET=your_secret
VITE_API_URL=http://localhost:5000/api
```

### 5. Build
```bash
npm run build
npm run preview
```

## Project Structure
```
HackHub/
├── src/                    # React frontend (Vite)
│   ├── components/         # Reusable UI
│   ├── pages/              # Dashboard, Search, Calendar, Teams, Profile
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Utils, Worth Score logic
│   └── styles/
├── server/                 # Express backend (planned)
│   ├── routes/             # hackathons, auth, teams, reminders
│   ├── models/             # Mongoose schemas
│   ├── controllers/
│   ├── jobs/               # Scrapers & cron
│   └── middleware/
├── docs/                   # Documentation
├── public/
├── vite.config.ts
├── vercel.json
├── netlify.toml
└── README.md
```

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
