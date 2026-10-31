# Staging deployment (owner: Senthil Raja)

Staging is the private test copy of HackHub. `develop` branch deploys here
automatically. Weekly Demos run on staging.

| Piece     | Target                        | Source of truth                    |
|-----------|-------------------------------|------------------------------------|
| Frontend  | Vercel (preview/staging)      | `apps/web/`, `vercel.json`         |
| API       | Render web service            | `render.yaml`, `apps/api/Dockerfile` |
| Database  | MongoDB Atlas (staging)       | connection string in Render env    |
| Pipeline  | GitHub Actions                | `.github/workflows/deploy-staging.yml` |

HTTPS is provided by Render and Vercel automatically. No custom domain is
required for Week 2; the `*.onrender.com` and `*.vercel.app` URLs are the
staging domains.

## 1. Create the `develop` branch (one time)

```sh
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c develop
git push -u origin develop
```

In GitHub: Settings > Branches > add a protection rule for `develop`
(require pull-request review + passing CI, same as `main`).

## 2. Atlas staging database (one time, with Gokul/Nandhini)

1. Create/clone a staging cluster (M0 is fine for Week 2).
2. Database Access: add a staging-only user (read/write on `hackhub-staging`).
3. Network Access: allow Render outbound IPs (or 0.0.0.0/0 for Week 2 only).
4. Copy the connection string. It goes into Render as `MONGODB_URI`
   (never into git).

## 3. Render API service (one time)

1. Render > New > Blueprint > connect the HackHub repo > select `render.yaml`.
   The blueprint builds from the repository root and starts
   `npm start --workspace @hackhub/api` (the root lockfile is required).
2. Set the secret env vars on the service (values from section 6 table):
   `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGIN`.
3. Deploy once manually, then open `https://<service>.onrender.com/health`
   and expect `{"success":true,"data":{"status":"ok",...}}`.
4. Settings > Deploy Hook: copy the hook URL. It goes into GitHub as
   `RENDER_DEPLOY_HOOK_STAGING` (next section). Every push to `develop`
   triggers this hook from the workflow after lint/tests pass, so the
   blueprint sets `autoDeploy: false` to avoid a second, ungated deploy.

Free-tier note: the service sleeps when idle, so the first staging request
after inactivity can take ~1 minute. The workflow's health-wait loop
(30 x 20s) covers this.

## 4. Vercel frontend (one time, with frontend team)

1. Vercel > Add New Project > import the HackHub repo.
2. Root Directory: repo root (monorepo; see `vercel.json`). Framework: Vite (see `vercel.json`).
3. Production branch: `main`. All other branches (including `develop`)
   get preview URLs automatically — the `develop` preview URL IS the
   staging frontend.
4. Staging env var on the project: `VITE_API_BASE_URL=https://<staging-api>`
   (`VITE_API_URL` is also accepted). The web app reads it at build time.
5. For CLI deploys from the workflow, create tokens and store them as
   `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (next section).
   The workflow's frontend job skips gracefully when those secrets are absent.

## 5. GitHub Environment `staging` (one time)

Repo Settings > Environments > New environment `staging`, add these secrets:

| Secret                        | Value example                                  |
|-------------------------------|------------------------------------------------|
| `RENDER_DEPLOY_HOOK_STAGING`  | `https://api.render.com/deploy/srv-...`        |
| `STAGING_API_URL`             | `https://hackhub-api-staging.onrender.com`     |
| `STAGING_FRONTEND_URL`        | `https://hackhub-git-develop-<team>.vercel.app` |
| `VERCEL_TOKEN`                | Vercel account token                           |
| `VERCEL_ORG_ID`               | Vercel team/user id                            |
| `VERCEL_PROJECT_ID`           | Vercel project id                              |
| `SENTRY_DSN_FRONTEND`          | Sentry browser project DSN                     |

## 6. Settings per environment

Same variable names everywhere, only values change:

| Var            | Dev (local)                          | Staging                              | Live (Week 4)        |
|----------------|--------------------------------------|--------------------------------------|----------------------|
| `NODE_ENV`     | `development`                        | `staging`                            | `production`         |
| `PORT`         | `5000`                               | set by Render                        | set by host          |
| `MONGODB_URI`  | `mongodb://localhost:27017/hackhub`  | Atlas staging cluster                | Atlas live cluster   |
| `JWT_SECRET`   | dev value only                       | secret store (required, differs)     | secret store (required, differs) |
| `ACCESS_TOKEN_SECRET` | separate secret store value       | separate secret store value          | separate secret store value |
| `CSRF_SECRET`  | separate secret store value          | separate secret store value          | separate secret store value |
| `RESEND_API_KEY` | email provider key                 | email provider key                   | email provider key |
| `EMAIL_FROM`   | verified sender                      | verified sender                      | verified sender |
| `FRONTEND_URL` | `http://localhost:5173`              | staging frontend URL                 | live frontend URL |
| `LOG_LEVEL`    | `debug`                              | `info`                               | `info`               |
| `CORS_ORIGIN`  | `http://localhost:5173`              | staging frontend URL                 | live frontend URL    |
| `SENTRY_DSN`   | empty (disabled)                     | backend Sentry project DSN           | backend Sentry project DSN |
| `METRICS_TOKEN` | empty (endpoint hidden)             | random scrape token                  | random scrape token |
| `MAX_JOIN_REQUESTS_PER_DAY` | `10`                   | `10`                                 | `10` |

Templates: `apps/api/.env.example` (dev), `apps/api/.env.staging.example`
(staging shape), `apps/api/.env.production.example` (production shape). No real
values belong in the repository.

## 7. Verify (every Week 2+ push to `develop`)

1. Push to `develop` > Actions > "Deploy to staging" runs:
   backend checks > Render deploy > health wait > Vercel deploy > smoke.
2. Manual check: `STAGING_API_URL=https://<staging-api> npm run smoke:staging --prefix apps/api`.
3. Demo flow on staging: sign up → verify email → log in (password or
   Google/GitHub) → onboarding → browse the catalogue and save events →
   dashboard tracking → calendar/reminders → account settings. Confirm
   reminder delivery with configured Resend credentials and verify the reminder
   appears in the in-app notifications feed when `in_app` is selected.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Workflow fails: missing `RENDER_DEPLOY_HOOK_STAGING` | secret not set | section 5 |
| Health wait times out | free-tier cold start or bad `MONGODB_URI` | wait 2 min and retry; check Render logs |
| API boots then crashes (`JWT_SECRET ... staging`) | staging secret is `change_me`/missing | set a real `JWT_SECRET` in Render |
| CORS errors on staging frontend | `CORS_ORIGIN` missing staging URL | set exact staging frontend URL in Render |
| Frontend job skipped | missing `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` | set the Vercel secrets (section 4) |

## Rollback

- API: Render dashboard > Deploys > pick the last good deploy > Rollback.
- Frontend: Vercel dashboard > Deployments > Promote an older deployment.
- Practice both before the live deployment.

Production release approval, monitoring, backup/restore, and load-test procedures are documented in [production-operations.md](production-operations.md).
