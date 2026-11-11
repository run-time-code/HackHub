# Hackathon scraping & catalogue ingestion

HackHub fills its catalogue from many hackathon platforms. This document covers
what is scraped, how the pieces fit, how to run it, and what cannot be scraped
(and why).

## Sources

| Key | Platform | Method | Status |
|---|---|---|---|
| `devpost` | Devpost | Public JSON feed `devpost.com/api/hackathons` (open + upcoming, paginated) | Verified working |
| `devfolio` | Devfolio | Public JSON feed `api.devfolio.co/api/hackathons` | Verified working |
| `unstop` | Unstop | Public search feed `unstop.com/api/public/opportunity/search-new` (includes hiring hackathons) | Verified working |
| `hackerearth` | HackerEarth | Public JSON feed `hackerearth.com/chrome-extension/events/` | Verified working |
| `google` | Google / company pages | SerpAPI search results, only when `SERPAPI_KEY` is set | Opt-in |
| any | Custom HTML page | Configurable CSS-selector adapter (`src/scrapers/sources/htmlSources.json`) | Template only |

MLH, Hack2Skill, LinkedIn and Google's own event pages do **not** expose a
public, scrape-friendly feed that we can rely on:

- **MLH** (`mlh.com/seasons/...`) redirects to a Cloudflare-fronted Inertia app
  that rejects requests without a signed page version, and renders events
  client-side. Scraping it requires a headless browser and is brittle.
- **Hack2Skill** and several Devfolio-style platforms are single-page apps whose
  listing payload is behind private endpoints.
- **LinkedIn** explicitly forbids scraping in its User Agreement and serves an
  authenticated wall. Hackathon posts there are personal feed items, not a
  public directory. Do not scrape it — use the SerpAPI discovery source or a
  manual submission flow instead.
- **Google** has no hackathon directory; "Google hackathons" are individual
  program pages (Solution Challenge, GDG events). The `google` source therefore
  uses a licensed search API to *discover* candidates, tagged
  `Search discovered`, rather than pretending to be a directory.

If you need one of these, the right paths are an official feed/partnership, a
headless-browser worker with the site's permission, or the configurable HTML
adapter below.

## How it works

```
scripts/scrape.js  ─┐
in-process cron    ─┼─▶ scrapers/run.js ─▶ sources/<platform>.js  (fetch + map)
admin API trigger  ─┘         │                    │
                              │                    ▼
                              │           scrapers/normalize.js  (dates, prizes,
                              │                                  slug, status,
                              │                                  dedupe key)
                              ▼
                    scrapers/ingest.js ─▶ MongoDB `Hackathons`
                              │
                              └─▶ `ScraperRuns` (one row per source per run)
```

Every adapter returns the same internal shape ("candidate"): source key,
external id, title, description, organizer, url, mode, location, start/end and
registration dates, prize, tags/themes/skills. Everything downstream is shared.

### Duplicate handling

1. **Same platform** — rows are upserted on `{ source, external_id }`.
2. **Cross-posted events** — `dedupeKey` is the slug of the title plus the
   month the event starts in (`buildDedupeKey`). The first source wins the
   canonical row; later sources are appended to the row's `sourceRecords`
   instead of creating a duplicate card, and counted as `duplicates`.
3. **Editorial fields** — `isHidden`/`isFeatured` are written only on insert, so
   a nightly run never undoes a moderator's action.
4. **Stale rows** — a row missing from a successful source run is flagged
   `is_active: false`. This is skipped when a run returns zero items, so a
   transient outage cannot blank the catalogue.
5. **Expiry** — events whose end date has passed are set to `status:
   completed`.

## Running it

```bash
# All enabled sources
npm run scrape --workspace @hackhub/api

# One source, no writes
npm run scrape --workspace @hackhub/api -- --source=devpost --dry-run

# Inspect registered sources
npm run scrape --workspace @hackhub/api -- --list

# Cap pagination while testing
npm run scrape --workspace @hackhub/api -- --source=unstop --pages=2
```

Requires `MONGODB_URI` (and, in staging/production, the usual `JWT_SECRET`,
`ACCESS_TOKEN_SECRET`, `CSRF_SECRET` because the shared config module validates
them). Exit code is `1` when every selected source failed.

### Daily scheduling

Pick one:

- **GitHub Actions (recommended for sleeping hosts)** —
  `.github/workflows/scrape-hackathons.yml` runs daily at 03:10 IST against the
  database. Set the `MONGODB_URI` repository secret; optionally `SERPAPI_KEY`.
  It can also be triggered manually with a source list or a dry run.
- **In-process cron** — set `SCRAPER_ENABLED=true` on an always-on host. The
  schedule comes from `SCRAPER_CRON` (default `30 2 * * *`) and
  `SCRAPER_TIMEZONE` (default `Asia/Kolkata`). Overlapping ticks are skipped.

Do not enable both against the same database on the same schedule; the dedupe
makes it safe, but it doubles third-party traffic.

### Admin endpoints

All require an authenticated admin (and CSRF, like the other admin routes):

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/admin/scrapers` | Registered sources + whether a run is in flight |
| `GET` | `/api/admin/scrapers/runs?limit=20` | Recent run history and stats |
| `POST` | `/api/admin/scrapers/run` | Run now; body `{ "sources": ["devpost"], "dryRun": false }` |

The HTTP trigger is for one-off checks and single sources. A full sweep can
outlast proxy timeouts — use the CLI or the scheduled job for that.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `SCRAPER_ENABLED` | `false` | Start the in-process daily job |
| `SCRAPER_CRON` | `30 2 * * *` | Cron expression for that job |
| `SCRAPER_TIMEZONE` | `Asia/Kolkata` | Timezone for the cron expression |
| `SCRAPER_SOURCES` | *(all)* | Comma-separated allowlist of source keys |
| `SCRAPER_MAX_PAGES` | `10` | Pagination cap per source |
| `SCRAPER_TIMEOUT_MS` | `20000` | Per-request timeout |
| `SCRAPER_USER_AGENT` | HackHubBot/1.0 | Identifying User-Agent (set a contact URL) |
| `SERPAPI_KEY` | *(empty)* | Enables the `google` discovery source |
| `SCRAPER_SEARCH_QUERIES` | *(built-in)* | `|`-separated queries for that source |

## Adding a source

**If the platform returns JSON:** add `src/scrapers/sources/<name>.js` exporting
`{ key, label, homepage, enabled, fetchCandidates, mapHackathon }`, then register
it in `src/scrapers/sources/index.js`. Map raw fields onto the candidate shape
using the helpers in `normalize.js`; do not re-implement date or prize parsing.

**If it only renders HTML:** describe the page in
`src/scrapers/sources/htmlSources.json` (see the template entry). Entries are
disabled by default. Check the site's `robots.txt` and terms first, verify the
selectors against the live markup, then set `"enabled": true`. Selectors of the
form `css@attr` read an attribute (for example `time@datetime`).

Either way, add a unit test with a captured fixture — parsers are pure and must
not hit the network in CI.

## Operating notes

- Be a good citizen: requests are throttled per host (750 ms), retried three
  times on 429/5xx with backoff, honour `Retry-After`, and identify
  themselves.
- A failing source never fails the run; it records a `failed` row in
  `ScraperRuns` with the error and the remaining sources continue. Check
  `GET /api/admin/scrapers/runs` or the workflow log when a platform goes quiet.
- Prize amounts are stored as the platform reports them. Unstop reports INR, so
  its figure is not directly comparable with USD prizes; `prize_pool` keeps the
  original formatted string for display.
- Records from the SerpAPI source carry the `Search discovered` tag and are
  candidates for review, not verified listings.
