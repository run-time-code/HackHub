# XSS Target Inventory — Source Review

**Review date:** 12 November 2026  
**Runtime target scope:** Local HackHub only  
**Active requests to input endpoints:** None  
**Conclusion:** No suitable unauthenticated, non-state-changing XSS target was identified for an active XSStrike scan.

## Candidate public GET routes

| Route / surface | User-controlled content and rendering | Safe to inspect locally? | Assessment |
|---|---|---|---|
| `GET /api/hackathons` and `GET /api/hackathons/:id` | Search/filter values reach catalogue queries; titles/descriptions render as React text. Imported hackathon URLs render as links. | GET-only route, but no XSS payload was sent. | Relevant read surface; no confirmed XSS. Imported URL is an unconfirmed link-sink candidate. |
| `GET /api/teams` and `GET /api/teams/:id` | Team names/descriptions render as React text. | GET-only route, but no XSS payload was sent. | No raw-HTML rendering sink identified in reviewed components. |
| `GET /api/users/public/:id` and UI `/u/:id` | Profile fields render as React text; profile URLs are validated server-side to HTTP(S). | Public read, but no XSS payload was sent. | No confirmed XSS sink identified. |
| UI `/discover/:id` and `/discover` | Protected app route; user discovery surfaces are behind authentication. | Not suitable without a test account/approval. | Excluded from active testing. |

## Other input categories

- Feedback is accepted through `POST /api/feedback`; no GET rendering surface for stored feedback was identified. State-changing submissions were excluded.
- Profile, team, and other user-generated write fields require mutation requests and/or an authenticated session. They were not tested.
- URL parameters were reviewed as route selectors or fixed OAuth outcome controls; no parameter was identified as an HTML-rendering sink.
- Catalogue search/filter GET inputs exist, but the reviewed page renders returned textual values using React text rendering; no unsafe reflected-HTML context was established.

## Potential candidate requiring manual verification

Hackathon URLs from Devpost ingestion flow through the public catalogue and render as links in HackathonCard, HackathonDetail, and Calendar. The review did not establish that an attacker can control the imported URL or that the browser would execute an unsafe scheme. This is not a confirmed XSS finding and is not sufficient evidence for a severity rating or remediation.

## Source references

- API routes: `apps/api/src/routes/hackathons.js:14–15`; `apps/api/src/routes/teams.js:16,30`; `apps/api/routes/userRoutes.js:49`
- Text rendering: `apps/web/src/pages/Discover.jsx`; `apps/web/src/pages/HackathonDetail.jsx:83–84`; `apps/web/src/components/teams/TeamCard.jsx:31–34`; `apps/web/src/pages/app/TeamDetail.jsx:447–449`
- Profile URL validation: `apps/api/validators/userValidator.js:5–12`
- Protected routes: `apps/web/src/App.jsx:106,126`
- Feedback route: `apps/api/src/routes/feedback.js:12`
- Candidate ingestion/link path: `apps/api/src/services/devpostIngestionService.js:53`; `apps/api/src/services/hackathonsService.js:39`; `apps/web/src/components/HackathonCard.jsx:56`; `apps/web/src/pages/HackathonDetail.jsx:90`; `apps/web/src/pages/Calendar.jsx:363`
