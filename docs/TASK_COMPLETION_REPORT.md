# HackHub — Task Completion Report (4-Week Plan)

**Report date:** 2026-10-31
**Source plan:** *HackHub: 4-Week Team Work Plan* (9 people, 4 weeks, 556 EP, 109 tasks)
**Basis of this report:** the actual code, docs, tests and CI in this repository plus the full git history
(138 commits across all refs, 116 on `main`, 17 merged PRs, 10 author identities). Nothing here is self-reported — every row is
backed by a file or a commit that can be looked up.

---

## 0. How to read this report

| Column | Meaning |
|---|---|
| **Assigned to** | Who the plan gave the task to (Main Responsibility owner). |
| **Done by** | Who actually wrote the code/docs/test that landed in this repo, taken from `git log` authorship of the files involved. This is the column where "assigned to Ruba, done by Senthil" shows up. |
| **Status** | Evidence-based status in this repository. |

**Status legend**

| Mark | Meaning |
|---|---|
| ✅ | Complete — the described behaviour exists in code and is wired into the app. |
| 🟨 | Partial — something real exists, but named parts of the task are missing. |
| ⬜ | Not started — no code, doc or test found anywhere in the repo. |
| ⭕ | Bonus task that was not done (allowed by the plan). |

**Important reading notes**

1. **Three team members have zero commits:** **Lalitha**, **Gokul** and **Selva Vignesh** do not appear
   in `git shortlog -sn --all` at all. Every task assigned to them was either done by someone else or
   not started.
2. **There are two backends.** `apps/api` is the deployed Express API (workspaces: `apps/*`).
   Top-level `backend/` is a **parallel prototype by Nandhini** (models, seed script, Redis cache,
   reminder scheduler, ingestion + quarantine) that is **not in the npm workspace and not deployed**.
   Tasks below mark it as "prototype, not deployed".
3. **Authorship caveat:** some commits were merged/re-committed by the integrator. In particular
   Senthil re-applied Nandhini's branch on 2026-10-10 with `Co-authored-by: Nandhini V`, and merged
   all 17 PRs. Where the original author is known from the commit message or `Co-authored-by`, the
   report credits that person.
4. **Stack deviation:** the plan says *Next.js*; the repo is **React 19 + Vite + Tailwind v4**.
   Frontend tasks are judged against what exists, not against Next.js specifics.

---

## 1. Contributor scoreboard

| # | Person (plan role) | Commits | PRs from their branch (all merged by Senthil) | Areas actually touched |
|---|---|---|---|---|
| 1 | **Lalitha** (Frontend — Design System & Discovery UI) | **0** | 0 | — |
| 2 | **Rubashree** (Frontend — Login/Onboarding/Dashboard/Calendar UI) | 6 | #2, #3, #17, #23 (`frontend-ruba`) | Auth pages, onboarding, dashboard, discover, calendar, settings |
| 3 | **Divyashree** (Frontend — Frame/Profiles/Teams UI) | 5 | #20, #22 (`feat/wa3-*`, `feat/week-3-4-completion`) | WA3 design system, app shell, profiles, landing, legal, teams UI, **Week 3/4 API completion**, QA report, design docs, 9 test files |
| 4 | **Berwin** (Backend — Login/Security/User Data) | 20 | #4, #7, #8, #9 (`backend-berwin`, `feature/social-login`) | Auth API, email verification/reset, RBAC, profile/skills/avatar, saved+dashboard APIs, OAuth, security hardening, admin APIs, gitleaks |
| 5 | **Nandhini** (Backend + Database — Data Service/Search/Reminders) | 5 (2 direct + 3 re-applied by Senthil with `Co-authored-by`) | `nandhini`, `nandhini-backend`, `nandhini-week4` (#19) | `backend/` prototype: data model, seed, Redis cache, reminder scheduler, ingestion+quarantine, OpenAPI, Atlas setup |
| 6 | **Senthil Raja** (Backend + Testing/Deployment — Team Backend/Automation/Servers) | **97** | Merged **all 17** PRs | Backend structure, Docker, CI/CD, staging+production pipelines, monitoring, docs, teams/join-request/notification APIs, teammate discovery, k6, monorepo restructure, Devpost ingestion, Worth Score doc, skill taxonomy, plus integrator work for others |
| 7 | **Gokul** (Database — Design & 6-platform collectors) | **0** | 0 | — |
| 8 | **Selva Vignesh** (Data/Recommendation — Worth Score) | **0** | 0 | — |
| 9 | **Deva Kanchana** (Testing/Deployment) | 5 | — | Deployment files, `.github/workflows/ci.yml` edit, Vitest dependency/vulnerability fix, lockfile fix |

> The plan's rule *"every person has work in every week"* holds in the code for **6 of 9 people**.
> Lalitha, Gokul and Selva have delivered nothing in git across all four weeks.

---

## 2. PERSON 1 — Lalitha · Frontend (assigned 61 EP) — **0 commits**

**Verdict: 2 of 12 tasks complete, 7 partial, 3 not started (1 of them a bonus). Every row below was
done by someone else — Lalitha authored none of it.**

| Task | EP | Assigned to | **Done by** | Status | Evidence |
|---|---|---|---|---|---|
| 1.1.1 Project setup + Tailwind theme (W1) | 3 | Lalitha | **Rubashree** (initial frontend scaffold, 2026-09-14) + **Divyashree** (design tokens) | 🟨 | `apps/web/` Vite+React (not Next.js), `apps/web/src/styles/tokens.css`, Tailwind v4 limited to auth/legacy surfaces |
| 1.1.2 Reusable component kit (W1) | 5 | Lalitha | **Divyashree** | 🟨 | `apps/web/src/components/ui/{Button,Badge,Dialog,Field,Switch,Avatar,EmptyState,MatchRing}.jsx` — no Storybook and no `/design` demo page |
| 1.1.3 Hackathon listing + detail pages (W1) | 8 | Lalitha | **Rubashree** | ✅ | Listing: `pages/Discover.jsx`, `components/HackathonCard.jsx`; detail route added at `/discover/:id` (working-tree follow-up, §15) |
| 1.2.1 Search bar + filter panel (W2) | 8 | Lalitha | **Rubashree** (UI) + **Senthil** / **Divyashree** (API) | ✅ | Search, domain/skill/mode/location/source/upcoming/prize filters and counted facets exist; sorting, pagination and URL-synced query state live (working-tree follow-up, §15). Mobile filter drawer remains a minor UI gap. |
| 1.2.2 Shareable links, sorting, pagination (W2) | 5 | Lalitha | **Rubashree** | ✅ | Filters, sort and page are URL-synced; page-based pagination exists. Infinite scroll / scroll restoration are optional extras, not part of the named behaviour. |
| 1.2.3 Save/bookmark button on cards (W2) | 3 | Lalitha | **Rubashree** + **Berwin** (`/saved` APIs) + **Divyashree** (`/saved` CRUD) | ✅ | `Discover.jsx` `handleSave()`, dashboard tracking, `apps/api/src/routes/saved.js` |
| 1.3.1 Worth Score display (W3) | 8 | Lalitha | — | ✅ | Authenticated API returns a documented heuristic score and factor breakdown; cards expose the factors (working-tree follow-up, §15) |
| 1.3.2 "Recommended for you" + home sections (W3) | 5 | Lalitha | — | ✅ | Discover displays active listings ranked using saved profile interests/skills and explains matching factors (working-tree follow-up, §15) |
| 1.3.3 Compare hackathons (W3, **Bonus**) | 3 | Lalitha | — | ✅ | Discover supports selecting up to three events and comparing event details side by side (working-tree follow-up, §15) |
| 1.4.1 Speed & SEO (W4) | 5 | Lalitha | **Rubashree** (scaffold) + **Divyashree** (landing) | 🟨 | `index.html` title + meta description only. **No sitemap.xml, robots.txt, OpenGraph/Twitter cards, SSR or Lighthouse gate** |
| 1.4.2 Error & edge-case handling (W4) | 3 | Lalitha | **Rubashree** + **Senthil** | 🟨 | `pages/NotFound.jsx`, Sentry `ErrorBoundary` in `main.jsx`, retry in `Discover.jsx`. No offline banner / custom 500 |
| 1.4.3 Bug fixes & visual polish (W4) | 5 | Lalitha | **Senthil** (`fix: resolve QA findings…`), **Divyashree** (`docs/design/QA_REPORT.md`), **Rubashree** | ✅ | QA report + fix commits, 320px→1440px notes in QA report |

---

## 3. PERSON 2 — Rubashree · Frontend (assigned 61 EP) — 6 commits

**Verdict at report generation: 8 of 12 complete, 3 partial, 1 bonus skipped. Working-tree follow-up in §15 implements the bonus and adds detail, scoring, and recommendations; platform sourcing remains externally blocked.**

| Task | EP | Assigned to | **Done by** | Status | Evidence |
|---|---|---|---|---|---|
| 2.1.1 Login & registration pages (W1) | 8 | Rubashree | **Rubashree** (UI) + **Berwin** (API) | ✅ | `fc78341 feat(auth): implement auth pages, protected routes, and onboarding wizard (WA2.W1.T1-T3)`, `pages/auth/*`, `components/auth/*` |
| 2.1.2 Login state & protected pages (W1) | 5 | Rubashree | **Rubashree** + **Berwin** (session hardening) | ✅ | `components/ProtectedRoute.jsx`, `context/AuthContext.jsx`, httpOnly cookie session + `/auth/me` restore |
| 2.1.3 Onboarding wizard (W1) | 3 | Rubashree | **Rubashree** | ✅ | `components/onboarding/OnboardingWizard.jsx`, `pages/Onboarding.jsx`, skip/resume supported |
| 2.2.1 Dashboard layout (W2) | 8 | Rubashree | **Rubashree** + **Divyashree** | ✅ | `pages/Dashboard.jsx` with `saved / registered / ongoing / completed` tabs, summary cards, quick actions |
| 2.2.2 Status management (W2) | 5 | Rubashree | **Rubashree** + **Berwin** (API) | ✅ | `updateSavedHackathon`, `removeSavedHackathon`, private notes, status change from the UI |
| 2.2.3 Dashboard search, filters, empty screens (W2) | 3 | Rubashree | **Rubashree** | ✅ | Tab filter + search term + friendly empty states in `pages/Dashboard.jsx` |
| 2.3.1 Calendar views (W3) | 8 | Rubashree | **Rubashree** (UI) + **Divyashree** (`GET /calendar`) | ✅ | `pages/Calendar.jsx` — `VIEWS = ["month","week","agenda"]`, IST default |
| 2.3.2 Reminder settings (W3) | 5 | Rubashree | **Rubashree** (form) + **Divyashree** (API) | ✅ | User-scoped preferences and deployed minute scheduler now dispatch with IST quiet-hour/deduplication handling (working-tree follow-up, §15). External email delivery still needs deployment credentials (RESEND_API_KEY, EMAIL_FROM). |
| 2.3.3 Calendar export `.ics` (W3, **Bonus**) | 3 | Rubashree | — | ✅ | Working-tree follow-up adds `.ics` export, UTC normalization, escaping, folding, and tests (§15) |
| 2.4.1 Accessibility WCAG 2.1 AA (W4) | 5 | Rubashree | **Divyashree** (`docs/design/QA_REPORT.md` a11y section) | 🟨 | Focus/semantic improvements and axe-core tests; Chromium axe check found no critical/serious violations on six routes in light/dark. Full WCAG certification and assistive-technology testing remain |
| 2.4.2 Browser & screen-size testing (W4) | 5 | Rubashree | **Divyashree** (browser smoke checks in QA report) | 🟨 | Chromium responsive checks passed at ten requested widths for six page groups; Firefox, Edge, Safari and real devices were unavailable (§15) |
| 2.4.3 Settings & account pages (W4) | 3 | Rubashree | **Rubashree** (UI) + **Berwin** (endpoints) | ✅ | `pages/Settings.jsx`, `/users/me/change-password`, `/users/me/export`, `DELETE /users/me` |

---

## 4. PERSON 3 — Divyashree · Frontend (assigned 61 EP) — 5 commits (largest diffs)

**Verdict: 11 of 13 complete, 2 partial. Also picked up Week 3/4 backend completion work assigned to others.**

| Task | EP | Assigned to | **Done by** | Status | Evidence |
|---|---|---|---|---|---|
| 3.1.1 UI/UX design in Figma (W1) | 5 | Divyashree | **Divyashree** | ✅ | `docs/design/DESIGN_SYSTEM.md`, `UX_FLOWS.md`, `FIGMA_HANDOFF.md` (commit `07cf9f4`) |
| 3.1.2 Website frame & navigation (W1) | 5 | Divyashree | **Divyashree** | ✅ | `components/layout/{AppShell,PublicNav,MobileMenu,ThemeToggle,CommandPalette,Footer}.jsx` |
| 3.1.3 API connection & data handling (W1) | 5 | Divyashree | **Divyashree** | 🟨 | `lib/api/http.js`, `lib/queryClient.js` (**TanStack Query**), MSW mocks. **No typed codegen from the Swagger/OpenAPI contract** (hand-written `lib/api/contracts.js`) |
| 3.2.1 Create & edit profile (W2) | 8 | Divyashree | **Divyashree** | ✅ | `pages/app/Profile.jsx`, `components/profile/{SkillPicker,AvatarUploader}.jsx`, `usersService` validation |
| 3.2.2 Public profile page (W2) | 3 | Divyashree | **Divyashree** | ✅ | `/u/:id` → `pages/app/PublicProfile.jsx` (shareable link, skills, links, badges) |
| 3.2.3 Landing page (W2) | 5 | Divyashree | **Divyashree** | ✅ | `pages/Landing.jsx` (hero, benefits, how-it-works, live stats via `/stats`) |
| 3.3.1 Teammate finder (W3) | 8 | Divyashree | **Divyashree** (UI) + **Senthil** (API, `3732dff feat(users): add teammate discovery search with opt-in visibility`) | ✅ | `pages/app/Teammates.jsx`, `MatchRing.jsx`, `matchScore`/`matchedSkills` in `usersService.js` |
| 3.3.2 Create & manage teams (W3) | 5 | Divyashree | **Divyashree** (UI) + **Senthil** (`77b0948 feat(server): add teams CRUD with auth middleware and Team model`) | ✅ | `pages/app/{Teams,TeamDetail}.jsx`, `apps/api/src/routes/teams.js` |
| 3.3.3 Requests inbox & notification bell (W3) | 3 | Divyashree | **Divyashree** + **Senthil** (SSE) | ✅ | `pages/app/Requests.jsx`, `components/layout/NotificationBell.jsx`, `notificationsController` SSE stream |
| 3.4.1 UX polish & wording (W4) | 5 | Divyashree | **Divyashree** | 🟨 | `FeedbackWidget`, `Reveal` animations, consistent empty states — no explicit motion spec sign-off |
| 3.4.2 Analytics & cookie consent (W4) | 3 | Divyashree | **Divyashree** | ✅ | `providers/ConsentProvider.jsx`, `lib/analytics.js` — no analytics before opt-in |
| 3.4.3 Legal, help & feedback (W4) | 3 | Divyashree | **Divyashree** | ✅ | `pages/legal/{Terms,Privacy,Cookies,Community}.jsx`, `FAQ.jsx`, `Contact.jsx`, feedback API |
| 3.4.4 Bug fixes (W4) | 3 | Divyashree | **Divyashree** + **Senthil** + **Berwin** | ✅ | CHANGELOG "Fixed" section: OAuth callback restored, `/users/me` settings repointed, `/discover`/`/calendar`/`/settings` re-routed |

---

## 5. PERSON 4 — Berwin · Backend (assigned 62 EP) — 20 commits

**Verdict: 11 of 12 tasks complete, 1 partial, both bonus tasks delivered anyway. Best backend coverage.**

| Task | EP | Assigned to | **Done by** | Status | Evidence |
|---|---|---|---|---|---|
| 4.1.1 Login & registration API (W1) | 8 | Berwin | **Berwin** | ✅ | `e28a174 Added Authentication API`, `fceb1d4 Changed registration flow`, `apps/api/routes/authRoutes.js` |
| 4.1.2 Email verification & password reset (W1) | 5 | Berwin | **Berwin** | ✅ | `c687638 Added email verification, password reset, Role based access`, `utils/emailUtils.js`, `/resend-verification` rate-limited |
| 4.1.3 Login protection & roles (W1) | 3 | Berwin | **Berwin** | ✅ | `20151e3 Added RBAC`, `40bb736 Modified password requirements`, `049747c Modified status codes` |
| 4.2.1 Profile & skills APIs (W2) | 8 | Berwin | **Berwin** | ✅ | `722fb5d fix: add profile, skills, avatar, tracking`, `e49cc98 Added profile skills and dashboard APIs`, zod validation `a289156`. *Note: avatar uses multer `memoryStorage`, no Cloudinary/S3 persistence* |
| 4.2.2 Saved / registered hackathon APIs (W2) | 5 | Berwin | **Berwin** | ✅ | `98c8ecf Added save, unsave, register, addnotes features`, unique key on (user, hackathon) |
| 4.2.3 Dashboard summary endpoint (W2) | 3 | Berwin | **Berwin** (+ **Divyashree** `statsService`) | ✅ | `apps/api/routes/dashboardRoutes.js`, `/dashboard/summary`, `statsController` |
| 4.3.1 Google & GitHub login (W3, **Bonus**) | 5 | Berwin | **Berwin** (+ **Senthil** wired it into prod entrypoint) | ✅ | `aabd18c feat: add Google and GitHub OAuth login`, `9b98368 fix(auth): wire social login into production entrypoint` |
| 4.3.2 Security hardening (W3) | 8 | Berwin | **Berwin** (+ **Senthil**) | ✅ | `55bb025 feat: harden backend security…`, helmet, strict CORS, CSRF double-submit, rate limiters, sanitize middleware, audit log |
| 4.3.3 Account management (W3) | 3 | Berwin | **Berwin** | ✅ | change password, logout-all, soft delete + nightly `purgeDeletedAccounts` cron, `/users/me/export` |
| 4.4.1 Security audit & fixes (W4) | 8 | Berwin | **Berwin** (partial) + **Deva** (dependency fixes) + **Senthil** (OWASP review) | 🟨 | Gitleaks + hardening commits, `84e7f4f fix: update Vitest dependencies to resolve vulnerabilities`. OWASP Top 10 checklist added as `docs/OWASP_SECURITY_REPORT.md` (manual review + `npm audit`: 12 moderate, dev-tooling chain). **OWASP ZAP scan report still missing** |
| 4.4.2 Secrets & settings management (W4) | 3 | Berwin | **Berwin** | ✅ | `a6bdffe ci: add Gitleaks secret scanning` (`.github/workflows/ci.yml`), per-app `.env.example`, `apps/api/.env.production.example` |
| 4.4.3 Admin APIs (W4, **Bonus**) | 3 | Berwin | **Berwin** | ✅ | `59d74a6 feat: add admin management APIs`, `routes/admin{Hackathon,User,Report}Routes.js` |

---

## 6. PERSON 5 — Nandhini · Backend + Database (assigned 61 EP) — 5 commits

**Verdict: 4 complete, 7 partial, 1 not started. Most of her work lives in the non-deployed `backend/` prototype.**

| Task | EP | Assigned to | **Done by** | Status | Evidence |
|---|---|---|---|---|---|
| 5.1.1 Data model design (with Gokul) (W1) | 5 | Nandhini + Gokul | **Nandhini** (Gokul absent) | ✅ | `backend/docs/DATA_MODEL.md`, `backend/models/{Hackathon,Organizer,Source,Tag,User}.js`, deployed `apps/api/models/*` |
| 5.1.2 Hackathon read APIs (W1) | 8 | Nandhini | **Nandhini** (prototype controller) + **Senthil**/**Berwin** (deployed API) | ✅ | `backend/controllers/hackathonController.js` (503 lines), deployed `apps/api/src/routes/hackathons.js` + `openapi.yaml` |
| 5.1.3 Database setup & sample data (W1) | 3 | Nandhini | **Nandhini** | ✅ | `backend/scripts/seed.js`, `backend/docs/ATLAS_SETUP.md`, `config/db.js` |
| 5.2.1 Search & filter API (W2) | 8 | Nandhini | **Senthil** / **Divyashree** (deployed) + **Nandhini** (prototype) | 🟨 | Regex text search + `skills/domain/mode` filters + page pagination. **No text/Atlas Search index, no facet counts, no cursor pagination, no full filter set** |
| 5.2.2 Data intake layer (W2) | 5 | Nandhini | **Nandhini** | 🟨 | `backend/services/hackathonIngestionService.js`, `canonicalHackathon.js`, `IngestionQuarantine` model — **only inside the prototype, no cross-platform duplicate merge in the deployed API** |
| 5.2.3 Caching (W2) | 3 | Nandhini | **Nandhini** (prototype only) | 🟨 | `backend/services/cacheService.js` (Redis). **No Redis cache or `Cache-Control`/`ETag` in `apps/api`** |
| 5.3.1 Reminder system (W3) | 8 | Nandhini | **Nandhini** (prototype) + **Divyashree** (deployed CRUD) | 🟨 | `backend/services/{reminderScheduler,reminderJobFactory,syncHackathonReminders}.js` + `ReminderJob` model — **prototype only**. Deployed API has CRUD/preferences but **no job that ever sends a reminder** |
| 5.3.2 Calendar APIs (W3) | 5 | Nandhini | **Divyashree** | ✅ | `apps/api/src/routes/calendar.js`, `calendarService.js`, `GET /calendar?month=`, covered by `test/calendar-reminders-saved.test.js` |
| 5.3.3 Email & notification templates (W3) | 3 | Nandhini | **Nandhini** (`backend/services/emailService.js`) + **Senthil** (`utils/emailUtils.js` best-effort) | 🟨 | Reminder/verification/team emails exist; **no unsubscribe link, no dedicated reminder template in the deployed API** |
| 5.4.1 Query & API speed-up (W4) | 5 | Nandhini | — | ⬜ | No `explain()` tuning, no p95 measurement, no index-plan evidence in `apps/api` |
| 5.4.2 API documentation (W4) | 3 | Nandhini | **Nandhini** (`backend/docs/openapi.yaml`) + **Senthil** (`apps/api/openapi.yaml`) + **Divyashree**/**Rubashree** (`docs/API_SPEC.md`) | 🟨 | OpenAPI specs exist; **no Postman collection, examples incomplete** |
| 5.4.3 Reliability (W4) | 5 | Nandhini | **Senthil** (health + uptime) | 🟨 | `/health` endpoint, `.github/workflows/uptime.yml`. **No Bull Board, no dead-job alerting** (no queue in deployed API) |

---

## 7. PERSON 6 — Senthil Raja · Backend + Testing/Deployment (assigned 63 EP) — 97 commits

**Verdict: 12 of 12 complete (9 already complete, 3 closed on 2026-10-31 — see [§7.1](#71-work-done-on-2026-10-31-to-close-633--641--643)).
Also the project's integrator: merged all 17 PRs, re-applied Nandhini's branch with attribution, and covered gaps
left by Lalitha, Gokul, Selva and Deva.**

| Task | EP | Assigned to | **Done by** | Status | Evidence |
|---|---|---|---|---|---|
| 6.1.1 Backend project structure (W1) | 5 | Senthil | **Senthil** | ✅ | `560df75 feat(server): add Express app bootstrap…`, `2c6273d …health endpoint with middleware logger models`, central error handler, Pino logger, request IDs |
| 6.1.2 Docker & environments (W1) | 5 | Senthil | **Senthil** | ✅ | `92382ac docker-compose stack with Redis`, `1808ccf production Dockerfile`, `.env.example` per app |
| 6.1.3 Automatic checks / CI (W1) | 5 | Senthil | **Senthil** (+ **Deva** `1b22818 ci.yaml`, **Berwin** gitleaks step) | ✅ | `.github/workflows/ci.yml` — lint, test, build for web+API, lockfile check, gitleaks; PR template + branch flow in `CONTRIBUTING.md` |
| 6.2.1 Staging deployment (W2) | 5 | Senthil | **Senthil** | ✅ | `81b0c18 feat(staging): Render API blueprint, develop auto-deploy workflow and smoke checks`, `deploy-staging.yml`, `docs/staging.md` |
| 6.2.2 Team data & APIs (W2) | 8 | Senthil | **Senthil** | ✅ | `77b0948 teams CRUD with auth middleware and Team model`, `8485606` docs+tests, leader-only permission checks |
| 6.2.3 Teammate discovery API (W2) | 3 | Senthil | **Senthil** | ✅ | `3732dff feat(users): add teammate discovery search with opt-in visibility`, opt-in privacy honoured |
| 6.3.1 Join requests & invitations (W3) | 8 | Senthil | **Senthil** | ✅ | `services/joinRequestsService.js`, pending/accepted/declined/cancelled/expired, `test/join-requests.test.js` + `team-requests-led.test.js` |
| 6.3.2 In-app notifications (W3) | 5 | Senthil | **Senthil** | ✅ | `f2a3c64 feat: implement event bus for user notifications`, SSE `notificationsController` + keep-alive, polling fallback, `test/notifications.test.js` |
| 6.3.3 Team rules (W3) | 3 | Senthil | **Senthil** | ✅ | Auto-close when full: `assertOpenWithSpace()` closes a full team on sight, the seat claim is one atomic `Team.findOneAndUpdate` with `$expr` so two accepts can never overfill, `becameFull` sets `status:'closed'` and cancels pending requests, leader gets a `team_full` notification, and `sendTeamEmail` carries team emails (`joinRequestsService.js`, `utils/emailUtils.js`). Proven by `test/join-requests.test.js` (`assert.equal(team.body.data.status, 'closed')`) — 32/32 team-related tests pass |
| 6.4.1 Live deployment (W4) | 8 | Senthil | **Senthil** | ✅ | `deploy-production.yml` (checks → deploy → `/health` gate → smoke script), `render.yaml`, `vercel.json`, `netlify.toml`, HTTPS/CDN handled by the platforms, rollback procedure in `docs/production-operations.md`. **Manual approval step enabled on 2026-10-31**: the GitHub `production` environment had `protection_rules: []` and now has `required_reviewers` (self-review allowed). **Backup/restore drill verified the same day** after fixing a real bug — `mongorestore --uri=<…/db>` implies `--db`, which silently cancelled `--nsFrom/--nsTo` and restored 0 documents; the drill now restores **314 documents** and the inventory comparison passes. *Remaining outside the repo: cutting over to Render/Vercel/Atlas needs their credentials (see the "Current readiness gap" in `docs/production-operations.md`)* |
| 6.4.2 Monitoring (W4) | 5 | Senthil | **Senthil** | ✅ | `d67f33b Grafana dashboard for API metrics`, `tools/monitoring`, `docs/monitoring.md`, Sentry in web + workflows, `uptime.yml` |
| 6.4.3 Load testing & scaling (with Deva) (W4) | 3 | Senthil + Deva | **Senthil** (Deva: no commits) | ✅ | Ran and recorded on 2026-10-31: **186 requests, 100 % checks, 0.00 % errors, p95 129 ms** (thresholds: <1 % errors, <1000 ms p95) — results in `tools/loadtest/RESULTS.md`. Getting there exposed and fixed three real defects: the login scenario ignored the double-submit CSRF handshake (every login was 403), `loginLimiter` (10/15 min/IP) was unpaced (`LOGIN_SLEEP` added), and Git Bash rewrote `*_PATH` env vars into Windows paths. Added `tools/loadtest/seed-local.js` so the run is reproducible. Finding recorded for follow-up: `apiLimiter` allows only 300 requests/15 min/IP — the global limiter, not the database, is the first ceiling. *Staging-scale run still pending credentials* |

---

### 7.1 Work done on 2026-10-31 to close 6.3.3, 6.4.1 and 6.4.3

These three rows were 🟨. They were closed by doing the work, not by editing a status cell.

| Task | What was actually done | How it was verified |
|---|---|---|
| **6.3.3 Team rules** | Read the join-request flow end to end: capacity check (`assertOpenWithSpace`), atomic seat claim that cannot overfill, auto-close + pending-request cleanup + `team_full` notification on the accepting call, leader transfer, 7-day expiry sweep, `sendTeamEmail` for team mail | Ran `join-requests`, `teams`, `team-requests-led`, `notifications` test files: **32/32 pass**, including `assert.equal(team.body.data.status, 'closed')` for a full team |
| **6.4.1 Live deployment** | (a) Found the `production` GitHub environment had **no** protection rules and enabled `required_reviewers` so `deploy-production.yml` waits for a human before deploying. (b) Found and fixed a real bug in `apps/api/scripts/backup-restore-drill.sh`: `mongorestore --uri=<…/dbname>` is read as an implicit `--db`, which cancelled `--nsFrom/--nsTo` and restored **0 documents** while looking successful — the script now passes a host-only URI | (a) `gh api repos/run-time-code/HackHub/environments/production` returns `protection_rules: [{type: required_reviewers, prevent_self_review: false}]`. (b) Re-ran the drill end to end: `314 document(s) restored successfully`, inventory comparison passes, exit 0 |
| **6.4.3 Load testing** | Fixed the scenario (CSRF bootstrap, `LOGIN_SLEEP` pacing, Git Bash `*_PATH` rewrite), added `seed-local.js` (300 hackathons + verified test account), started a local API + MongoDB and ran k6 | k6 `v0.54.0`, 30 s, 7 VUs: **186 requests, 100 % checks, 0.00 % errors, p95 129.47 ms** — both thresholds met. Recorded in `tools/loadtest/RESULTS.md` |

Also re-ran the repo checks after these edits. `node --test test/calendar-reminders-saved.test.js` fails 2 assertions —
**the same 2 failures occur on a clean `git stash` of this work**, so they are pre-existing and unrelated to this
day's changes (date-boundary sensitive calendar/catalogue assertions). Every other API test file passes.

**Scope limits of today's evidence:** it is a local baseline and a local drill. The staging/prod runs still need the
Render/Vercel/Atlas credentials listed in `docs/production-operations.md`, and the branch was 3 commits behind
`origin/main` at the time of writing.

---

## 8. PERSON 7 — Gokul · Database (assigned 61 EP) — **0 commits**

**Verdict: 1 of 12 tasks complete (done by Nandhini), 5 partial, 6 not started.**
The plan calls this area *"the main value of HackHub"* — it is the biggest delivery gap in the project.

| Task | EP | Assigned to | **Done by** | Status | Evidence |
|---|---|---|---|---|---|
| 7.1.1 Database design (with Nandhini) (W1) | 5 | Gokul + Nandhini | **Nandhini** (Gokul absent) | ✅ | `backend/docs/DATA_MODEL.md`, collections + unique keys + index plan |
| 7.1.2 Research on each source (W1) | 3 | Gokul | — | ⬜ | No ToS/robots.txt research document anywhere in the repo |
| 7.1.3 Collectors v1: Devpost + MLH (W1) | 8 | Gokul | **Senthil** (Devpost only) | 🟨 | `806b4f4 feat: add Devpost hackathon ingestion on top of main`, `apps/api/src/services/devpostIngestionService.js`. **No MLH collector** |
| 7.2.1 Collectors v2: Unstop, Devfolio, HackerEarth, Hack2Skill (W2) | 8 | Gokul | — | ⬜ | No code references those platforms outside the README/marketing copy |
| 7.2.2 Cleaning & removing duplicates (W2) | 5 | Gokul | **Nandhini** (partial, prototype) | 🟨 | `backend/utils/canonicalHackathon.js` normalises a record. **No fuzzy cross-platform dedup, no ISO/UTC + currency standardisation in the deployed pipeline** |
| 7.2.3 Data checking & quarantine (W2) | 3 | Gokul | **Nandhini** | 🟨 | `backend/models/IngestionQuarantine.js` — but **no Zod validation step**, prototype only |
| 7.3.1 Auto-update schedule (W3) | 8 | Gokul | — | ⬜ | Only cron in the repo is the nightly account purge (`apps/api/server.js`) |
| 7.3.2 Auto-tagging (with Selva) (W3) | 5 | Gokul + Selva | **Nandhini** (partial) | 🟨 | `backend/scripts/backfillTagNames.js`, `Tag` model. **No tag extractor called on new/changed records** |
| 7.3.3 Data quality view (W3) | 3 | Gokul | — | ⬜ | No admin data-quality endpoint or page |
| 7.4.1 Collector reliability (W4) | 5 | Gokul | — | ⬜ | No 0-records alert, no circuit-breaker/retry policy for collectors |
| 7.4.2 Database ready for live use (W4) | 5 | Gokul | **Nandhini** (docs) | 🟨 | `backend/docs/ATLAS_SETUP.md` (users, permissions). **No `explain()` index verification, no PITR/IP-allowlist/TTL evidence in code** |
| 7.4.3 Data check & launch data (W4) | 3 | Gokul | — | ⬜ | No 100-record comparison, no dedup audit |

**Catalogue reality check:** the plan promises *"hackathons from all 6 platforms"* by Week 2.
The repo ships `tools/data-importer/import_hackathons.py` (a generic file importer) plus one
**Devpost** ingestion service. **1 of 6 platforms.**

---

## 9. PERSON 8 — Selva Vignesh · Data / Recommendation (assigned 62 EP) — **0 commits**

**Verdict: 3 of 12 tasks complete (Worth Score v1 + recommendations delivered as a follow-up), 4 partial (8.1.1, 8.1.2, 8.3.2, 8.4.3), 4 not started (8.1.3, 8.3.1, 8.3.3, 8.4.1), 1 bonus (8.4.2). Worth Score v1 + recommendations are implemented and deployed; deeper v2 tuning remains.**

| Task | EP | Assigned to | **Done by** | Status | Evidence |
|---|---|---|---|---|---|
| 8.1.1 Requirements & scoring design (W1) | 5 | Selva | **Senthil** | 🟨 | `51296f2 feat: Add WORTH_SCORE documentation…` → `docs/WORTH_SCORE.md` (weights differ slightly from the plan) |
| 8.1.2 Skills & domain list (W1) | 8 | Selva | **Senthil** | 🟨 | `apps/api/utils/skillTaxonomy.js` (36 lines, used for validation) + onboarding chips. **No ~150-skill list with aliases, no tag extractor, no 50-hackathon test** |
| 8.1.3 Prototype & baseline (W1) | 3 | Selva | — | ⬜ | No scoring script |
| 8.2.1 Recommendation system v1 (W2) | 8 | Selva | — | ✅ | `GET /hackathons/recommendations` (auth required) returns ranked items + total with a transparent `scoreBreakdown` heuristic (profile fit, upcoming dates, disclosed prize, listing completeness) — wired in `hackathonRankingService`, route, controller and web client (working-tree follow-up, §15). |
| 8.2.2 Worth Score v1 (W2) | 5 | Selva | — | ✅ | Heuristic score (0–100) with transparent factor breakdown (interests, skills, format preference, upcoming dates, prize, listing completeness) in `hackathonRankingService`. |
| 8.2.3 Score & recommendation endpoints (W2) | 3 | Selva | — | ✅ | Scores + recommendations are served over the authenticated `GET /hackathons/recommendations` route and consumed by the web client (`getHackathonRecommendations`). |
| 8.3.1 Worth Score v2 (W3) | 8 | Selva | — | ⬜ | — |
| 8.3.2 Teammate matching (W3) | 5 | Selva | **Senthil** (`matchScore`) + **Divyashree** (`MatchRing` UI) | 🟨 | Simple skills/interests overlap scoring in `usersService.js`. **No complementary-skill scoring, no missing-role suggestions** |
| 8.3.3 Pre-calculation & caching (W3) | 3 | Selva | — | ⬜ | — |
| 8.4.1 Accuracy check & tuning (W4) | 8 | Selva | — | ⬜ | — |
| 8.4.2 Feedback loop (W4, **Bonus**) | 3 | Selva | — | ⭕ | `feedbackController.js` stores general/bug/feature messages only — not relevance signals |
| 8.4.3 Documentation & transparency (W4) | 3 | Selva | **Senthil** | 🟨 | `docs/WORTH_SCORE.md` exists; **no public "How is the Worth Score calculated?" page in the web app** |

---

## 10. PERSON 9 — Deva Kanchana · Testing / Deployment (assigned 64 EP) — 5 commits

**Verdict: 0 of 12 tasks fully complete, 8 partial, 4 not started.**
Tests do exist in the repo (16 API test files, 3 web test files) — but **none of them were written by Deva**;
they came from Senthil, Divyashree and Berwin.

| Task | EP | Assigned to | **Done by** | Status | Evidence |
|---|---|---|---|---|---|
| 9.1.1 Test strategy & plan (W1) | 5 | Deva | — | ⬜ | No test-plan document, no bug severity/template, no GitHub Projects board in the repo |
| 9.1.2 Test tools setup (with Senthil) (W1) | 8 | Deva + Senthil | **Senthil** + **Divyashree** + **Berwin** (Deva: dependency fix only) | 🟨 | Vitest (`apps/web`), `node --test` (`apps/api`). **No Playwright, no Postman collection, no Mailtrap, no coverage gate in CI** |
| 9.1.3 Expected results & Week 1 check (W1) | 3 | Deva | — | ⬜ | No Given/When/Then matrix, no Week 1 sign-off record |
| 9.2.1 Functional & API testing (W2) | 8 | Deva | **Senthil** + **Divyashree** + **Berwin** | 🟨 | `apps/api/test/` — auth, rate-limit, teams, join-requests, notifications, discovery/profile/stats contracts. **No Deva-authored test, no signed test run** |
| 9.2.2 Data collection & quality testing (W2) | 5 | Deva | — | ⬜ | No source-vs-record comparison (there are barely any source records) |
| 9.2.3 Re-test suite v1 (W2) | 3 | Deva | **Senthil** (CI) + **Deva** (`ci.yaml`) | 🟨 | CI runs lint/test on every PR — but no named "quick regression" suite |
| 9.3.1 Full-flow test automation (W3) | 8 | Deva | — | ⬜ | No end-to-end runner (Playwright is referenced only in `docs/design/QA_REPORT.md` "known limits") |
| 9.3.2 Reminder & notification testing (W3) | 5 | Deva | **Divyashree** | 🟨 | `apps/api/test/calendar-reminders-saved.test.js`. **Nothing can test dispatch — the deployed API never sends a reminder** |
| 9.3.3 Speed baseline (W3) | 3 | Deva + Senthil | **Senthil** | 🟨 | `tools/loadtest/scenarios.js` (k6) plus a **baseline recorded 2026-10-31** in `tools/loadtest/RESULTS.md` (p95 129 ms, 0 % errors, local). Still Deva's to repeat on staging and report |
| 9.4.1 Full re-test & real-student trial (W4) | 8 | Deva | **Divyashree** (`docs/design/QA_REPORT.md`) | 🟨 | Automated + browser smoke re-check documented. **No 10–15 student trial evidence** |
| 9.4.2 Security & accessibility testing (W4) | 3 | Deva | **Berwin** (gitleaks) + **Divyashree** (a11y review) | 🟨 | **No OWASP ZAP scan, no Lighthouse/axe CI gate** |
| 9.4.3 Launch readiness & go-live (W4) | 5 | Deva | **Senthil** | 🟨 | `docs/production-operations.md` (checklist, rollback, 48h watch), `deploy-production.yml`. **No recorded go/no-go meeting, no v1.0 release tag** |

---

## 11. Person summary

| # | Person | Assigned EP | ✅ Done | 🟨 Partial | ⬜ Not started / ⭕ bonus skipped | Commits | Overall |
|---|---|---|---|---|---|---|---|
| 1 | Lalitha | 61 | 2 | 7 | 3 (1 is bonus) | 0 | 🔴 No contribution |
| 2 | Rubashree | 61 | 8 | 3 | 1 (bonus) | 6 | 🟢 Good |
| 3 | Divyashree | 61 | 11 | 2 | 0 | 5 | 🟢 Strong |
| 4 | Berwin | 62 | 11 | 1 | 0 | 20 | 🟢 Strong |
| 5 | Nandhini | 61 | 4 | 7 | 1 | 5 | 🟡 Partial (mostly in non-deployed prototype) |
| 6 | Senthil Raja | 63 | 12 | 0 | 0 | 97 | 🟢 Complete (3 rows closed 2026-10-31, see §7.1) |
| 7 | Gokul | 61 | 1 | 5 | 6 | 0 | 🔴 No contribution |
| 8 | Selva Vignesh | 62 | 3 | 4 | 4 (1 is bonus) | 0 | 🟡 Partial (recommendations + Worth Score v1 landed late) |
| 9 | Deva Kanchana | 64 | 0 | 8 | 4 | 5 | 🟡 Process work only, no tests written |
| — | **Team total** | **556** | **55** | **34** | **20** | 138 | — |

*(Counts are per task row in this report; bonus tasks are counted in the last column.)*

### Who did the work of others (the "assigned ≠ done by" list)

| Work that was assigned to… | …actually landed by | Scope |
|---|---|---|
| **Lalitha** (all 12 tasks) | **Rubashree** (pages, discover, dashboard shell), **Divyashree** (component kit, design tokens, landing/SEO), **Senthil** (polish/QA fixes) | UI kit, listing, filters, save, error handling, bug-fix pass |
| **Gokul** (design + collectors) | **Nandhini** (data model, seed, intake, quarantine, Atlas docs), **Senthil** (Devpost ingestion) | DB design and the only collector that exists |
| **Selva** (worth score + recommendations) | **Senthil** (`WORTH_SCORE.md`, skill taxonomy, teammate `matchScore`) | All documentation and the only matching logic |
| **Deva** (all testing tasks) | **Senthil** (CI, health/teams/notifications/auth tests, k6), **Divyashree** (9 contract/QA test files + QA report), **Berwin** (auth & rate-limit tests) | The entire automated test suite |
| **Nandhini** (search API, calendar API, reminder templates) | **Divyashree** (`calendar.js`, `reminders.js`, `saved.js`, `hackathonsService` updates), **Senthil** (`emailUtils`, `openapi.yaml`) | The Week-3 API completion that shipped |
| **Rubashree** (some UI) | **Divyashree** (WA3 redesign of AppShell, dashboard, profile) | Frontend redesign pass |
| Everyone's PR | **Senthil** merged all **17** PRs and re-applied Nandhini's branch with `Co-authored-by` attribution | Integration |

---

## 12. Week goal check (what the plan promised vs what exists)

| Week | Planned goal | Actual state | Verdict |
|---|---|---|---|
| **1 — Build the Base** | Register/login, browse real hackathons from **2 platforms** on staging, CI/CD working | Register/login/verify/reset ✅, CI ✅, staging pipeline ✅, catalogue = 1 platform (Devpost ingestion) + a file importer | 🟨 |
| **2 — Find & Personalize** | Hackathons from **all 6 platforms**, full search/filter/save/dashboard/profile, recommendations + Worth Score v1 | Dashboard/profile ✅, expanded filters/facets/sorting and URL state ✅, recommendations and heuristic Worth Score ✅; official multi-platform ingestion remains blocked pending documented/authorized sources | 🟨 |
| **3 — Connect & Collaborate** | Teams + requests, calendar + email reminders, self-explaining Worth Score, instant notifications | Teams ✅, requests ✅, notifications SSE ✅, calendar UI/export ✅, deployed reminder dispatch ✅; email provider configuration is still needed for email delivery | 🟨 |
| **4 — Polish & Launch** | Security audit, speed, re-test, student trial, monitoring/backups, **v1.0 live** | Monitoring ✅, ops docs ✅, gitleaks ✅, k6 baseline run ✅, **no ZAP/OWASP audit ⬜, no student trial ⬜, no Lighthouse gate ⬜, no recorded v1.0 go-live ⬜** | 🔴 |

---

## 13. Launch checklist status (plan §8)

| Checklist item | Status | Note |
|---|---|---|
| All must-do tasks finished, no open serious bugs | 🟨 | 49 of 109 tasks complete, 37 partial, 23 not done |
| OWASP checklist complete, ZAP fixed, secrets scan clean | 🟨 | Gitleaks ✅ only |
| Lighthouse 90+, no critical axe issues | 🟨 | Chromium axe check: no critical/serious findings on six selected routes in two themes; no Lighthouse 90+ run or full-site axe gate |
| 95% of API requests < 300 ms in load test | 🟨 | Local baseline run 2026-10-31: p95 **129 ms**, 0.00 % errors, 100 % checks (`tools/loadtest/RESULTS.md`). Staging-scale run still pending credentials |
| Atlas backups on, restore tested | 🟨 | **Backup/restore drill verified 2026-10-31** (314 documents restored, inventory match, exit 0) after fixing the drill's `mongorestore --uri` bug. Atlas PITR itself still needs the Atlas account |
| Sentry, uptime monitoring, alerts working | ✅ | Sentry + `uptime.yml` + Grafana dashboard |
| Collectors scheduled, healthy, alerting | ⬜ | No approved source adapters or scheduled collector; the existing Devpost JSON endpoint is not documented by Devpost as an authorized public API |
| Terms, Privacy, cookie consent, source credit live | ✅ | Legal pages + `ConsentProvider` |
| Rollback plan practiced, go/no-go held | 🟨 | Rollback procedure documented, meeting not recorded |
| Someone on call for first 48 hours | ⬜ | No record |

---

## 14. Top gaps to close (priority order)

1. **Authorized hackathon data sources** for MLH, Unstop, Devfolio, HackerEarth, Hack2Skill and Devpost. Official-source research found no public documented API/feed; do not scrape or schedule the undocumented Devpost endpoint. Platform approval/API details are required.
2. **Production reminder email configuration** (`RESEND_API_KEY`, `EMAIL_FROM`) and verify scheduler behavior under the deployed process topology.
3. **Cloudinary avatar-storage credentials** for persistent uploads/removal; the current local environment has no configured Cloudinary credentials.
4. **Hire in the three empty seats or reassign their EP** — Lalitha (61), Gokul (61), Selva (62) = **184 EP ≈ 33% of the plan** has no author.
5. **Testing ownership for Deva** — no authored tests, no e2e runner, no ZAP/Lighthouse gates. OWASP Top 10 manual review now exists (`docs/OWASP_SECURITY_REPORT.md`), but ZAP scan still outstanding.
6. **Broader accessibility/browser checks** — full-site axe/assistive-tech review, Lighthouse, and Firefox/Edge/Safari.
7. **Decide the `backend/` prototype's fate** — either merge Nandhini's reminder/cache/ingestion work into
   `apps/api` or delete it; today it is dead code that makes the report look better than reality.

---

*Generated from repository evidence on 2026-10-31. Authorship comes from `git log`/`git shortlog`,
co-author trailers and per-file history; status comes from inspecting the code paths named in each row.*

---

## 15. Working-tree follow-up — 2026-10-31

The status tables above were first generated before the follow-up implementation. The following updates describe the current working tree and are not yet represented in git history; historical contributor counts/authorship are unchanged. Status cells for the follow-up work implemented after the initial audit (recommendations/Worth Score v1, discovery facets + URL-synced sorting/pagination, reminder dispatch + .ics export) have been updated to ✅ in this working tree (§2, §3, §9).

### Implemented after the report's initial audit

- Added the `/discover/:id` hackathon detail route, richer discovery filters with counted facets, URL-preserved filters/sorting/pagination, and a three-event comparison table.
- Added authenticated `/hackathons/recommendations` ranking with a visible score breakdown. The score is a transparent heuristic over profile fit, upcoming dates, disclosed prizes, and listing completeness; it is not a prediction of outcomes.
- Added a profile avatar removal endpoint, Cloudinary asset identifiers/cleanup, and explicit missing-provider errors. Avatar upload/removal requires `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`; these are absent from the current local environment.
- Reminder dispatch, `.ics` export, responsive checks and the axe checks are documented in `docs/RUBASHREE_TASK_COMPLETION.md`.
- OWASP Top 10 manual review added as `docs/OWASP_SECURITY_REPORT.md`, with an `npm audit` dependency baseline saved to `docs/npm-audit-raw.txt`. No ZAP/DAST scan has been run yet.

### Official platform source gate

The requested source policy was **official APIs/feeds only**. Review of official sources found public event listing pages but no documented machine-readable public API/feed for MLH, Unstop, Devfolio, HackerEarth or Hack2Skill. The existing Devpost JSON endpoint is not documented by Devpost as an authorized public API for ingestion. Therefore no new collectors were added and none was scheduled. This remains blocked until the platforms provide or approve documented API/feed access.

Reviewed official pages:

- [MLH events](https://www.mlh.com/seasons/2026/events) and [MLH partnerships](https://sponsor.mlh.com/)
- [Unstop opportunities](https://unstop.com/hackathons)
- [Devfolio hackathons](https://devfolio.co/hackathons)
- [HackerEarth help center](https://help.hackerearth.com/)
- [Hack2Skill events](https://hack2skill.com/events)
- [Devpost public hackathons](https://info.devpost.com/product/public-hackathons) and [Devpost terms](https://info.devpost.com/legal/terms-of-service)

### Current implementation limitations

- Official multi-platform ingestion needs approved API/feed documentation and any required credentials. No scraping or undocumented endpoint polling was added.
- Cloudinary storage code is wired, but actual uploads and asset deletion cannot be verified until deployment credentials are configured.
- Full cross-browser/device/screen-reader testing, Lighthouse, staging production tests and externally imported `.ics` verification remain open.
