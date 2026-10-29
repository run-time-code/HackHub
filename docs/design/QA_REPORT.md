# QA report — Week 3 / Week 4 code readiness

**Date:** 2026-10-29
**Scope:** WA3 app shell, calendar/reminders, saved-hackathon tracking, account
settings, demo mode and the production build.
**Verdict:** Pass for code-level QA. Live staging/production checks still require
provider secrets and are listed as a release step, not a code gap.

## Automated checks

| Check | Command | Result |
|---|---|---|
| Lint (web + API) | `npm run check` | Pass, 0 errors |
| Web unit tests | `vitest run` via `npm run check` | 6 files / 25 tests pass |
| API contract tests | `node --test test/*.test.js` via `npm run check` | 16 suites / 87 tests pass |
| Production build | `vite build` via `npm run check` | Pass (3496 modules, ~12s) |
| New API coverage | `apps/api/test/calendar-reminders-saved.test.js` | 8 tests pass: calendar months, catalogue filters, reminder CRUD, preferences, saved CRUD, account aliases, ownership isolation |

The API contract suite runs against an in-memory MongoDB, so it exercises the
real Mongoose models, auth middleware and CSRF middleware rather than mocks.

## Browser smoke checks

Run against the zero-service demo (`npm run dev:demo`, MSW) with Playwright
Chromium. The runner asserted page content and failed on console errors or
uncaught page errors.

| Flow | Assertion | Result |
|---|---|---|
| Login | Demo login lands on `/dashboard`; shell nav exposes Discover and Calendar | Pass |
| Discover | Cards render; saving a hackathon shows “Hackathon saved to your dashboard.” | Pass |
| Calendar | Month grid renders deadline buttons; seeded reminder is listed | Pass |
| Settings | Reminder preferences load from the API (3-day default); save shows success; personal-data export downloads `hackhub-personal-data.json` | Pass |
| Saved dashboard | `/app?section=dashboard` lists the saved Monsoon Build Weekend row from `GET /saved` | Pass |
| Dark theme | Calendar renders with `data-theme="dark"` | Pass |
| Mobile | Calendar and Settings render at 390 × 844 with no horizontal overflow | Pass |
| Diagnostics | No console errors, no uncaught page errors, no failed assertions | Pass |

Screenshots were captured locally for desktop, dark and mobile review. They are
not committed because they are reproducible from the commands above.

## Route and state coverage

| Surface | Empty | Loading | Error | Success |
|---|---|---|---|---|
| `/discover` | “No hackathons found” | skeleton/status copy | retry panel | cards + save |
| `/calendar` | “No reminders yet” / empty agenda | loading status | retry/error copy | month/week/agenda + reminder form |
| `/settings` | n/a | preferences loading copy | alert copy | save/export/delete flows |
| `/app?section=dashboard` | empty tracking prompt | loading skeleton | retry panel | saved/registered/ongoing/completed tabs |
| `/dashboard` | suggested-people empty state | page loading | query error state | crews, requests, deadlines |

## Accessibility and interaction review

- All new form controls have labels; status and error messages use `role="status"`
  or `role="alert"`.
- Calendar event buttons expose `aria-pressed`; the grid remains keyboard
  navigable.
- Destructive actions (delete account, remove saved hackathon) require
  confirmation.
- Reduced-motion mode was enabled for the browser smoke run; no motion-related
  page errors occurred.
- Colour/typography tokens are unchanged from the signed-off WA3 design system
  (`docs/design/DESIGN_SYSTEM.md`).

## Known limits

- The demo uses in-memory MSW fixtures; it does not verify MongoDB persistence,
  email delivery, OAuth providers or the production auth secret configuration.
- The API smoke test is contract-level. A deploy-time smoke run still needs
  `STAGING_API_URL` / production credentials (`apps/api/scripts/smoke-staging.js`).
- The browser run covers Chromium; Safari/Firefox compatibility relies on the
  existing browser-target build and the design system’s features.
- No visual-diff baseline is stored in the repository; the checks above assert
  content, routing and layout overflow rather than pixel equality.
