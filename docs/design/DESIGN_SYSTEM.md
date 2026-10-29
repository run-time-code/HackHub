# HackHub Design System v1.0

Implemented in `apps/web/src/styles/tokens.css` and `apps/web/src/styles/base.css`.
Every value below is a production token, not a suggestion.

---

## 1. Brand idea

**The Builder's Field Guide, reimagined as a living archive.**

The visual language borrows from printed field guides and independent magazines:
warm paper, deep ink, a vermillion “signal” colour, hairline rules, numbered
chapters and a serif display face. Technology is present in the mono labels,
precise grids and restrained motion — never in neon gradients or generic glass.

Voice: **direct, warm, specific.** Short sentences. Verbs first. No hype words
like “revolutionary”, “seamless” or “supercharge”.

---

## 2. Colour

### Light theme

| Token | Hex | Role |
|---|---|---|
| `--canvas` | `#F3F0E7` | Page background |
| `--surface` | `#FBFAF5` | Cards, sheets |
| `--surface-2` | `#ECE8DC` | Recessed areas, hover |
| `--ink` | `#161A15` | Primary text |
| `--ink-2` | `#3D453C` | Strong secondary |
| `--muted` | `#6E7569` | Secondary text |
| `--line` | `#D8D2C3` | Hairlines, borders |
| `--signal` | `#E8592E` | Primary accent / CTA |
| `--signal-ink` | `#8C2C11` | Accent text on light |
| `--moss` | `#2E5B44` | Success, calm emphasis |
| `--lime` | `#D9F27A` | Highlight marker |
| `--danger` | `#B42318` | Destructive |
| `--info` | `#2F5D8A` | Informational |

### Dark theme

| Token | Hex | Role |
|---|---|---|
| `--canvas` | `#0B0E0B` | Page background |
| `--surface` | `#121612` | Cards |
| `--surface-2` | `#191F18` | Recessed |
| `--ink` | `#F2EFE4` | Primary text |
| `--ink-2` | `#D4D2C5` | Strong secondary |
| `--muted` | `#9CA596` | Secondary text |
| `--line` | `#2B3329` | Hairlines |
| `--signal` | `#FF6B3D` | Primary accent |
| `--signal-ink` | `#FFB49A` | Accent text |
| `--moss` | `#7FB695` | Success |
| `--lime` | `#CFF56A` | Highlight |
| `--danger` | `#FF8A80` | Destructive |
| `--info` | `#8CB8E0` | Informational |

### Rules

- Signal orange is for **one primary action per view**. Never use it for body text.
- Lime is a highlighter, not a button colour. Use at most once per section.
- Moss communicates positive state (available, accepted, saved).
- Never rely on colour alone; pair with text or an icon.
- Text contrast: ≥ 4.5:1 for body, ≥ 3:1 for large text and UI boundaries.

---

## 3. Typography

| Family | Source | Use |
|---|---|---|
| **Instrument Serif** | `@fontsource/instrument-serif` | Display, page titles, pull quotes, numbers |
| **Manrope Variable** | `@fontsource-variable/manrope` | UI, body, buttons, forms |
| **JetBrains Mono Variable** | `@fontsource-variable/jetbrains-mono` | Eyebrows, metadata, counters, code |

### Scale

| Token | Size | Line height | Use |
|---|---|---|---|
| `--text-display-xl` | `clamp(3.6rem, 8vw, 8rem)` | 0.86 | Landing hero |
| `--text-display` | `clamp(2.8rem, 5.4vw, 5.2rem)` | 0.92 | Page heroes |
| `--text-h1` | `clamp(2.2rem, 3.6vw, 3.4rem)` | 1.0 | Page title |
| `--text-h2` | `clamp(1.75rem, 2.6vw, 2.5rem)` | 1.05 | Section title |
| `--text-h3` | `1.35rem` | 1.2 | Card title |
| `--text-body` | `1rem` | 1.65 | Body |
| `--text-sm` | `0.875rem` | 1.55 | Secondary |
| `--text-xs` | `0.75rem` | 1.45 | Captions |
| `--text-micro` | `0.6875rem` | 1.3 | Mono labels, tracking `0.14em` |

### Typesetting

- Display headings use **tight** tracking (`-0.045em`) and optical line height.
- Use serif *italic* for one emphasised phrase per headline, not whole paragraphs.
- Mono labels are uppercase with generous tracking.
- Body copy max-width: `68ch`. Legal copy: `72ch`.
- Numbers in stats use tabular figures: `font-variant-numeric: tabular-nums`.

---

## 4. Space, grid, radius

- Base unit: **4px**. Component rhythm: 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96.
- Content max width: **1280px** (`--container`). Reading width: **720px**.
- Page gutter: `clamp(20px, 4vw, 56px)`.
- Column grid: 12 columns, **24px** gap desktop, 16px mobile.
- Radius: `--radius-xs 6px`, `--radius-sm 10px`, `--radius-md 16px`,
  `--radius-lg 24px`, `--radius-pill 999px`.
- Cards use a **1px line + 4px offset shadow** in light; a soft glow in dark.
- Borders are always 1px. Never 2px except focus rings.

---

## 5. Elevation

| Level | Light | Dark |
|---|---|---|
| 0 flat | none | none |
| 1 card | `0 1px 0 rgba(22,26,21,.04), 4px 4px 0 var(--shadow-solid)` | `0 1px 0 rgba(255,255,255,.04)` |
| 2 hover | `0 18px 40px -22px rgba(22,26,21,.35), 6px 6px 0 var(--shadow-solid)` | `0 24px 60px -30px #000` |
| 3 modal | `0 40px 100px -30px rgba(22,26,21,.45)` | `0 40px 100px -20px #000` |

The offset “printed card” shadow is a signature detail. Use it for interactive
cards and sheets, never for inputs or tables.

---

## 6. Iconography

- **Lucide** icons, 1.75px stroke, 18/20/24px sizes.
- Icons support labels; they do not replace them in primary navigation.
- Decorative icons are `aria-hidden`. Icon-only buttons require `aria-label` and
  a tooltip.
- Custom illustrations use two colours: ink + signal, on paper.

---

## 7. Components

### Buttons

| Variant | Usage | Spec |
|---|---|---|
| `primary` | One per view | Signal background, paper text, 44px min height, slight lift on hover |
| `secondary` | Supporting action | Transparent, 1px line, ink text |
| `ghost` | Tertiary / nav | No border, surface hover |
| `danger` | Destructive | Danger text, danger-tinted surface on hover |
| `link` | Inline | Underline offset 3px |

States: hover (translateY -1px), active (translateY 0), focus-visible (2px
signal ring, 3px offset), loading (spinner + “Saving…” copy), disabled (0.45
opacity, no pointer events). Buttons never use serif type.

### Inputs

- 44px min height, 10px radius, surface background, 1px line.
- Label above, helper below, error replaces helper with danger text + icon.
- Focus: line becomes signal + 3px soft ring.
- Textareas auto-grow where possible; max-height 240px.
- Selects use a custom chevron; native behaviour preserved.

### Cards

- `Card`: surface, 1px line, 16px radius, 24px padding.
- `FeatureCard`: adds printed shadow, optional corner number, hover lift.
- `ProfileCard`: avatar left, identity, availability, skill chips, match ring right.
- `TeamCard`: top status row, name, hackathon, role chips, member avatar stack.

### Badges / chips

- Pill radius; mono 11px uppercase for status badges.
- Skill chips show optional proficiency dot: beginner `--line`, intermediate
  `--info`, advanced `--moss`, expert `--signal`.
- Match badge: 0–49 neutral, 50–74 moss, 75–100 signal.

### Navigation

- Public: 76px sticky, translucent canvas, 1px bottom line, blur 16px.
- App: 72px sticky, brand left, five primary links centre, utilities right.
- Active link: ink text + 2px signal underline with 8px offset.
- Mobile: full-screen sheet, 48px serif links, staggered entrance, utility row.
- Authenticated mobile adds a 5-item bottom dock with safe-area padding.

### Dialogs

- Radix-based, max-width 560px, 24px radius, paper surface, grain overlay.
- Title in serif 28px; description muted; actions right-aligned (mobile full
  width, stacked primary last).
- Focus trapped, Escape closes, background inert, scroll locked.
- Destructive dialog requires typing the team name for disband.

### Toasts

- Bottom-right desktop, top-centre mobile; max 3 visible.
- 1px line, icon, title, optional description/action, progress hairline.
- Success 4s, info 5s, error 7s. Errors are announced assertively.

### Empty states

Two-part: a small custom illustration and a **next action**. Never just “No data”.
Tone examples:
- “Your bench is empty. Find a hackathon worth clearing your weekend for.”
- “No teammates match yet. Widen your skills or invite someone directly.”
- “No handshakes yet. Request to join a team and it will land here.”

---

## 8. Motion

| Token | Value |
|---|---|
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` |
| `--dur-fast` | `150ms` |
| `--dur-base` | `240ms` |
| `--dur-slow` | `480ms` |
| `--dur-cinematic` | `800ms` |

- Page enter: opacity 0→1, y 12→0, `--dur-base`.
- Section reveal: y 24→0, opacity 0→1, stagger 70ms, once.
- Card hover: y -4px + shadow grow, `--dur-fast`.
- Tilt: max 4°, spring `stiffness 180 / damping 20`.
- Counters: 1.6s ease-out, start when 30% visible.
- Marquee: 42s linear, pauses on hover/focus.
- Hero ambient orbs: 18–28s alternating, never distracting.
- Reduced motion: all durations 0.01ms, no transforms, marquee static.

---

## 9. Accessibility

- WCAG 2.2 AA target. Keyboard path for every flow.
- Skip link as the first focusable element.
- Focus ring: 2px signal + 3px offset, never removed.
- Touch targets ≥ 44×44px.
- Form errors linked with `aria-describedby`; status messages use `role=status`.
- Dialogs use Radix focus management; menus support arrow keys.
- Icons paired with text; images have meaningful alt or empty alt.
- Motion preference respected globally.
- All data tables/cards remain readable at 200% zoom and 320px width.

---

## 10. Content rules

- Sentence case for headings and buttons. Uppercase only for mono eyebrows.
- No exclamation marks in product UI. No “Oops!”.
- Buttons describe the action: “Send invitation”, not “Submit”.
- Dates: `12 Nov 2026`; relative dates for < 7 days (`in 3 days`).
- Empty/error copy always says what happened and what to do next.
- Privacy copy is specific about what is public. Never bury opt-in.
