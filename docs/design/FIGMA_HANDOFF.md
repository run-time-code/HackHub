# Figma → Code Handoff v1.0

> Figma file: **HackHub — WA3 Frontend** (frames listed below).
> If the file is unavailable, this document plus `design-board.html` is the
> complete handoff. All measurements are in CSS px at 1×.

## Frame index

| Frame | Route | Size | Notes |
|---|---|---|---|
| `00 — Cover` | — | 1600×1000 | Brand, palette, type specimen |
| `01 — Landing / Desktop` | `/` | 1440×5200 | Hero, stats, how, roles, FAQ, CTA |
| `02 — Landing / Mobile` | `/` | 390×4800 | Stacked hero, drawer, bottom CTA |
| `03 — Auth` | `/auth` | 1440×960 | Split story/form; mobile form only |
| `04 — App shell` | `/dashboard` | 1440×960 | Top nav, utilities, footer |
| `05 — Dashboard` | `/dashboard` | 1440×1200 | Stats, deadlines, saved events |
| `06 — Profile editor` | `/profile` | 1440×1600 | Form + live preview sidebar |
| `07 — Public profile` | `/u/:id` | 1440×1200 | Cover, skills, invite CTA |
| `08 — Teammate finder` | `/teammates` | 1440×1200 | Filter rail + match cards |
| `09 — Team hub` | `/teams` | 1440×1000 | My teams, browse, create |
| `10 — Team detail` | `/teams/:id` | 1440×1200 | Crew, leader panel, requests |
| `11 — Requests` | `/requests` | 1440×960 | Incoming/outgoing, actions |
| `12 — Notification popover` | overlay | 380×520 | Unread, mark all, CTAs |
| `13 — Create team dialog` | overlay | 640×760 | Form + preview |
| `14 — Invite dialog` | overlay | 560×640 | Team picker, role, message |
| `15 — Cookie preferences` | overlay | 560×620 | Purpose switches |
| `16 — Feedback` | overlay | 520×620 | Type, message, context |
| `17 — Legal / FAQ / Contact` | `/legal/*`, `/faq`, `/contact` | 1440×1400 | Editorial long-form |
| `18 — Empty / loading / error` | — | 1440×800 | Component states |

## Component inventory

### Primitives
`Button`, `IconButton`, `Input`, `Textarea`, `Select`, `Switch`, `Checkbox`,
`RadioCard`, `Chip`, `Badge`, `Avatar`, `AvatarStack`, `ProgressRing`,
`Skeleton`, `Spinner`, `Tooltip`, `Popover`, `Dialog`, `Drawer`, `Tabs`,
`SegmentedControl`, `Toast`, `EmptyState`, `Alert`, `Breadcrumb`, `Pagination`.

### Composites
`PublicNav`, `AppShell`, `MobileMenu`, `BottomDock`, `CommandPalette`,
`NotificationBell`, `Footer`, `PageHeader`, `SectionHeading`, `StatCard`,
`HackathonCard`, `ProfileCard`, `TeamCard`, `MemberRow`, `RequestCard`,
`SkillPicker`, `AvatarUploader`, `ProfileCompleteness`, `MatchRing`,
`CookieBanner`, `FeedbackWidget`.

### Patterns
- **Printed card**: 1px line, 4px offset shadow, hover lifts 2px.
- **Numbered section**: mono `01 /` + serif title + hairline.
- **Split hero**: 7/5 columns, text left, layered cards right.
- **Filter rail**: 280px sticky, sections separated by 1px lines.
- **Action bar**: sticky bottom on mobile, 16px blur, safe-area padding.
- **Empty state**: 96px illustration, serif headline, one primary CTA.

## Redlines

| Element | Value |
|---|---|
| Nav height | 76px public / 72px app |
| Content max | 1280px; gutter `clamp(20px, 4vw, 56px)` |
| Hero top padding | 120px desktop, 72px mobile |
| Display size | `clamp(3.6rem, 8vw, 8rem)` / 0.86 |
| Button height | 44px (sm 36, lg 52) |
| Input height | 44px |
| Card padding | 24px desktop, 20px mobile |
| Grid gap | 24px desktop, 16px mobile |
| Section gap | 96px desktop, 64px mobile |
| Radius | 6 / 10 / 16 / 24 / pill |
| Focus ring | 2px signal, 3px offset |

## Implementation map

| Design component | Code |
|---|---|
| Tokens | `src/styles/tokens.css` |
| Base + type | `src/styles/base.css` |
| Buttons/forms/cards | `src/styles/components.css` |
| Shell/nav/footer | `src/styles/shell.css` |
| Landing | `src/styles/landing.css` |
| Profile | `src/styles/profile.css` |
| Teams/finder/requests | `src/styles/teams.css` |
| Legal/help | `src/styles/content.css` |
| Motion helpers | `src/styles/motion.css` |
| Layout shell | `src/components/layout/AppShell.jsx` |
| Public layout | `src/components/layout/PublicLayout.jsx` |
| Landing page | `src/pages/Landing.jsx` |
| Profile editor | `src/pages/Profile.jsx` |
| Public profile | `src/pages/PublicProfile.jsx` |
| Finder | `src/pages/Teammates.jsx` |
| Team hub/detail | `src/pages/Teams.jsx`, `src/pages/TeamDetail.jsx` |
| Requests | `src/pages/Requests.jsx` |
| Legal/help | `src/pages/legal/*`, `src/pages/FAQ.jsx`, `src/pages/Contact.jsx` |

## Copy deck (key strings)

- Landing H1: **Find your people. Build the improbable.**
- Landing sub: “Hackathons, teammates, and deadlines in one field guide for
  student builders. Show up with a crew, not a cold start.”
- Primary CTA: **Start building — free**
- Secondary CTA: **See how it works**
- Finder empty: “No builders match yet. Widen your skills, or invite someone
  straight from their profile.”
- Requests empty: “No handshakes yet. Request to join a team and it will land
  here.”
- Teams empty: “You have not started a crew yet. Pick a hackathon and make the
  first move.”
- Profile privacy: “Only signed-in builders can find you. Your email is never
  shown.”
- Destructive: “This cannot be undone.”

## Accessibility annotations

- All interactive elements have visible focus, 44px targets.
- Avatars are decorative when paired with a name; otherwise alt is the name.
- Match rings include `aria-label="Match 94 percent"` plus visible number.
- Filter changes announce result counts with `role=status`.
- Dialogs use Radix focus trap and return focus to the trigger.
- Theme toggle announces the resulting theme.
- Cookie banner is a `dialog` with `aria-modal=false` so it does not trap focus.
