# HackHub Design — Work Area 3

**Designer:** Divyashree (Frontend)
**Design direction:** *The Builder's Field Guide, reimagined as a living archive.*
**Status:** Signed-off v1.0 — implemented in `apps/web`

HackHub is not another event directory. It is the place where a student finds the
room, the people, and the deadline that turn an idea into something real. The
interface should feel like a beautifully kept field journal: warm, editorial,
confident, and quietly technical. It should never feel like a generic SaaS
dashboard.

## Why this direction

| Product truth | Design response |
|---|---|
| Hackathons are time-boxed and emotional | Editorial headlines, clear deadlines, warm paper tones |
| Teams are formed on trust | Human profiles, availability signals, visible skill overlap |
| Students are builders, not leads | Language is direct and generous; no corporate jargon |
| The network is alive | Live stats, motion, real-time notifications, subtle grain |
| Trust is earned | Transparent privacy controls, calm legal pages, no dark patterns |

## Deliverables in this folder

| File | Purpose |
|---|---|
| `DESIGN_SYSTEM.md` | Tokens, typography, spacing, components, motion, accessibility |
| `UX_FLOWS.md` | Wireframes and state maps for every core flow |
| `FIGMA_HANDOFF.md` | Frame index, component inventory, redlines, implementation map |
| `design-board.html` | Self-contained visual reference (open in a browser) |
| `QA_REPORT.md` | Automated, browser-smoke and release-readiness evidence for the WA3 surface |

The source of truth for implementation is split between this folder (intent) and
`apps/web/src/styles` (execution). Tokens are shared between the two.

## The five design principles

1. **One clear next action.** Every screen answers “what do I do now?” in one
   glance. Secondary actions are quieter, never competing.
2. **Editorial, not decorative.** Large serif type, hairline rules, numbered
   sections and generous white space carry the personality. Effects support
   hierarchy; they never replace it.
3. **Human signal over data noise.** Match scores, availability and skill overlap
   are presented as helpful signals, with plain-language explanations.
4. **Motion with manners.** Motion clarifies state and rewards attention. It is
   fast, interruptible, and fully disabled under `prefers-reduced-motion`.
5. **Calm trust.** Privacy, consent, destructive actions and legal content are
   explicit, reversible where possible, and written in plain language.

## Experience map

```
Public
  /                     Landing — story, live network, proof
  /auth                 Sign in / create account
  /u/:id                Shareable public builder profile
  /faq /contact         Help
  /legal/terms /privacy Legal

Authenticated (App shell)
  /dashboard            Personal build log
  /discover             Hackathon discovery
  /teammates            Teammate finder with match %
  /teams                Team hub (mine + browse)
  /teams/:id            Team detail + leader controls
  /requests             Incoming / outgoing handshakes
  /profile              Builder card editor
  /settings             Account, privacy, data
  /calendar             Deadlines

Utility
  ⌘K                    Command palette
  Bell                  Notification feed
  Theme toggle          Light / dark / system
  Cookie settings       Consent preferences
  Feedback              Report a problem / suggest a feature
```

## Sign-off checklist

- [x] Desktop and mobile layouts for landing, shell, profile, finder, teams,
      requests, legal.
- [x] Empty, loading, error and permission-denied states specified.
- [x] Dark and light palettes meet WCAG AA for text.
- [x] Every destructive action requires confirmation; every async action has
      progress and a result message.
- [x] Motion respects reduced-motion; focus states are visible.
- [x] Copy reviewed for consistent voice and sentence case.
- [x] Automated and browser-smoke checks recorded in `QA_REPORT.md`.
