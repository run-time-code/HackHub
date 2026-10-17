# HackHub — Team Task Completion Audit

**Audit date:** 17 October 2026  
**Repository state:** `main` at merge commit `6ab7b29` (PR #15, "team collaboration backend")  
**Scope:** All tasks for Persons 1–9 in the 4-week plan (109 tasks, 556 EP)  
**Audit basis:** code on `main` and other branches, tests, docs, workflows, git history, GitHub PRs, CI runs, branch protection and environment settings.

> **Important:** this is a repository-evidence audit, not a judgement of effort. Work done in Figma, meetings, manual testing, or an external system is not visible here and is marked **Not verifiable**. Conversely, code on an unmerged branch is counted as “delivered on branch” but **not integrated**, because it cannot reach staging or users.

---

## 1. Executive verdict

**v1.0 is not launch-ready.** The team has a solid authentication/security backend, working team-collaboration APIs with tests, and good deployment documentation. However, the core product loop — browse/search hackathons → save → dashboard → teams → reminders → Worth Score — is not working end-to-end on `main`.

### Headline findings

| # | Finding | Evidence |
|---|---|---|
| 1 | **Only ~37% of planned EP is delivered at code level; ~29% is integrated on `main`.** | Task-by-task audit below; Nandhini's 42.5 EP is on an unmerged branch. |
| 2 | **The hackathon API is not mounted in the active API.** `apps/backend-prototype/` contains hackathon routes, but the production entrypoint (`apps/api/src/server.js`) never mounts them. | `apps/api/src/routes/index.js` has no `/hackathons`; `docs/production-operations.md` already admits this gap. |
| 3 | **Nandhini's entire backend work is stranded on `nandhini-backend`.** It has no PR and is not merged into `main`. | 5 commits, branch not contained in `main`, no PR in GitHub. |
| 4 | **There is no `develop` branch and no staging GitHub environment.** The staging workflow can never run from a `develop` push. | `git ls-remote` shows no `develop`; GitHub API returns “Branch not found”; only the `production` environment exists. |
| 5 | **`main` is not branch-protected, and the production environment has no approval rule.** | Branch-protection API: “Branch not protected”; `protection_rules: []` on `production`. |
| 6 | **CI on `main` is red.** Frontend and backend jobs pass; **Gitleaks fails** because a `BRABBLE_API_KEY` was committed in `data_importer/.env` (commit `27555af`, 26 Sep, author Nandhini V). | CI run `39032789318`: frontend success, backend success, secret scanning failure. |
| 7 | **The production deploy has never succeeded.** All 11 recorded runs failed; the latest failed at “Missing RENDER_API_KEY_PRODUCTION”. | Run `39032789284`; 11 failures, 0 successes. |
| 8 | **No frontend work exists beyond auth/onboarding.** `apps/web/src` has no listing, search, profile, calendar, team, analytics, or legal pages. | Only 7 source pages + auth/onboarding components; `Dashboard.jsx` is explicitly a placeholder. |
| 9 | **Worth Score and recommendations exist only as a design document.** No score function, endpoints, recommendations, teammate matching, or feedback loop. | `docs/WORTH_SCORE.md` only; no matching code. |
| 10 | **Data collection is one Brabble aggregator importer, not six platform collectors.** | `tools/data-importer/import_hackathons.py` uses `https://brabble.ai/api/listings`; no Devpost/MLH/etc. collector modules. |

### Overall scoreboard

Scoring method: **task-level, EP-weighted**; Done = full EP, Partial = half EP, Not done / Not verifiable = 0. This is an indicative audit score, not an official team score. The plan's own “Finished” definition is stricter (reviewed, CI green, Deva-verified, documented, on staging), and almost no task meets all of it today because CI and staging are broken.

| Person | Main responsibility | Commits (all refs) | Planned EP | Credited EP | Estimate | On `main`? |
|---|---|---|---|---|---|---|
| 1. Lalitha | Design system & discovery UI | 0 | 61 | 3.0 | **5%** | None |
| 2. Rubashree | Auth, onboarding, dashboard, calendar UI | 3 + 1 merge | 61 | 13.5 | **22%** | Week 1 only |
| 3. Divyashree | Frame, profiles, team UI | 0 | 61 | 5.0 | **8%** | None |
| 4. Berwin | Auth, security, user data | 18 | 62 | 52.5 | **85%** | Most |
| 5. Nandhini | Hackathon data, search, reminders | 5 (unmerged) | 61 | 42.5 | **70% branch / 0% main** | **No** |
| 6. Senthil Raja | Team backend, automation, servers | 64 | 63 | 50.0 | **79%** | Most |
| 7. Gokul | Database & 6-platform collection | 0 | 61 | 13.0 | **21%** | Partial, via others |
| 8. Selva Vignesh | Recommendations & Worth Score | 0 | 62 | 8.0 | **13%** | Design only |
| 9. Deva Kanchana | Testing & launch | 1 | 64 | 17.5 | **27%** | One deployment commit |
| **Team** | | | **556** | **205.5** | **~37% any branch / ~29% on main** | |

**Status counts:** 22 tasks Done (5 of them on an unmerged branch), 35 Partial (6 on a branch), 50 Not done, 2 Not verifiable (109 total).

---

## 2. How to read each status

| Status | Meaning |
|---|---|
| ✅ Done | The deliverable exists and is wired on `main`, with code/doc evidence. It may still fail the team's full Definition of Done because deployment/CI is broken. |
| ✅ Branch | Complete on an unmerged branch. Full code credit, but not available on `main`, staging, or production. |
| 🟡 Partial | A meaningful part exists, but one or more required elements are missing, unreachable, or unverified. |
| 🟡 Branch | Partially implemented on an unmerged branch; not available on `main`, staging, or production. |
| ❌ Not done | No repository evidence of the deliverable. |
| ⚪ Not verifiable | External/manual work (Figma, meetings, manual QA, live dashboards) that the repository cannot prove. |

---

## 3. Why so much is incomplete — root causes

1. **Branch/integration failure (largest cause).** Nandhini delivered database models, hackathon search/facets, ingestion, notification and reminder modules on `nandhini-backend`, but never opened a PR. `main` therefore has no hackathon routes and no reminder system. Because the team reorganized into `apps/*` on 17 Oct, that branch now needs porting, not just merging.
2. **Core feature never wired.** The hackathon browse/search API lives in `apps/backend-prototype/`, a separate package that is not installed or mounted by `apps/api`. Everything downstream (Lalitha's listing pages, Rubashree's dashboard, Selva's score, Gokul's data visibility) is blocked or was built against nothing.
3. **No staging path.** `deploy-staging.yml` triggers on `develop`, but `develop` does not exist, the `staging` GitHub environment does not exist, and no staging deploy run appears in Actions. The team never had a working staging site to demo or verify against.
4. **CI is red and unprotected.** Gitleaks finds a real committed API key in history. Because `main` is not protected, PR #15 was merged even though its CI failed; `main` CI is still failing. The team's “all checks pass” gate is not operating.
5. **Release gate not configured.** The `production` environment has no required reviewers, so the “manual approval” step is not enforced. Production deploys fail immediately on missing secrets, and there is no evidence of a live domain, CDN, or successful rollback.
6. **Frontend stopped after Week 1.** Only authentication, onboarding and a placeholder dashboard exist. The design system, listing/detail, search/filter, profile, calendar and team screens were never delivered to `main`; earlier landing-page components in git history are not in the current `apps/web`.
7. **Data/recommendation work never moved from design to code.** Gokul's importer is a single aggregator call; Selva's Worth Score is a markdown formula with a small 18-skill taxonomy. No collectors for six sources, no scheduled refresh, no score/recommendation endpoints.
8. **Testing was absorbed by implementers.** Senthil and Berwin wrote useful backend tests, but there is no test plan, no frontend test runner, no Playwright/E2E, no Postman contract suite, no coverage gate, no OWASP ZAP/Lighthouse/axe evidence, and no executed load test.
9. **Security verification left a real leak open.** The Gitleaks finding is a `BRABBLE_API_KEY` in `data_importer/.env` from commit `27555af` (26 Sep). The file is now ignored, but the secret remains in git history and must be **rotated**, not just deleted from the working tree.

---

## 4. Person-by-person audit

### Person 1 — Lalitha (Frontend: Design System & Hackathon Discovery UI)

**Delivered:** No commits, no PRs, no files attributable to Lalitha in any branch. Current `apps/web` has no design tokens, component kit, listing page, detail page, search/filter UI, or Worth Score UI.

| Task | Requirement | Status | Evidence / date | Gap / reason |
|---|---|---|---|---|
| 1.1.1 | Project setup, Tailwind theme, ESLint/Prettier/Husky, design tokens, folder agreement | 🟡 Partial | Vite + Tailwind + ESLint exist in `apps/web` (from team setup/restructure, Oct 17). No Prettier, Husky, tokens, or Next.js. | Setup exists but not the requested design-system foundation; no Lalitha commit. |
| 1.1.2 | Reusable component kit + states + Storybook/design page | ❌ Not done | No component library, Storybook, or `/design` page. Auth forms use local markup. | No implementation in any branch. |
| 1.1.3 | Hackathon card, listing grid, detail page, loading/empty/error states | ❌ Not done | No listing/detail route in `apps/web/src/App.jsx`; no `HackathonCard`. | Also blocked by missing `/hackathons` API. Could have used fake data first (task explicitly allowed it), so blocker is not the only cause. |
| 1.2.1 | Debounced search, filter panel, facet counts, mobile drawer | ❌ Not done | No search components or API. | Not started. |
| 1.2.2 | Shareable filter URLs, sorting, pagination/infinite scroll | ❌ Not done | No listing page. | Not started. |
| 1.2.3 | Save/bookmark button on cards, guest login prompt | ❌ Not done | No card UI; backend save API exists. | Not started. |
| 1.3.1 | Worth Score badge, breakdown chart, “Why this score?” | ❌ Not done | No score UI; no score API. | Depends on Selva's missing API. |
| 1.3.2 | For You / Ending Soon / Trending / New sections, feedback | ❌ Not done | No home sections in current app. | Not started. |
| 1.3.3 (Bonus) | Compare up to 3 hackathons | ❌ Not done | No compare UI. | Not started. |
| 1.4.1 | SSR, image optimization, code splitting, SEO, sitemap, Lighthouse 90+ | ❌ Not done | Vite SPA; no SEO/sitemap/Lighthouse evidence. | Not started. |
| 1.4.2 | Error boundaries, custom 404/500, retry/offline banner | 🟡 Partial | Sentry `ErrorBoundary` in `main.jsx`; no custom 404/500, retry, or offline banner. | Only a generic boundary exists, not the task's full scope. |
| 1.4.3 | Fix serious bugs, 320–1440px layout, Figma check | ❌ Not done | No bug list, screenshots, or responsive audit. | Cannot verify; no UI delivered. |

**Verdict:** **5%** EP credit. The only partial credit is shared project setup and a generic error boundary. No discovery UI was delivered to the repository. The missing hackathon API is a real blocker for data, but not for fake-data components, design tokens, or the component kit.

---

### Person 2 — Rubashree (Frontend: Login, Onboarding, Dashboard & Calendar UI)

**Delivered:** Authentication screens, protected routes, onboarding wizard, API/CSRF client, auth context. Week 1 is real and merged. Weeks 2–4 are absent.

| Task | Requirement | Status | Evidence / date | Gap / reason |
|---|---|---|---|---|
| 2.1.1 | Register, login, forgot/reset, verify screens; react-hook-form + zod; API errors; show/hide; loading; redirect | ✅ Done | `apps/web/src/pages/auth/*`, `components/auth/*`, `lib/validation/authSchemas.js`; authored 26 Sep, merged via PR #3 on 10 Oct. | Complete for the planned screens. |
| 2.1.2 | httpOnly cookie session, protected pages, silent refresh, auto logout | 🟡 Partial | `request.js` uses `credentials: "include"`; `ProtectedRoute` blocks guests; 401 event logs out. No silent refresh call. | Refresh endpoint exists in API but the SPA never calls it; session silently expires after 15 minutes. |
| 2.1.3 | Onboarding: skills, interests, mode, location; skip; save via profile API | ✅ Done | `OnboardingWizard.jsx`, `useOnboardingProgress`, `profile.js`; 26 Sep. | Complete. |
| 2.2.1 | Dashboard tabs (Saved/Registered/Ongoing/Completed), summary cards, rows, quick actions | ❌ Not done | `pages/Dashboard.jsx` says “Placeholder … real dashboard is built in Week 2”. | Only a welcome/logout screen. |
| 2.2.2 | Mark registered, move tabs, notes, remove, optimistic/undo, auto status | ❌ Not done | No dashboard UI; backend tracking APIs exist (Berwin). | API dependency is available, so this is a frontend gap. |
| 2.2.3 | Dashboard search/filter/empty screens | ❌ Not done | No dashboard implementation. | Not started. |
| 2.3.1 | Month/week/agenda calendar, colored deadlines, event details, timezone | ❌ Not done | No calendar page or library in `apps/web`. | No calendar API on `main` either. |
| 2.3.2 | Reminder settings (1/3/7 days, custom), email/in-app channel, DND | ❌ Not done | No reminder UI; no reminder API on `main`. | Nandhini's reminder branch is unmerged. |
| 2.3.3 (Bonus) | .ics download + subscription link | ❌ Not done | No export code. | Not started. |
| 2.4.1 | WCAG 2.1 AA, keyboard/focus, ARIA, contrast, axe check | ❌ Not done | Basic labels exist in auth forms, but no audit or axe setup. | No evidence of the accessibility pass. |
| 2.4.2 | Browser/device testing, fix date-picker/calendar issues | ⚪ Not verifiable | No test notes or reports. | Calendar was never built. |
| 2.4.3 | Settings/account: password, notification prefs, delete, download data | ❌ Not done | Backend endpoints exist (`change-password`, `DELETE /users/me`, `/export`), but no UI routes. | Frontend gap; API is ready. |

**Verdict:** **22%** EP credit. Strong Week 1 delivery; no Week 2–4 UI. The dashboard is explicitly still a placeholder, and no calendar exists.

---

### Person 3 — Divyashree (Frontend: Website Frame, Profiles & Team Collaboration UI)

**Delivered:** No commits, no PRs, no files attributable to Divyashree. Figma work may exist externally but cannot be verified. The current app has bare routing and an API request helper, but no frame/nav/footer, profile pages, team finder, team management, requests inbox, or notification bell.

| Task | Requirement | Status | Evidence / date | Gap / reason |
|---|---|---|---|---|
| 3.1.1 | Figma wireframes/final designs for all main flows; mobile/desktop; review by Day 2 | ⚪ Not verifiable | No Figma links, exports, or design files in repo. | External deliverable; cannot be checked. |
| 3.1.2 | Main layout, navbar (logged-in state), footer, mobile menu, routes, dark/light theme | 🟡 Partial | `App.jsx` has routes for auth/onboarding/dashboard; no navbar, footer, mobile menu, theme switch, or landing frame. | Only minimal routing exists, and no commit attribution. |
| 3.1.3 | Env-aware API helper, TanStack Query, typed Swagger client, MSW fake server | 🟡 Partial | `lib/api/request.js` handles base URL, credentials, CSRF and 401; 26 Sep (Rubashree). No TanStack Query, generated typed client, or MSW. | One third of the task exists. |
| 3.2.1 | Profile create/edit: photo, bio, college, year, location, skills, links, past hackathons, looking-for-team | ❌ Not done | No profile pages or forms in `apps/web`. Profile APIs exist (Berwin). | Frontend not started. |
| 3.2.2 | Public profile page, share link, “Invite to my team” button | ❌ Not done | No public profile route. | Not started. |
| 3.2.3 | Landing page: hero, benefits, how it works, logos, live counts, signup CTA, SEO structure | ❌ Not done | Current app redirects `/` to `/login`; old landing components in history are not in current `apps/web`. | Not delivered to current main. |
| 3.3.1 | Teammate finder: skills/role/interests/availability, match %, common skills, invite/request | ❌ Not done | No teammate UI; discovery API exists (`GET /users/discover`). | API is ready; UI absent. |
| 3.3.2 | Create/manage teams, roles, size, member list, leader controls, team detail | ❌ Not done | No team routes/components. Team APIs are complete (Senthil). | API is ready; UI absent. |
| 3.3.3 | Requests inbox, notification bell with unread count, live feed | ❌ Not done | No inbox/bell; notification API/SSE exists. | API is ready; UI absent. |
| 3.4.1 | UX polish: tooltips, hints, empty states, consistent wording, animations | ❌ Not done | No feature screens to polish. | Not started. |
| 3.4.2 | Privacy-friendly analytics, key-action tracking, cookie consent | ❌ Not done | No analytics or consent code. | Not started. |
| 3.4.3 | Terms, Privacy, FAQ, Contact, feedback/report button | ❌ Not done | No legal/help pages. | Not started. |
| 3.4.4 | Fix serious profile/team bugs | ❌ Not done | No profile/team screens. | Not started. |

**Verdict:** **8%** EP credit (only shared routing and API-helper scaffolding). Figma may exist externally, but no code from this responsibility reached `main`. The team/request APIs are ready and unused, which makes this a clear missed integration.

---

### Person 4 — Berwin (Backend: Login, Security & User Data)

**Delivered:** The strongest backend contribution. Authentication, email verification/reset, RBAC, profile/skills, avatar, saved/registered tracking, dashboard summary, OAuth, security hardening, account lifecycle, admin endpoints (partially reachable).

| Task | Requirement | Status | Evidence / date | Gap / reason |
|---|---|---|---|---|
| 4.1.1 | Register/login/logout/refresh; bcrypt; 15-min access + 7-day refresh httpOnly cookies; Swagger by Day 2 | ✅ Done | `controllers/authController.js`, `utils/tokenUtils.js` (15m), `cookieUtils.js` (7d), `openapi.yaml`; commits 26 Sep. | Swagger covers auth but not profile/saved/dashboard; contract incomplete for later work. |
| 4.1.2 | One-time expiring verification/reset tokens; email templates; resend limits | ✅ Done | `authController.js` hashed tokens + expiry; `emailUtils.js` (Resend); resend limiter; 26 Sep. | Complete. |
| 4.1.3 | requireAuth, roles, standard 401/403 | ✅ Done | `middleware/authMiddleware.js`, `requireRole`; lockout and rate limits; 26 Sep. | Complete. |
| 4.2.1 | GET/PUT /users/me, public profile, skills, preferences, photo upload with validation | ✅ Done | `userController.js`, `userRoutes.js`, Cloudinary + multer, Zod validator; 3 Oct / 10 Oct. | Skills taxonomy has only 18 skills (Selva dependency), but the API itself works. |
| 4.2.2 | Save/unsave/mark registered/notes; ongoing/completed; no duplicates | 🟡 Partial | `hackathonTrackingController.js`, `SavedHackathon`/`Registration` unique indexes; 3 Oct. | No endpoint to list saved/registered rows; ongoing/completed only exposed for one `status/:hackathon` and dashboard summary. |
| 4.2.3 | Dashboard summary: status counts + next 7-day deadlines, fast combined query | ✅ Done | `dashboardController.js` aggregation; 3 Oct. | Complete. |
| 4.3.1 (Bonus) | Google/GitHub OAuth, link by verified email | ✅ Done | `oauthController.js`, `config/passport.js`, state-cookie protection; 10 Oct. | Complete. |
| 4.3.2 | Helmet, CORS allow-list, size limits, rate limiting, input sanitisation, CSRF, audit log | ✅ Done | `app.js`, `sanitizeMiddleware`, `csrfMiddleware`, `rateLimitMiddleware`, `auditMiddleware`; 10 Oct. | Complete. |
| 4.3.3 | Change password, revoke all sessions, soft delete + purge, data export | ✅ Done | `userController.js`, `accountPurge.js` nightly job; 10 Oct. | Complete. |
| 4.4.1 | OWASP Top-10 audit, npm audit, fix ZAP findings | 🟡 Partial | Gitleaks added 16 Oct; no OWASP checklist, ZAP report, or `npm audit` gate. | Security verification not completed; leak remains. |
| 4.4.2 | Secrets in env/secret manager; gitleaks; rotate leaked keys; review live settings | 🟡 Partial | Env-based config and Gitleaks CI exist. | **CI currently fails on a real leaked `BRABBLE_API_KEY` in git history (`data_importer/.env`, commit `27555af`).** No evidence of rotation. This blocks every PR. |
| 4.4.3 (Bonus) | Admin APIs: hide/feature/edit hackathon; ban/unban; reports | 🟡 Partial | `routes/admin*`, controllers, role guard; 16–17 Oct. | Routes are mounted only in the legacy `apps/api/server.js`, **not** in the active `src/app.js` used by `npm start`. Unreachable in production. |

**Verdict:** **85%** EP credit. Code quality is generally good and tests cover auth/security. Remaining failures are release-critical: leaked key/CI red, no audit evidence, and unmounted admin routes.

---

### Person 5 — Nandhini (Backend + Database: Hackathon Data, Search & Reminders)

**Delivered:** Substantial work on `nandhini-backend`, but **none of it is merged into `main`**. On that branch: Hackathon/Organizer/Source/Tag models, canonical dedupe, search/facets/cursor pagination, Redis caching, ingestion/quarantine, reminders with retries/idempotency, notification endpoints, OpenAPI and tests. On `main`, the active API has no hackathon routes and no reminders.

| Task | Requirement | Status | Evidence / date | Gap / reason |
|---|---|---|---|---|
| 5.1.1 | Hackathon/Organizer/Source/Tag schemas, ER diagram, index plan | ✅ Branch | `backend/models/*`, `backend/docs/DATA_MODEL.md`; 26 Sep. | Not merged; `main` has only a minimal admin Hackathon model. |
| 5.1.2 | GET /hackathons (paged) + /:idOrSlug, consistent envelope, Swagger | ✅ Branch | `backend/controllers/hackathonController.js`, routes, OpenAPI; 26 Sep. | Not mounted in active API. `apps/backend-prototype` has a similar but separate implementation. |
| 5.1.3 | Atlas dev/staging/live, pooling, restricted users, seed script | 🟡 Branch | `docs/ATLAS_SETUP.md`, `scripts/seed.js`; 26 Sep. | No evidence clusters exist or are connected; no staging/live deployment. |
| 5.2.1 | Text search, filters, sorting, cursor pagination, facet counts | ✅ Branch | Controller has filters, facets, cursor, sort; 11 Oct. | Complete on branch, not on main; no frontend/API integration. |
| 5.2.2 | Intake layer, upsert by (source, externalId), dedupe, quarantine | ✅ Branch | `hackathonIngestionService.js`, `IngestionQuarantine`, `canonicalKey`; 11 Oct. | Branch only; importer uses a separate path. |
| 5.2.3 | Redis cache, expiry/invalidation, ETag/Cache-Control | ✅ Branch | `cacheService.js`, controller ETag/cache headers; 11 Oct. | Branch only; not deployed. |
| 5.3.1 | Scheduler/queue, reminders from preferences, no duplicates, retries, timezone | 🟡 Branch | `reminderScheduler.js`, `reminderJobFactory.js`, locks/retries/idempotency; 17 Oct. | Timezone is stored/validated, but scheduling uses UTC offsets; no local-hour/DND logic. Not merged. |
| 5.3.2 | GET /calendar/events + personal iCal feed | ❌ Not done | No calendar or `.ics` code on branch or main. | Not started. |
| 5.3.3 | Reminder email + in-app notification, direct links, unsubscribe | 🟡 Branch | `emailService.js`, notification creation per job; 17 Oct. | Email/in-app exist; no unsubscribe link found. Not merged. |
| 5.4.1 | Explain/tune indexes; 95% list/search <300 ms | 🟡 Branch | Indexes/caching/pagination exist. | No `explain()` results or latency measurements. |
| 5.4.2 | Complete Swagger + Postman collection with examples | 🟡 Branch | `backend/docs/openapi.yaml` expanded (+546 lines); 17 Oct. | OpenAPI exists; no Postman collection. Not on main. |
| 5.4.3 | Health checks, safe shutdown, queue dashboard, failure alerts | 🟡 Branch | Scheduler retries and dead-letter status. | No `/health` endpoint on that server and no Bull Board/alerting. |

**Verdict:** **70% EP on branch, 0% on `main`.** This is the single biggest integration loss in the project. The work is real but invisible to staging, demos, and users. Cause: no PR/merge, plus the 17 Oct monorepo move made the branch path-incompatible.

---

### Person 6 — Senthil Raja (Backend + Testing/Deployment)

**Delivered:** Backend skeleton, Docker, CI, teams/discovery, collaboration (join requests, notifications, team rules), staging/production operations, monitoring, load-test tooling. Team APIs are tested (51 backend tests). Operational setup is present but not live.

| Task | Requirement | Status | Evidence / date | Gap / reason |
|---|---|---|---|---|
| 6.1.1 | Express structure, central errors, request IDs, Pino, per-env config, /health; share Day 1 | ✅ Done | `apps/api/src/*`, `README`; commits 27 Sep. | Delivered 27 Sep, not Day 1 of Week 1 — schedule slip, but complete. |
| 6.1.2 | Dockerfile, compose (API+Mongo+Redis), .env.example, settings table | ✅ Done | `Dockerfile`, `docker-compose.yml`, env templates, README table; 27 Sep, fixed 17 Oct. | Docker could not be built in this audit environment; configuration is consistent. |
| 6.1.3 | CI install/lint/test/build on PRs; branch protection; staging deploy job | 🟡 Partial | `.github/workflows/ci.yml`, deploy-staging.yml; 27 Sep. | CI exists and backend/frontend jobs pass, **but Gitleaks fails**, `main` is unprotected, `develop` does not exist, and no staging deploy ever ran. |
| 6.2.1 | Staging: Vercel + Render + Atlas, domain/HTTPS/secrets, auto-deploy develop | 🟡 Partial | `render.yaml`, `docs/staging.md`, deploy workflow; 1 Oct. | No `develop` branch, no `staging` environment/secrets, no successful staging run, no staging URL evidence. |
| 6.2.2 | Team/Membership schema, CRUD, list by hackathon, leader-only permissions | ✅ Done | `src/models/team.js`, services/controllers/routes; 1 Oct; tests. | Complete. |
| 6.2.3 | Teammate discovery by skills/availability/looking-for-team; privacy opt-in | ✅ Done | `usersService.js`, tests; 1 Oct. | Complete. |
| 6.3.1 | Requests/invites with states, duplicate/self/full guards, daily limit | ✅ Done | `joinRequest` model/service/routes; 17 Oct; 51 tests. | Complete (atomic seat acceptance). |
| 6.3.2 | Notification model/list/read, instant SSE, polling fallback | ✅ Done | notification model/service/controller, SSE; 17 Oct; tests. | Complete; in-process bus needs Redis pub/sub for multi-instance. |
| 6.3.3 | Auto-close when full, leader change, cleanup, email events | ✅ Done | `teamsService`, `joinRequestsService`, email util; 17 Oct; tests. | Complete. |
| 6.4.1 | Live servers/domain/HTTPS/CDN, main deploy with approval, zero-downtime, rollback, backup drill | 🟡 Partial | deploy-production.yml, docs, backup script; 10 Oct. | No successful production deploy (missing Render secrets), no approval rule on `production`, no domain/CDN/rollback evidence, backup drill not executed. |
| 6.4.2 | Sentry FE/BE, uptime alerts, central logs, metrics dashboard | 🟡 Partial | Sentry code, `/metrics`, uptime workflow, Grafana JSON, docs; 17 Oct. | No evidence external Sentry/uptime/Slack projects are configured; uptime workflow has no runs yet; live site absent. |
| 6.4.3 | k6 browse/search/login; tune sizes/connections/limits from results | 🟡 Partial | `tools/loadtest/scenarios.js`, README; 17 Oct. | Not executed (no k6/staging); no measurements or tuning. |

**Verdict:** **79%** EP credit. The backend feature work is complete and tested. The failure to protect `main`, create `develop`/staging, and configure production secrets means the “automatic servers” half is not operational.

---

### Person 7 — Gokul (Database & Data Collection)

**Delivered:** No commits/PRs by Gokul. A Python importer exists at `tools/data-importer/import_hackathons.py` (701 lines; first committed by Nandhini on 26 Sep, expanded 11 Oct), but it calls the Brabble aggregator API, not six platform-specific collectors. Earlier ingestion/model work is on Nandhini's branch.

| Task | Requirement | Status | Evidence / date | Gap / reason |
|---|---|---|---|---|
| 7.1.1 | Collections, relationships, unique keys, indexes, data dictionary, Day-2 lock | 🟡 Partial | `backend-prototype/models/*` and Nandhini's `DATA_MODEL.md` (branch) exist; main has minimal `Hackathon` only; no data dictionary on main. | Work split across an unmerged branch and a prototype package. |
| 7.1.2 | ToS/robots research for Devpost/Unstop/Devfolio/HackerEarth/MLH/Hack2Skill | ❌ Not done | No research document or source matrix in repo. | No evidence. |
| 7.1.3 | Devpost + MLH collectors, polite limits, raw copies, intake | 🟡 Partial | Single generic importer uses `brabble.ai/api/listings`; `platform` field is mapped generically; 26 Sep, expanded 11 Oct. | No Devpost/MLH-specific collector or raw archive. |
| 7.2.1 | Collectors for Unstop/Devfolio/HackerEarth/Hack2Skill | ❌ Not done | No source-specific modules. | One aggregator replaces six collectors; not the task. |
| 7.2.2 | Normalise dates/mode/prize, fuzzy dedupe, keep source links | 🟡 Partial | Importer normalises fields and upserts; prototype/Nandhini branch has canonical-key dedupe. | Exact-key dedupe, not fuzzy matching; no source-link consolidation on main. |
| 7.2.3 | Zod validation, quarantine collection with reasons | 🟡 Partial | Ingestion service returns quarantined errors; `IngestionQuarantine` exists on branch. | No persisted quarantine on main; importer path differs. |
| 7.3.1 | Scheduled refresh per source, content hash, archive ended, run history | ❌ Not done | No scheduler/cron for importers; no scrape-run model. | Not started. |
| 7.3.2 | Auto-tagging with Selva's extractor, backfill old records | ❌ Not done | No tag extractor or backfill job. | Depends on Selva, who also has no extractor. |
| 7.3.3 | Data-quality view: counts, freshness, failure rate | ❌ Not done | No admin view or endpoint. | Not started. |
| 7.4.1 | Alerts for 0 records/parse errors, retry/backoff/disable broken source | ❌ Not done | No alerting/backoff code. | Not started. |
| 7.4.2 | Final indexes/explain, Atlas backups, IP allow-list, TTL, migrations | 🟡 Partial | Indexes exist on branch/prototype; Atlas setup doc; backup runbook from Senthil. | No TTL for raw copies, no migration execution, no Atlas backup evidence. |
| 7.4.3 | Compare 100 records with sources, remove duplicates, verify links | ❌ Not done | No audit report or script. | Not started. |

**Verdict:** **21%** EP credit. A real importer exists, but it is one aggregator, not the six-platform collection system that is the core value of HackHub. No direct Gokul commits.

---

### Person 8 — Selva Vignesh (Recommendation System & Worth Score)

**Delivered:** A one-page Worth Score design (`docs/WORTH_SCORE.md`, 12 Sep) and a small skill taxonomy (18 skills, 5 categories). No scoring code, recommendations, endpoints, teammate matching, feedback loop, or public explanation page.

| Task | Requirement | Status | Evidence / date | Gap / reason |
|---|---|---|---|---|
| 8.1.1 | Data inventory, formula/weights, missing-data rules, one-page design reviewed | 🟡 Partial | `docs/WORTH_SCORE.md`; 12 Sep. | Formula has 5 factors (30/20/15/20/15), not the plan's 6 (30/20/15/15/10/10); no review record. |
| 8.1.2 | ~150 skills, ~20 domains, aliases, keyword tag extractor, test on 50 hackathons | 🟡 Partial | `apps/api/utils/skillTaxonomy.js`: 18 skills, 5 categories, no aliases; no extractor. | Far short of scope; this also limits Berwin's skills API and Gokul's tagging. |
| 8.1.3 | Prototype scoring script + team sanity check | ❌ Not done | No script. | Not started. |
| 8.2.1 | Recommendation v1 (TF-IDF/cosine, deadline/new boosts, fallback) | ❌ Not done | No recommender code. | Not started. |
| 8.2.2 | Worth Score v1 rule-based, total + factor JSON | ❌ Not done | No `calcWorthScore` implementation. | Doc only. |
| 8.2.3 | GET /hackathons/:id/score, GET /recommendations | ❌ Not done | No routes. | API never existed. |
| 8.3.1 | Worth Score v2 (reputation, difficulty, learning signals, reasons) | ❌ Not done | No implementation. | Not started. |
| 8.3.2 | Teammate matching (complementary skills, common interests, availability) | ❌ Not done | Discovery ranks exact skill overlap only (`matchCount`), not complementarity. | Selva's matching logic absent. |
| 8.3.3 | Nightly pre-calculation/caching, invalidate on changes | ❌ Not done | No jobs/cache. | Not started. |
| 8.4.1 | Manual ratings of ~30 hackathons, tune weights, precision@k, edge cases | ❌ Not done | No ratings or evaluation. | Not started. |
| 8.4.2 (Bonus) | Feedback loop from “not relevant”/saves/register clicks | ❌ Not done | No feedback storage. | Not started. |
| 8.4.3 | Formula/weights/limitations doc + public explanation page | 🟡 Partial | `docs/WORTH_SCORE.md`; no public page; weights differ from plan. | Partial. |

**Verdict:** **13%** EP credit. The score is still a design document, so the flagship differentiator of HackHub does not exist in the product. This also blocks Lalitha's score UI and Gokul's auto-tagging.

---

### Person 9 — Deva Kanchana (Testing, Quality & Launch Management)

**Delivered:** One commit on 12 Sep adding `netlify.toml`, `vercel.json`, `vite.config.ts` (PR #1 was closed; the commit is in history and later superseded). No test plan, bug process, test tooling, E2E suite, security/accessibility reports, student trial, or launch records.

| Task | Requirement | Status | Evidence / date | Gap / reason |
|---|---|---|---|---|
| 9.1.1 | Test strategy/plan, severity levels, bug template, GitHub board/labels | ❌ Not done | No test plan or bug template in repo. | Not started. |
| 9.1.2 | Jest/Supertest, Vitest/RTL, Playwright, Postman, Mailtrap, coverage gate | 🟡 Partial | Backend uses `node:test` (51 tests) and CI runs it; web has no test script; no Jest/Vitest/Playwright/Postman/Mailtrap/coverage. | Only a partial substitute exists; the specified toolchain was not adopted. |
| 9.1.3 | Given/When/Then for Week 1, run and approve/reject staging | ❌ Not done | No acceptance criteria or staging approval. | No staging site. |
| 9.2.1 | Functional/API tests: login variants, search/filter/pagination, dashboard, contract | 🟡 Partial | Auth/security/team/discovery tests exist; no hackathon/search tests (feature absent); no contract tests. | Partial coverage, not the planned matrix. |
| 9.2.2 | Data-quality testing against source pages, duplicates, timezones | ❌ Not done | No reports/scripts. | Not started. |
| 9.2.3 | Re-test suite v1: login/list/filter/save quick tests in CI | 🟡 Partial | CI runs backend tests on PRs. | No browser/E2E quick suite; list/filter endpoints absent. |
| 9.3.1 | E2E: signup → onboarding → search → save → dashboard; team flow; calendar | ❌ Not done | No Playwright/Cypress or E2E directory. | Not started. |
| 9.3.2 | Reminder/notification testing: scheduler, timezone, duplicates, email | 🟡 Partial | Notification tests exist (Senthil, 17 Oct); no reminder tests on main. | Reminder implementation is on an unmerged branch. |
| 9.3.3 | Speed baseline with k6/Artillery at 100 users; report slow parts | 🟡 Partial | k6 scenarios exist (Senthil, 17 Oct). | Never executed; no report to Nandhini/Senthil. |
| 9.4.1 | Full re-test, browsers/devices, 10–15 student trial, feedback | ❌ Not done | No evidence. | Not started. |
| 9.4.2 | OWASP ZAP, login abuse, Lighthouse, axe | 🟡 Partial | Gitleaks exists but is failing; no ZAP/Lighthouse/axe evidence. | Security gate is red. |
| 9.4.3 | Launch checklist/go-no-go, post-deploy check, rollback, 48h watch, release notes | 🟡 Partial | Production workflow and ops docs exist (Senthil). | Deploy fails on missing secrets; no checklist, go/no-go, rollback drill, watch log, or release notes. |

**Verdict:** **27%** EP credit, mostly inherited infrastructure rather than Deva-authored testing. The project has no independent quality gate, and the launch-management deliverables are missing.

---

## 5. Completion timeline (what was finished, and when)

| Date | What landed | Person(s) / evidence |
|---|---|---|
| 4 Sep 2026 | Initial repository | Senthil |
| 12 Sep | Architecture, API spec, Worth Score doc; Deva deployment files | Senthil docs; Deva commit `b0677c1` |
| 14 Sep | Initial frontend scaffold and screens list | Rubashree |
| 26 Sep | Auth/email verification/RBAC; DB models + hackathon read API (branch); auth pages + onboarding; importer first committed | Berwin; Nandhini (branch); Rubashree; Nandhini commit containing Gokul's importer |
| 27 Sep | Backend structure, Docker, CI | Senthil |
| 1 Oct | Teams CRUD, discovery, staging blueprint | Senthil |
| 3 Oct | Profile/skills/avatar, save/register/notes, dashboard summary | Berwin |
| 10 Oct | OAuth, security hardening, account lifecycle; production ops; frontend Week 1 merged (PR #3) | Berwin; Senthil; Rubashree |
| 11 Oct | Hackathon search/facets/caching/intake (branch) | Nandhini |
| 16 Oct | Admin APIs; Gitleaks CI | Berwin |
| 17 Oct | Reminders/notifications (branch); monorepo restructure; team collaboration + monitoring + load tests (PR #15) | Nandhini (branch); Senthil |
| 17 Oct | **PR #15 merged while CI was red; `main` CI still failing** | Repository state |
| After 17 Oct | No further work in repo | — |

### Plan week vs reality

| Plan week | Planned goal | Actual state |
|---|---|---|
| Week 1 — Build the base | Register/login + browse real hackathons on staging; CI/CD working | Auth and onboarding exist; **staging does not exist**; hackathon browsing is not mounted; CI is red. |
| Week 2 — Find & personalize | 6-platform data, search/filter/save, dashboard, profile, recommendations, Worth Score v1 | Data/search exist only on an unmerged branch; profile APIs exist; **dashboard is a placeholder**; no recommendations/score. |
| Week 3 — Connect & collaborate | Teammates, teams, requests, calendar/reminders, instant notifications | Team backend and notifications are done; **no team/calendar/reminder UI**; reminders are on an unmerged branch. |
| Week 4 — Polish & launch | Security, speed, re-test, student trial, monitoring, backups, go-live | Monitoring/deploy artifacts exist; **no successful deploy**, no ZAP/Lighthouse/axe, no student trial, no go/no-go. |

---

## 6. Launch checklist status

| Checklist item | Status | Evidence |
|---|---|---|
| All must-do tasks finished; no open serious bugs | ❌ | ~37% EP credit; core discovery/dashboard/score/reminders missing. |
| OWASP checklist done; ZAP fixed; secrets scan clean | ❌ | No OWASP/ZAP evidence; Gitleaks fails on leaked `BRABBLE_API_KEY`. |
| Lighthouse 90+ and no critical axe issues | ❌ | No Lighthouse/axe run or report. |
| 95% of API requests <300 ms in load test | ❌ | k6 scenarios never executed; no measurements. |
| Atlas backups on and restore tested | ❌ | Runbook/script exist; no execution evidence. |
| Sentry, uptime monitoring, alerts working | ⚪/🟡 | Code/docs exist; no Sentry projects, uptime secrets, Slack webhook, or workflow runs verified. |
| Collectors scheduled, healthy, alerting | ❌ | Single on-demand Brabble importer; no schedule/alerts. |
| Terms, Privacy, cookie consent, source credit | ❌ | No legal/consent pages. |
| Rollback plan practiced; go/no-go held | ❌ | Docs exist; no drill record or go/no-go. |
| Someone on call for 48h | ❌ | No evidence. |

---

## 7. What must happen next (priority order)

1. **Security first (Berwin + Nandhini):** rotate the exposed `BRABBLE_API_KEY`; remove the secret from git history (or record a reviewed, time-limited baseline only after rotation); make Gitleaks green. Do not merge further work until this is clean.
2. **Create the missing delivery path (Senthil):** create `develop`, protect `main` and `develop`, create the `staging` GitHub environment and secrets, and run one successful staging deploy. Configure required reviewers on `production`.
3. **Integrate Nandhini's backend (Nandhini + Senthil):** open a PR, port `backend/` modules into `apps/api`, resolve duplicate auth with Berwin, mount `/hackathons`, `/notifications`, `/reminders`, and add a health endpoint. Do not leave this branch unmerged.
4. **Wire the core product (Lalitha + Divyashree + Rubashree):** build listing/detail, search/filter, profile, dashboard, calendar, team finder, requests inbox and notification bell against the now-available APIs. Start with fake data where APIs are still missing.
5. **Implement the differentiator (Selva):** replace the design-only score with a tested `calcWorthScore`, `/hackathons/:id/score`, `/recommendations`, and a real skills/domain taxonomy (~150 skills/20 domains) with aliases and a tag extractor.
6. **Fix data collection (Gokul):** replace the single Brabble call with source-specific collectors or clearly documented approved feeds for all six platforms, add scheduling, dedupe, quarantine, run history and data-quality metrics.
7. **Build the quality gate (Deva):** add frontend test runner, Playwright E2E for the two core journeys, API contract tests, accessibility checks, OWASP ZAP, Lighthouse, and execute k6 against staging with a written report and tuning changes.
8. **Mount the admin APIs (Berwin):** add `/api/admin/*` to `apps/api/src/app.js` and test the routes; currently they exist only in the unused legacy server.
9. **Complete release operations (Senthil + Deva):** set Render/Vercel/Sentry/uptime secrets, perform a live deploy, practice rollback, run the backup/restore drill, and record the go/no-go.

---

## 8. Evidence appendix

**Repository / history**
- `main` HEAD: `6ab7b29` (merge of PR #15).
- Person commit counts (all refs): Senthil 64, Berwin 18, Nandhini 5, Rubashree 4, Deva 1, Lalitha 0, Divyashree 0, Gokul 0, Selva 0.
- Nandhini's work: `origin/nandhini-backend`; commits `27555af` (26 Sep), `8f56db4` (11 Oct), `d50eb35` (17 Oct); no PR; not contained in `main`.
- Deva's work: `b0677c1` (12 Sep) deployment files; PR #1 closed unmerged.

**CI / delivery**
- Run `39032789318` on `main`: frontend success, backend success, Gitleaks failure.
- Gitleaks finding: `data_importer/.env`, commit `27555af`, rule `generic-api-key`; key value redacted here.
- Run `39032789284` (Deploy production): fails with `Missing RENDER_API_KEY_PRODUCTION`.
- No “Deploy to staging” runs in Actions.
- No uptime-workflow runs recorded yet.
- `main` branch protection API: `404 Branch not protected`.
- `develop` branch: absent.
- GitHub environments: only `production`; `protection_rules: []`.

**Code**
- Active API entrypoint: `apps/api/package.json` → `node src/server.js`; `src/app.js` mounts auth, saved, users, dashboard, teams, requests, discovery, notifications; **no `/hackathons` and no `/api/admin`**.
- `apps/backend-prototype/server.js` mounts `/api/hackathons`, but the package is separate and not installed by the workspace start path.
- `apps/api/openapi.yaml` documents auth, teams and `/users/discover`; profile/saved/dashboard/hackathons are undocumented.
- Frontend: `apps/web/src/App.jsx` routes only auth, onboarding, dashboard; `Dashboard.jsx` is a placeholder.
- No frontend test script; no Playwright/Cypress/E2E; no Storybook/TanStack Query/MSW.
- `docs/WORTH_SCORE.md` only; `apps/api/utils/skillTaxonomy.js` has 18 skills in 5 categories.
- `tools/data-importer/import_hackathons.py` fetches from `https://brabble.ai/api/listings`.

**Verification performed for this audit**
- `npm run check` on `main`: passes locally (51 backend tests, web lint/build).
- GitHub Actions on `main`: backend and frontend jobs pass; Gitleaks fails.
- No production/staging deployment could be verified because the required secrets and environments are absent.

---

## 9. Limitations of this audit

- **External/manual work is invisible:** Figma files, meetings, demos, manual browser testing, student trials, and provider dashboards (Sentry, Render, Vercel, Atlas) may exist without repository evidence. They are marked “not verifiable”, not “not done”.
- **“Completed” is judged from repository state, not intent.** Code on an unmerged branch is counted as delivered-on-branch and zero integrated.
- **EP credit is an estimate** using the plan's EP values with partial = 50%; it is not an official project metric.
- **Docker image and k6 runs were not executed in this audit environment**, so those artifacts were validated structurally (YAML/JSON/syntax), not by execution.
- The audit reflects the repository at `6ab7b29` on 17 October 2026; later commits can change every conclusion.
