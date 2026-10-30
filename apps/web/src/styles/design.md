# HackHub — Design Specification v1.1

**Product:** HackHub — The builder's field guide  
**Work area:** WA3 — App Shell, Profiles & Team Collaboration  
**Owner:** Frontend (design → implementation)  
**Status:** Implemented in `apps/web/src`; tokens in `src/styles/tokens.css`; handoff in `docs/design/`

This document is the designer-first source of truth. The code implements what is
described here; when they disagree, the code wins and this doc is updated to
match.

---

## 1. Brand idea

**The Builder's Field Guide, reimagined as a living archive.**

Printed field guide meets independent magazine: warm paper, deep ink, one
vermillion "signal" colour, hairline rules, numbered chapters, a serif display
face, and restrained, purposeful motion. Technology shows up in mono labels,
precise grids and CSS-driven depth — never in neon gradients, frosted glass or
generic illustrations.

**Voice:** direct, warm, specific. Verbs first. Sentence case. No hype words
("revolutionary", "seamless", "supercharge"). No exclamation marks in product
UI.

---

## 2. Design principles

| # | Principle | What it means in code |
|---|-----------|-----------------------|
| 1 | **Tokens first** | Every colour, size, radius, duration and easing is a CSS variable in `tokens.css`. No magic numbers in components. |
| 2 | **Motion with intent** | Entrances, hovers and exits exist to orient, not to impress. Everything respects `prefers-reduced-motion`. |
| 3 | **Depth without WebGL** | 3D feeling comes from CSS `perspective`, `rotateX/Y`, layered shadows and offsets — keep the bundle light and the frame rate at 60 fps. |
| 4 | **Accessibility is a layout property** | Skip link first, focus rings never removed, 44×44px touch targets, colour never the only signal, WCAG 2.2 AA contrast. |
| 5 | **Print-inspired editorial** | Numbered sections (`01 /`), hairline rules (`rule-label`), serif display numbers, mono metadata, balanced text wrapping. |

---

## 3. Visual language

### Colours (light / dark)
- **Canvas** `#F3F0E7` / `#0B0E0B` — page background
- **Surface** `#FBFAF5` / `#121612` — cards, sheets
- **Ink** `#161A15` / `#F2EFE4` — primary text
- **Signal** `#E8592E` / `#FF6B3D` — one primary action per view
- **Moss** `#2E5B44` / `#7FB695` — positive state (accepted, available, saved)
- **Lime** `#D9F27A` / `#CFF56A` — highlighter, max once per section
- **Danger** `#B42318` / `#FF8A80` — destructive
- **Info** `#2F5D8A` / `#8CB8E0` — informational

### Typography
| Family | Use |
|--------|-----|
| Instrument Serif | Display headings, page titles, pull quotes, big numbers |
| Manrope Variable | UI, body, buttons, forms |
| JetBrains Mono Variable | Eyebrows, metadata, counters, code |

Scale: display-xl → h1 → h2 → h3 → body → sm → xs → micro, all clamp-based and fluid.

### Surfaces & radius
- Card: 1px `--line` border, `--shadow-card` (4px offset shadow), radius 16–24px
- Hover lift: `translateY(-4px)` + `--shadow-lift`, 240ms ease-out
- Tilt (3D): `perspective(900px) rotateX(2deg) rotateY(-4deg)`, max 4°

### Motion tokens
- `dur-fast 150ms` / `dur-base 240ms` / `dur-slow 480ms` / `dur-cinematic 800ms`
- Eases: `ease-out`, `ease-in-out`, `ease-spring`
- Page enter: opacity 0→1, y 12→0, 240ms
- Section reveal: y 24→0, stagger 70ms, once
- Card hover: y -4px + shadow grow, 150ms
- Marquee: 42s linear, pauses on hover/focus

---

## 4. Component anatomy

| Component | Anatomy | Motion |
|-----------|---------|--------|
| Button | label + optional leading/trailing icon + spinner; sm/base/lg; primary/secondary/ghost/danger | press scale 0.97, spinner on loading |
| Field | label + input/textarea/select + error/hint; error focuses first invalid field | none (form) |
| Dialog (Radix) | grain overlay, serif title, muted description, right-aligned actions (stacked on mobile) | overlay fade, content scale 0.97→1 |
| Card (hackathon/team/profile/teammate) | surface, hairline, hover lift, optional 3D tilt, match ring or avatar | stagger-in on list mount |
| MatchRing | 0–100, neutral/moss/signal tone, `aria-label="Match NN percent"` | none |
| Tooltip | Radix-triggered, 10px radius, mono 11px, 150ms fade | fade + slight scale |
| Empty state | illustration + headline + one primary CTA; never just "No data" | fade-in |
| Toast | bottom-right (desktop) / top-centre (mobile), progress hairline, 4/5/7s | slide-up entry |
| Cookie banner | bottom fixed non-modal dialog; accept all / essential only / preferences | slide-up from bottom, 240ms |
| Nav (public/app) | sticky, blur, hairline bottom; active link: 2px signal underline | slide-in on mount |
| Mobile menu | full-screen sheet, serif links, staggered 70ms entrances | slide from bottom |

---

## 5. Page-by-page design notes

- **Landing (`/`)**: hero with ambient orbs and floating stat chips; live network stats; numbered value props (01–05); builder roles with colour-coded chips; marquee ticker; FAQ accordion; final CTA band. Sections reveal on scroll (70ms stagger).
- **Auth (`/auth`)**: split story/form desktop, single column mobile; social auth buttons; inline validation.
- **Onboarding (`/onboarding`)**: wizard with completion progress; skills picker with autocomplete + proficiency dots; avatar upload with live preview; "looking for a team" toggle with inline privacy note.
- **Dashboard (`/dashboard`)**: stat cards, deadline list, saved hackathons, suggested people, pending handshakes.
- **Discover (`/discover`)**: filter rail (sticky, 280px) + card grid; save/register actions with toast confirmation.
- **Teammates (`/teammates`)**: match cards with skill overlap chips, match % ring, invite CTA → invite dialog.
- **Teams (`/teams` / `/teams/:id`)**: my teams + browse + create dialog; leader controls (remove, transfer, disband — disband requires typing the team name).
- **Requests (`/requests`)**: incoming/outgoing/history tabs; accept/decline/cancel with optimistic updates and confetti on accept.
- **Profile (`/profile` / `/u/:id`)**: builder card, skills with proficiency, links, past hackathons, availability, looking-for-team toggle; public card is shareable.
- **Settings (`/settings`)**: reminder preferences, personal-data export, delete account (confirmation).
- **Calendar (`/calendar`)**: month/week/agenda views; reminder CRUD.
- **Legal / Help (`/faq`, `/contact`, `/legal/*`)**: editorial long-form, sticky table of contents, last-updated dates, feedback widget.

---

## 6. Content & microcopy rules

- Buttons describe the action: "Send invitation", not "Submit".
- Empty/error copy always states what happened and what to do next.
- Dates: `12 Nov 2026`; relative for < 7 days ("in 3 days").
- Privacy copy is specific about what is public; opt-in never buried.
- Tooltips are short task help, never duplicates of visible labels.

---

## 7. Implementation map

| Design element | Code |
|----------------|------|
| Tokens | `src/styles/tokens.css` |
| Base + type | `src/styles/base.css` |
| Buttons/forms/cards | `src/styles/components.css` |
| Shell/nav/footer | `src/styles/shell.css` |
| Landing | `src/styles/landing.css` |
| Profile | `src/styles/profile.css` |
| Teams/finder/requests | `src/styles/teams.css` |
| Legal/help + cookie banner | `src/styles/content.css` |
| Motion helpers | `src/styles/motion.css` |
| Route transitions | `src/App.jsx` (Framer Motion `AnimatePresence`) |
| Shell entrance | `src/components/layout/AppShell.jsx` |
| Tooltip primitive | `src/components/ui/Tooltip.jsx` |
| App shell | `src/components/layout/AppShell.jsx` |
| Public layout | `src/components/layout/PublicLayout.jsx` |
| Pages | `src/pages/**` |

---

## 8. Acceptance (design review)

- [ ] One signal action per view, signal never used for body text
- [ ] Lime used at most once per section
- [ ] All hover states have a matching focus-visible style
- [ ] `prefers-reduced-motion` disables all transforms/animations
- [ ] Readable at 320px width and 200% zoom
- [ ] Every form error is inline and linked via `aria-describedby`
- [ ] Destructive actions require confirmation; disband requires typing the team name
