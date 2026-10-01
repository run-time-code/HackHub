# Staging deployment (owner: Senthil Raja)

Staging is the private test copy of HackHub. `develop` branch deploys here
automatically. Weekly Demos run on staging.

| Piece     | Target                        | Source of truth                    |
|-----------|-------------------------------|------------------------------------|
| Frontend  | Vercel (preview/staging)      | `frontend/`, `vercel.json`         |
| API       | Render web service            | `render.yaml`, `server/Dockerfile` |
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
2. Set the secret env vars on the service (values from section 6 table):
   `MONGODB_URI`, `REDIS_URL`, `JWT_SECRET`, `CORS_ORIGIN`.
3. Deploy once manually, then open `https://<service>.onrender.com/health`
   and expect `{"success":true,"data":{"status":"ok",...}}`.
4. Settings > Deploy Hook: copy the hook URL. It goes into GitHub as
   `RENDER_DEPLOY_HOOK_STAGING` (next section). Every push to `develop`
   triggers this hook from the workflow.

Free-tier note: the service sleeps when idle, so the first staging request
after inactivity can take ~1 minute. The workflow's health-wait loop
(30 x 20s) covers this.

## 4. Vercel frontend (one time, with frontend team)

1. Vercel > Add New Project > import the HackHub repo.
2. Root Directory: `frontend/`. Framework: Vite (see `vercel.json`).
3. Production branch: `main`. All other branches (including `develop`)
   get preview URLs automatically — the `develop` preview URL IS the
   staging frontend.
4. Staging env var on the project: `VITE_API_URL=https://<staging-api>`.
5. For CLI deploys from the workflow, create tokens and store them as
   `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (next section).
   Until `frontend/package.json` exists (frontend Week 1 tasks), the
   workflow's frontend job skips gracefully.

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

## 6. Settings per environment

Same variable names everywhere, only values change:

| Var            | Dev (local)                          | Staging                              | Live (Week 4)        |
|----------------|--------------------------------------|--------------------------------------|----------------------|
| `NODE_ENV`     | `development`                        | `staging`                            | `production`         |
| `PORT`         | `5000`                               | set by Render                        | set by host          |
| `MONGODB_URI`  | `mongodb://localhost:27017/hackhub`  | Atlas staging cluster                | Atlas live cluster   |
| `REDIS_URL`    | `redis://localhost:6379`             | hosted Redis / placeholder           | hosted Redis         |
| `JWT_SECRET`   | dev value only                       | secret store (required, differs)     | secret store (required, differs) |
| `LOG_LEVEL`    | `debug`                              | `info`                               | `info`               |
| `CORS_ORIGIN`  | `http://localhost:5173`              | staging frontend URL                 | live frontend URL    |

Templates: `server/.env.example` (dev), `server/.env.staging.example`
(staging shape, no real values).

## 7. Verify (every Week 2+ push to `develop`)

1. Push to `develop` > Actions > "Deploy to staging" runs:
   backend checks > Render deploy > health wait > Vercel deploy > smoke.
2. Manual check: `STAGING_API_URL=https://<staging-api> npm run smoke:staging --prefix server`.
3. Week 2 demo flow on staging: browse hackathons, search/filter, save,
   dashboard, profile skills, recommendations + Worth Score.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Workflow fails: missing `RENDER_DEPLOY_HOOK_STAGING` | secret not set | section 5 |
| Health wait times out | free-tier cold start or bad `MONGODB_URI` | wait 2 min and retry; check Render logs |
| API boots then crashes (`JWT_SECRET ... staging`) | staging secret is `change_me`/missing | set a real `JWT_SECRET` in Render |
| CORS errors on staging frontend | `CORS_ORIGIN` missing staging URL | set exact staging frontend URL in Render |
| Frontend job skipped | `frontend/package.json` not merged yet | expected until frontend Week 1 lands |

## Rollback

- API: Render dashboard > Deploys > pick the last good deploy > Rollback.
- Frontend: Vercel dashboard > Deployments > Promote an older deployment.
- Practice both before the live deployment.
