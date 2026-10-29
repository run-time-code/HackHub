# API Specification

> Cookie session + CSRF. Every mutation sends the `psifi.x-csrf-token`
> cookie (staged/prod: `__Host-psifi.x-csrf-token`) plus the matching
> `X-CSRF-Token` header. Sessions are httpOnly `accessToken`/`refreshToken`
> cookies.

Base URL: `/api`

## Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register |
| POST | `/auth/login` | Login (sets session cookies) |
| POST | `/auth/refresh` | Rotate session after 15-min expiry |
| POST | `/auth/logout` | Clear session |
| GET | `/auth/csrf-token` | CSRF bootstrap |
| GET | `/auth/verify-email?token=` | Verify email address |
| POST | `/auth/resend-verification` | Re-send verification link |
| POST | `/auth/forgot-password` | Request reset |
| POST | `/auth/reset-password` | Reset with token |
| GET | `/auth/me` | Session restore (mirrors `/users/me`) |
| GET | `/auth/google` · `/auth/github` | Start OAuth handshake (same-window); callback redirects to `${FRONTEND_URL}/?oauth=...` |
| GET | `/users/me` | Current user (secret-free) |
| PUT | `/users/me` | Update profile (CSRF). Accepts `headline`, `year`, `links{github,linkedin,portfolio}`, `pastHackathons[{name,year,projectUrl}]`, `skillProficiency{skill: beginner\|intermediate\|advanced\|expert}`, `availability`, `lookingForTeam`, `discoverable`, plus existing fields. Links must be empty or http(s) URLs. |

`GET /users/me` returns `id,name,email,role,bio,college,location,headline,year,links,pastHackathons,skills,skillProficiency,preferences,avatarUrl,availability,lookingForTeam,discoverable,emailVerified,createdAt,updatedAt`.
`GET /users/public/:id` returns `id,name,bio,college,location,headline,year,skills,skillProficiency,links,pastHackathons,avatarUrl,availability,lookingForTeam,createdAt` and never email, preferences or discoverable.

## Hackathons (public catalogue for the team feature)
| Method | Endpoint | Query | Description |
|---|---|---|---|
| GET | `/hackathons?q=&page=&limit=` | search + pagination | List visible hackathons |
| GET | `/hackathons/:id` | ObjectId **or** slug | Detail. Use `id` for `/teams` |

Identifier decision (F-05b): teams reference hackathons by ObjectId (`id`
from this endpoint). Saved hackathons/registrations keep the long-lived
`hackathon_id` slug string. Both are exposed here so clients never guess.

## Dashboard / Save
| Method | Endpoint | Description |
|---|---|---|
| POST | `/saved-hackathons/save` | Save hackathon (`{ hackathon }` slug) |
| POST | `/saved-hackathons/unsave` | Unsave |
| POST | `/saved-hackathons/register` | Mark registered |
| POST | `/saved-hackathons/notes` | Notes |
| GET | `/saved-hackathons/status/:hackathon` | Status by slug |
| GET | `/dashboard/summary` | Personal dashboard counts |

## Teams
| Method | Endpoint | Description |
|---|---|---|
| POST | `/teams` | Create team (leader = caller) |
| GET | `/teams?hackathonId=<id>&status=open&page=1&limit=20` | List teams by hackathon |
| GET | `/teams/mine` | Teams I lead or belong to, newest first (`{ items }`, auth required) |
| GET | `/teams/:id` | Team detail with members, size, open slots and `hackathonTitle` |
| PATCH | `/teams/:id` | Leader edits name/description/rolesNeeded/maxTeamSize/status |
| DELETE | `/teams/:id` | Leader deletes the team (pending requests are cancelled) |
| PATCH | `/teams/:id/leader` | Leader hands off to an existing member (`{ userId }`) |
| DELETE | `/teams/:id/members/:userId` | Self-leave or leader-removal; freed seat reopens a closed team |

## Teammate discovery
| Method | Endpoint | Description |
|---|---|---|
| GET | `/users/discover?q=&skills=react,node&interests=ai,climate&availability=available&lookingForTeam=true` | Opt-in users only, ranked by skill/interest match. `q` searches name/headline/skills; `interests` is comma-separated (max 10). Items expose profile enrichment plus `matchCount,matchScore,matchedSkills,matchedInterests`. |

## Join requests and invitations
| Method | Endpoint | Description |
|---|---|---|
| POST | `/teams/:id/requests` | Ask to join (`{ role?, message? }`) |
| POST | `/teams/:id/invitations` | Leader invites a user (`{ userId, role?, message? }`) |
| GET | `/teams/:id/requests?type=request\|invite` | Leader lists pending rows |
| GET | `/team-requests/mine?status=pending` | My sent requests, received/sent invitations, and pending requests targeting teams I lead. Each `team` object includes `leader`. |
| PATCH | `/team-requests/:id` | Respond (`{ action: "accept" \| "decline" }`) |
| DELETE | `/team-requests/:id` | Cancel a pending request/invitation |

States: `pending -> accepted | declined | cancelled | expired`. A user may
send at most `MAX_JOIN_REQUESTS_PER_DAY` (default 10) join requests per
rolling 24 hours. Team writes are additionally throttled at 100/hour per
user (`teamWriteLimiter`). Duplicates, self-requests, full/closed teams, and
accepting when the team filled up are rejected. Filling the last seat closes
the team automatically and cancels the remaining queue.

## Public stats & feedback
| Method | Endpoint | Description |
|---|---|---|
| GET | `/stats` | Public counters `{hackathons,teams,builders,openTeams,matches}` |
| POST | `/feedback` | Anonymous feedback (`{ type: general\|bug\|feature\|content, message: 5-2000 chars, page?, email? }`) |

## Notifications
| Method | Endpoint | Description |
|---|---|---|
| GET | `/notifications?unreadOnly=true&page=1&limit=20` | List notifications (polling fallback) |
| PATCH | `/notifications/:id/read` | Mark one as read |
| PATCH | `/notifications/read-all` | Mark all as read |
| GET | `/notifications/stream` | SSE stream (`event: notification`); send the session cookie |

## Admin (admin role + CSRF)
| Method | Endpoint | Description |
|---|---|---|
| PATCH | `/admin/hackathons/:hackathon_id/visibility` | Hide/unhide |
| PATCH | `/admin/hackathons/:hackathon_id/featured` | Feature/unfeature |
| PATCH | `/admin/hackathons/:hackathon_id` | Edit title/deadline/active |
| PATCH | `/admin/users/:userId/ban` | Ban |
| PATCH | `/admin/users/:userId/unban` | Unban |
| GET | `/admin/reports` | Admin report |

## Health / metrics
| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` (also `/api/health`) | `{ status, db }`; **503 + `degraded`** when Mongo is down |
| GET | `/metrics` | Prometheus text; requires `Authorization: Bearer <METRICS_TOKEN>` |

## Responses
```json
{ "success": true, "data": { "items": [], "page": 1, "limit": 20, "total": 100 }, "requestId": "..." }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "..." }, "requestId": "..." }
```
Legacy auth/profile routers use a plain `{ message, data }` shape; the new
routers use the `{ success, data/error, requestId }` envelope above.
Every response carries `x-request-id` (client values accepted only when they
match `^[A-Za-z0-9_-]{8,64}$`); include it in bug reports.
Server-Sent Events (`/notifications/stream`) are exempt from the JSON envelope.

## Frontend integration notes

The Vite app (`apps/web`) calls the endpoints below. Rows marked **Frontend
assumption** have no backend implementation in this repository yet and need
agreement from the API owners before deployment.

### Calendar & reminders — frontend assumption
| Method | Endpoint | Description |
|---|---|---|
| GET | `/calendar?month=YYYY-MM` | Events for the month; the app tolerates `date`/`start`/`startsAt`/`startDate` and nested `hackathon` data |
| POST | `/reminders` | Create reminder `{ hackathonId, eventType, daysBefore, channel }` |
| GET | `/reminders` | List reminders |
| GET | `/reminders/preferences` | **Frontend assumption**; saved default reminder settings |
| PUT | `/reminders/preferences` | **Frontend assumption**; save `{ defaultDaysBefore, channels, quietHours: { start, end } }` (IST) |

Month, week, and agenda views use the month-based calendar endpoint. Calendar
export (ICS download/subscription) stays optional until the backend confirms it.

### Account settings
| Method | Endpoint | Description |
|---|---|---|
| PUT | `/users/me/change-password` | Change password (`{ currentPassword, newPassword }`) |
| DELETE | `/users/me` | Delete the authenticated account |
| GET | `/users/me/export` | Personal data export as JSON |

### Saved hackathons / dashboard — needs reconciliation
The redesigned dashboard and discovery screens currently use `POST /saved`
(`{ hackathonId }`), `GET /saved`, `PATCH /saved/:id`, and `DELETE /saved/:id`.
The implemented backend uses `/saved-hackathons/*` (`{ hackathon }` slug) plus
`GET /dashboard/summary`. The frontend client must be reconciled with those
routes before release.

## Planned (not implemented)
Calendar/reminders, hackathon facets, Worth Score endpoints.
