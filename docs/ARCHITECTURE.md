# Architecture

## Overview
HackHub is a MERN platform with a Vite React frontend, Express backend, MongoDB, and scheduled scrapers.

```
┌─────────────┐     ┌──────────────┐     ┌─────────┐
│  Scrapers   │────>│  Express API │────>│ MongoDB │
│ (Cron Jobs) │     │  (JWT Auth)  │<────│ (Atlas) │
└─────────────┘     └──────┬───────┘     └─────────┘
                           │
                    ┌──────▼───────┐
                    │ React Client │
                    │ Dashboard,   │
                    │ Calendar,    │
                    │ Team Finder  │
                    └──────────────┘
```

## Data Flow
1. Cron jobs fetch from Devpost, Unstop, Devfolio, HackerEarth, MLH, Hack2Skill
2. Normalize → deduplicate → store in MongoDB
3. API exposes `/api/hackathons` with filters, search, Worth Score
4. Client renders listings, dashboard, calendar, teammate finder
5. Reminders via cron + email/push before deadlines

## Database Schema (Mongoose)

**User**
```js
{ name, email, passwordHash, skills:[String], interests:[String], avatar, teams:[ObjectId] }
```

**Hackathon**
```js
{ title, organizer, source, url, description, domains:[String], skills:[String],
  mode: 'online'|'offline'|'hybrid', location, prizePool, registrationDeadline, submissionDeadline,
  startDate, endDate, worthScore: Number, featured: Boolean }
```

**Team**
```js
{ name, hackathon: ObjectId, members:[ObjectId], lookingFor:[String], inviteCode }
```

**Saved / Registration**
```js
{ user: ObjectId, hackathon: ObjectId, status: 'saved'|'registered'|'ongoing'|'completed' }
```

## Worth Score Service
Pure function `calcWorthScore(hackathon, userSkills)` → 0-100. See [WORTH_SCORE.md](WORTH_SCORE.md).

## Auth
JWT (access + refresh), bcrypt, protected routes via middleware.

## Deployment
- Frontend: Vercel / Netlify (static `dist`)
- Backend: Render / Railway / Vercel Functions
- DB: MongoDB Atlas
- Cron: Vercel Cron or node-cron on server
