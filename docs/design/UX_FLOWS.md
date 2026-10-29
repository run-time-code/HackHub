# HackHub UX Flows & Wireframes v1.0

Every flow below was designed desktop-first at 1440px and validated at 390px.
The page component map is in `FIGMA_HANDOFF.md`.

---

## Flow 1 — First visit → account

```
/ (Landing)
 ├─ Hero: "Find your people. Build the improbable."
 ├─ CTAs: [Start building — free] [See how it works]
 ├─ Live network proof + platform strip
 ├─ Value props → How it works → Builder roles → FAQ
 └─ Final CTA
      │
      ├─ existing user → /auth?panel=login → /dashboard
      └─ new user → /auth?panel=register → verify email → /onboarding
                                                   ├─ skills + proficiency
                                                   ├─ interests + mode
                                                   ├─ location
                                                   └─ /profile complete card → /dashboard
```

**Landing wireframe (desktop)**

```
┌────────────────────────────────────────────────────────────────────┐
│ ◉ HackHub     Discover  How it works  Builders  FAQ   ◐  [Sign in] │
├────────────────────────────────────────────────────────────────────┤
│  SEASON 01 · THE BUILDER NETWORK            ┌───────────────────┐  │
│                                             │  MATCH  94%       │  │
│  Find your people.                          │  ┌────┐           │  │
│  Build the improbable.                      │  │ av │  Aarav    │  │
│                                             │  └────┘  React    │  │
│  Hackathons, teammates, and deadlines       │  [invite] [view]  │  │
│  in one field guide for student builders.   └───────────────────┘  │
│                                             ┌───────────────────┐  │
│  [Start building — free]  [See how it works]│  TEAM · 3/4       │  │
│                                             │  Orbital Drift    │  │
│  BUILDERS FROM  Devpost · MLH · Unstop      │  ◉◉◉○             │  │
│                 Devfolio · HackerEarth      └───────────────────┘  │
├────────────────────────────────────────────────────────────────────┤
│  LIVE NETWORK  128 hackathons · 342 teams · 2,480 builders         │
├────────────────────────────────────────────────────────────────────┤
│  01 FIND      │ 02 TEAM       │ 03 SHIP                            │
│  ...          │ ...           │ ...                                │
└────────────────────────────────────────────────────────────────────┘
```

**Mobile**: single column; hero visual becomes a swipeable card stack;
nav collapses to logo + theme + menu; primary CTA full width.

---

## Flow 2 — Build a builder card

```
/profile (auth)
 ├─ Header: "Your builder card" + completion 68% + [View public] [Save]
 ├─ Identity: avatar / name / headline / bio / college / year / location
 ├─ Skills: search taxonomy → select (max 10) → proficiency per skill
 ├─ Links: GitHub / LinkedIn / Portfolio (URL validated)
 ├─ Hackathon history: repeatable [name, year, project URL]
 ├─ Availability: [Available] [Limited] [Unavailable]
 ├─ Visibility: [Looking for a team] [Discoverable in finder]
 │    └─ inline privacy note + link to /legal/privacy
 └─ Sidebar: live profile preview + completion checklist + tips
```

**States**
- Saving: primary button spinner, fields stay editable, toast on success.
- Validation: inline error under field, first invalid field focused.
- Avatar: drag/drop, 2 MB limit, JPG/PNG/WebP, preview before upload.
- Unsaved changes: beforeunload guard; Save is sticky on mobile.
- Discoverable off: teammate finder shows an explanatory banner and CTA.

**Public profile `/u/:id`**

```
┌───────────────────────────────────────────────────────────────┐
│  cover gradient + grain                          [Share]      │
│  ┌──────┐  Aarav Mehta                    ● Available        │
│  │avatar│  Frontend engineer · VIT '27                       │
│  └──────┘  Chennai, India · joined 2026                       │
│  [Invite to my team]  [GitHub] [LinkedIn] [Portfolio]         │
├───────────────────────────────────────────────────────────────┤
│  About          │ Skills                    │ Badges          │
│  ...            │ React █████░ advanced     │ Early builder   │
│                 │ Node  ███░░░ intermediate │ Team player     │
│  Past builds    │ ...                       │ Polyglot        │
│  2025 · Orbital │                           │                 │
└───────────────────────────────────────────────────────────────┘
```

Owner sees **Edit profile** instead of Invite. Logged-out visitors see
**Sign in to invite**. No email address is ever shown.

---

## Flow 3 — Teammate finder → invitation

```
/teammates
 ├─ Header + "Opt in to be discoverable" banner if private
 ├─ Filter rail (desktop) / sheet (mobile)
 │   ├─ Search name or headline
 │   ├─ Skills (multi-select + autocomplete, max 10)
 │   ├─ Availability segmented control
 │   ├─ Open to teams switch
 │   └─ Sort: Best match / Recently active / Name
 ├─ Results header: "28 builders · sorted by match"
 └─ Card grid
      ├─ Match ring (0–100, API matchScore, explained in tooltip)
      ├─ Name, headline, college/year, location
      ├─ Skill chips; requested skills highlighted
      ├─ Availability dot + "Open to teams"
      └─ [Invite]  [View profile]
            │
            └─ Invite dialog
                 ├─ Choose one of my led teams (only open seats)
                 ├─ Role (prefilled from rolesNeeded)
                 ├─ Message (optional, 500 chars)
                 └─ [Send invitation] → toast + requests query invalidated
```

**No teams yet**: Invite opens a create-team prompt; the teammate is remembered
in sessionStorage so the invitation can be sent immediately after creation.
**Empty results**: widen filters or invite directly via profile URL.
**No opt-in**: banner explains discovery is opt-in, CTA to `/profile#visibility`.

---

## Flow 4 — Create and manage a team

```
/teams
 ├─ Tab: My teams | Discover teams
 ├─ My teams: cards (name, hackathon, size, status, roles needed)
 │   └─ empty: "You have not started a crew yet" + [Create a team]
 ├─ Discover teams: hackathon selector + status filter + search
 └─ [Create a team] → dialog / page
      ├─ Hackathon (searchable select)
      ├─ Team name (3–80)
      ├─ One-line mission (≤500)
      ├─ Roles needed (chips, ≤10)
      ├─ Team size stepper (2–10)
      ├─ Live preview card
      └─ [Create team] → /teams/:id (leader view)
```

**Team detail `/teams/:id`**

```
┌────────────────────────────────────────────────────────────────┐
│  ← Back to teams            OPEN · 3/4 seats                    │
│  Orbital Drift                                                  │
│  for NASA Space Apps 2026 · led by Aarav                        │
│  [Invite member] [Edit team] [⋯ Leader menu]                    │
│  roles: ML engineer · Designer                                  │
├──────────────────────────────┬─────────────────────────────────┤
│  Crew (3)                    │  Pending requests (2)            │
│  ◉ Aarav     leader          │  ◉ Meera · wants ML engineer     │
│  ◉ Ishaan    ML              │    [Accept] [Decline]            │
│  ◉ Tara      design          │  ...                             │
│  [leave team]                │  Invite sent (1)                 │
├──────────────────────────────┴─────────────────────────────────┤
│  About the build · skills · hackathon deadline                  │
└────────────────────────────────────────────────────────────────┘
```

**Leader controls** (overflow menu)
- Edit team (name, mission, roles, size, open/closed)
- Transfer leadership (member picker + confirm)
- Remove member (confirm)
- Disband team (type team name + confirm)

**Member controls**: Leave team (confirm). Leader must transfer first.
**Non-member**: Request to join with role + message. Disabled when closed/full.

---

## Flow 5 — Requests inbox + notifications

```
Bell ──unread count──> popover
 ├─ 5 most recent notifications
 ├─ [Mark all read] [View all requests]
 └─ real-time SSE updates; polling fallback every 60s

/requests
 ├─ Tabs: Incoming | Outgoing | History
 ├─ Filters: pending / accepted / declined / expired
 ├─ Request card
 │   ├─ direction icon + team + person
 │   ├─ role, message, sent date, expiry countdown
 │   ├─ [Accept] [Decline]      (incoming)
 │   └─ [Cancel request]        (outgoing)
 └─ Empty: one action to find a team
```

Direction rules:
- **Incoming invitation** — `type=invite`, `user.id === me`.
- **Incoming join request** — `type=request`, team leader is me.
- **Outgoing** — `initiatedBy === me`, excluding requests to my own led teams.
- Accept → success toast, subtle confetti (reduced-motion safe), team query
  invalidated. Decline/cancel → confirmation, toast, list updated optimistically.

---

## Flow 6 — Consent & analytics

```
First visit
 └─ Cookie banner (bottom, non-blocking)
      ├─ [Essential only] → closes, analytics stays off
      ├─ [Accept all] → closes, analytics loads
      └─ [Preferences] → dialog with per-purpose switches
            ├─ Essential (always on, explained)
            ├─ Analytics (off by default)
            └─ [Save preferences]

Footer "Cookie settings" / privacy page reopens preferences at any time.
No analytics script is injected before consent.
```

Tracked funnel events: `signup_started`, `signup_completed`, `hackathon_saved`,
`register_clicked`, `team_created`, `team_request_sent`, `team_request_accepted`,
`profile_completed`, `feedback_submitted`.

---

## Flow 7 — Help, feedback, legal

```
/faq        Accordion grouped by account, discovery, teams, privacy
/contact    Contact options + form (opens mailto / posts feedback)
/legal/*    Long-form with sticky table of contents, last-updated date
Feedback    Floating "Feedback" button → dialog
            type (general/bug/idea/content), message, optional email
            → POST /feedback → toast
```

The feedback button is hidden on auth/onboarding to avoid distraction, and
offset above the cookie banner while it is visible.

---

## Responsive rules

| Breakpoint | Behaviour |
|---|---|
| ≥ 1280px | 12-col grids, full filter rail, 3-up cards |
| 1024–1279px | 10-col condensed, 2-up cards, sidebar collapses |
| 768–1023px | Single-column forms, sticky bottom action bar, 2-up |
| < 768px | Bottom dock (auth), full-screen sheets, stacked actions |
| < 420px | 16px gutters, 40px display type minimum, single column |

---

## Error and permission states

| State | Presentation |
|---|---|
| 401 | Redirect to sign-in with `from`; toast “Session expired. Sign in again.” |
| 403 | Inline permission panel; no destructive action visible |
| 404 | Friendly not-found with links to discover/teams |
| 409 full team | Banner “This team just filled up” + find similar teams |
| 429 | “You are moving fast. Try again tomorrow.” + reset time |
| Network | Retry button, preserved form state, offline hint |
| Validation | Field-level, first error focused, summary announced |
