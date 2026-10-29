# HackHub frontend

The WA3 frontend is a React 19 + Vite application built around **The Builder's
Field Guide, reimagined as a living archive**: a public story-led landing page,
shareable builder cards, a teammate finder, a team hub, a request wire, and a
dashboard that keeps the next action obvious.

## Local development

Requirements: Node.js 20+ and npm.

```sh
npm install
npm run dev
```

Set `VITE_API_BASE_URL` to the backend API URL (for example,
`http://localhost:5000/api`). `VITE_API_URL` is also accepted for compatibility
with the deployment configs. If neither is set, the app uses
`http://localhost:5000/api`. Copy `apps/web/.env.example` to
`apps/web/.env` to get started; `VITE_SENTRY_DSN` optionally enables error
reporting. Google and GitHub sign-in navigate to the API's `/auth/google` and
`/auth/github` routes, which start the provider handshake and redirect back to
the SPA.

## Demo mode (no API or database)

The fastest way to review the interface is the in-browser MSW demo:

```sh
npm run dev:demo
```

This runs Vite in the `demo` mode, starts the mock service worker before React
mounts, and routes same-origin `/api` traffic to complete fixtures. Sign in with
any non-empty email/password; the session hydrates as Asha Raman. The app shell
shows a **Demo data · resets on reload** status.

The equivalent environment switch is `VITE_USE_MOCKS=true`. `npm run
build:demo` produces a static demo build.

Demo fixtures cover auth/session, profile and skills, avatar upload, discovery,
hackathons, teams, invitations, join requests, notifications, public stats,
feedback and the redirect destinations used by the landing page. Data is
in-memory and deliberately resets on reload. See [docs/DEMO.md](../../docs/DEMO.md)
for a guided tour and demo limitations.

## Routes

| Route | Layout | Purpose |
|---|---|---|
| `/` | Public | Landing, proof, feature tour, FAQ and CTA |
| `/auth?panel=…` | Auth | Login, registration, password reset, verification |
| `/onboarding` | Standalone | Four-step first-run field notes |
| `/dashboard` | App shell | Crews, next deadline, suggested people, pending requests |
| `/teammates` | App shell | Opt-in finder, skill/interest filters, invitations |
| `/teams` | App shell | My teams and open team discovery |
| `/teams/:id` | App shell | Team detail, seats, members, leader controls |
| `/requests` | App shell | Incoming, outgoing and history |
| `/profile` | App shell | Builder-card editor with live public preview |
| `/u/:id` | Public or app shell | Shareable public builder card |
| `/faq`, `/contact` | Public | Help and support |
| `/legal/terms`, `/legal/privacy`, `/legal/cookies`, `/legal/community` | Public | Legal and trust |
| `/app?section=…` | Legacy | Previous workspace, retained during migration |

Anonymous `/u/:id` visits use the public layout; signed-in visits use the app
shell so the viewer keeps their navigation. `/login`, `/register`, `/discover`,
`/calendar` and `/settings` redirect into their canonical routes.

## Architecture notes

- `src/lib/api/http.js` is the canonical client for WA3 data: same-origin or
  configured base URL, credentials, CSRF bootstrap, one refresh-and-replay on
  401, and a normalized error type.
- `src/lib/api/request.js` and `client.js` remain for auth/session/account and
  legacy workspace modules.
- TanStack Query owns server state and invalidation. Pages render explicit
  loading, error and genuine empty states; the only mock data path is the
  explicit demo mode.
- Consent lives in `localStorage` under `hackhub:consent:v1`; analytics are not
  initialized before opt-in.
- The WA3 layout and visual language are documented in
  [`docs/design`](../../docs/design/README.md).

## Checks

```sh
npm run lint
npm test
npm run build
npm run build:demo
```

Frontend tests cover auth/API request behavior, CSRF handling, request
classification, profile completion, and finder filtering/sorting. Route and
interaction QA is summarized in
[`docs/design/QA_REPORT.md`](../../docs/design/QA_REPORT.md).

## Backend integration

The API contract and any unconfirmed frontend assumptions are documented in
[`docs/API_SPEC.md`](../../docs/API_SPEC.md). API-dependent screens display
loading, error, and genuine empty states; they do not substitute mock records
when the backend is unavailable. Confirm the marked provisional endpoints and
response shapes with the backend owners before production deployment.
