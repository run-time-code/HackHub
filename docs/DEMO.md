# HackHub demo guide

The frontend ships with a complete in-browser demo. It is the fastest way to
review the WA3 experience without MongoDB, the Express API, OAuth credentials or
an environment file.

## Run it

From the repository root:

```bash
npm install
npm run dev:demo --workspace @hackhub/web
```

Open the Vite URL (normally `http://localhost:5173`). The demo banner in the app
shell reads **Demo data · resets on reload**.

Any non-empty email and password signs in. The demo session hydrates as **Asha
Raman**, a full-stack builder with a complete card, two crews and three incoming
requests.

Alternative switch:

```bash
# apps/web/.env (or use the command above to avoid an env file)
VITE_USE_MOCKS=true
```

Build a static demo with:

```bash
npm run build:demo --workspace @hackhub/web
```

Host the contents of `apps/web/dist` on any static host. The mock service worker
is served from the app root, so a hard reload is enough for deep links.

## Ten-minute tour

1. **Landing (`/`)** — the public field guide, live network numbers, feature
   cards, process, FAQ and final CTA.
2. **Dashboard (`/dashboard`)** — 100% card, next deadline, crews, suggested
   people, pending requests and the activity desk.
3. **Discover (`/discover`)** — browse the open calls, filter by mode, and save
   a hackathon; the saved row appears on the tracking dashboard.
4. **Calendar (`/calendar`)** — switch month/week/agenda, open a deadline, and
   create a reminder. The seeded reminder and the preferences saved under
   Settings are both editable.
5. **Settings (`/settings`)** — change the default lead time and quiet hours,
   download a personal-data export, and review the password/delete controls.
6. **Teammates (`/teammates`)** — filter by skills, availability and
   open-to-teams, sort by match, then invite someone to Paper Kites.
7. **Teams (`/teams`)** — switch between My teams and Discover teams, create a
   new crew, and open Paper Kites to inspect seats and members.
8. **Requests (`/requests`)** — accept or decline incoming requests, review
   invitations, cancel an outgoing request, and open the history tab.
9. **Profile (`/profile`)** — edit the headline or bio, replace the avatar, save,
   and use View public to inspect `/u/user-asha`.
10. **Public card (`/u/user-maya`)** — a guest-facing builder card with share,
    prove links and invite entry points.
11. **Requests & notifications** — clear the bell or mark one notification
    read. Demo mode bypasses the SSE stream and uses the mocked inbox.
12. **Profile and consent** — open cookie settings from the footer and change
    analytics consent. No analytics is initialized before opt-in.
13. **Onboarding (`/onboarding`)** — run the four field notes, then finish into
    the dashboard. Validation, draft persistence and back-navigation are live.
14. **Legal and help** — `/faq`, `/contact`, `/legal/privacy`,
    `/legal/terms`, `/legal/cookies`, `/legal/community`.

## What the mocks support

- Session restore, login, logout, onboarding save and password-reset
  validation paths used by the SPA.
- Own profile, public profiles, skills, avatar upload, links, hackathon history,
  availability and discovery visibility.
- Discovery search, filters, sort, self-exclusion and 70/30 match scoring.
- Hackathon deadlines used by the dashboard, calendar and team creation.
- Calendar events, reminder create/list/delete, and reminder preferences.
- Saved-hackathon CRUD with tracking status and private notes.
- Account settings: password validation, personal-data export and delete.
- Team create/edit/delete, seats, members, join requests and invitations.
- Request accept/decline/cancel, notification unread counts and mark read.
- Public stats, feedback submission and the landing-page counters.

Fixtures live in `src/mocks/data.js`; handlers and mutation behavior live in
`src/mocks/handlers.js`. Data is in memory and resets on a full page reload.

## Demo boundaries

- The demo is **not** a test of the live auth API, OAuth providers, email
  delivery or database persistence.
- Avatar upload returns a local data URL; no media leaves the browser.
- The signed-in demo always hydrates Asha and also for `/u/:id`. Anonymous
  public-card layout is implemented and covered by the route/layout code, but it
  is not exercised by the default demo session.
- Calendar, reminder and saved-hackathon mutations are in-memory only. The demo
  never sends email reminders or writes to MongoDB.
- The backend discovery endpoint currently returns the signed-in user as well.
  The finder removes the viewer client-side, so the displayed result count can
  be one lower than the server total.
- A full reload is the reset button. Use it after destructive demo actions.

## Troubleshooting

- **Blank screen or stale data** — hard reload (`Ctrl/Cmd + Shift + R`) and check
  the service worker in DevTools → Application. `public/mockServiceWorker.js`
  must be served from the site root.
- **No demo requests** — confirm the URL is `http://localhost:…` (not a `file://`
  path) and that `VITE_USE_MOCKS=true` or `--mode demo` is active.
- **Deep link 404 on a static host** — configure the host to rewrite unknown
  paths to `index.html`.
- **A mutation did not persist after reload** — that is expected; fixtures reset.

## Verification

The route, interaction, responsive, dark and reduced-motion checks run for this
demo are recorded in
[`docs/design/QA_REPORT.md`](design/QA_REPORT.md).
