# Deployment status: PROTOTYPE — NOT IN PRODUCTION

This `backend/` directory is a **standalone prototype**, not part of the deployed
`@hackhub/api` workspace (`apps/api`). It is intentionally excluded from the npm
workspace and is **not deployed** to Render.

Scope of the prototype (as of 2026-10-31):

- Mongoose models for hackathons, reminders, sources, tags, ingest quarantine, notifications, organizers.
- A seed script and an ingestion + quarantine pipeline.
- A Redis-backed reminder scheduler / reminder jobs.
- A parallel auth/profile controller layer (does not share `apps/api/src` models).

Why it stays separate:
- It is not wired into `apps/api/src` (models are separate, no shared connection).
- It has no CI/CD, no Render service, and no Vercel integration.
- Merging its reminder/cache/ingestion work into `apps/api/src` is an open decision.

Operational status:
- Backend server entry: `node server.js` (start with `.env` from `backend/.env.example`).
- Seed data: `npm run seed` (requires MongoDB).
- Redis is referenced but declared nowhere in the deployed workspace; this prototype's
  scheduler is not connected to production.
