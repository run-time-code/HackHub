# API Specification

Base URL: `/api`

## Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register |
| POST | `/auth/login` | Login → JWT |
| GET | `/auth/me` | Current user |

## Hackathons
| Method | Endpoint | Query Params | Description |
|---|---|---|---|
| GET | `/hackathons` | `q, skills, domain, mode, prize, deadline, page, limit, sort` | List with filters |
| GET | `/hackathons/:id` | — | Detail + worthScore |
| POST | `/hackathons` | — | Create (admin) |
| GET | `/hackathons/:id/worth-score` | — | Explain score breakdown |

## Dashboard / Save
| Method | Endpoint | Description |
|---|---|---|
| POST | `/saved` | Save hackathon |
| GET | `/saved` | List saved/registered/ongoing/completed |
| PATCH | `/saved/:id` | Update status |
| DELETE | `/saved/:id` | Unsave |

## Teams
| Method | Endpoint | Description |
|---|---|---|
| POST | `/teams` | Create team (leader = caller) |
| GET | `/teams?hackathonId=<id>&status=open&page=1&limit=20` | List teams by hackathon |
| GET | `/teams/:id` | Team detail with members, size and open slots |
| PATCH | `/teams/:id` | Leader edits name/description/rolesNeeded/maxTeamSize/status |
| DELETE | `/teams/:id` | Leader deletes the team (pending requests are cancelled) |
| PATCH | `/teams/:id/leader` | Leader hands off to an existing member (`{ userId }`) |

## Teammate discovery
| Method | Endpoint | Description |
|---|---|---|
| GET | `/users/discover?skills=react,node&availability=available&lookingForTeam=true` | Opt-in users only, ranked by skill match |

## Join requests and invitations
| Method | Endpoint | Description |
|---|---|---|
| POST | `/teams/:id/requests` | Ask to join (`{ role?, message? }`) |
| POST | `/teams/:id/invitations` | Leader invites a user (`{ userId, role?, message? }`) |
| GET | `/teams/:id/requests?type=request\|invite` | Leader lists pending rows |
| GET | `/team-requests/mine?status=pending` | My sent requests and received/sent invitations |
| PATCH | `/team-requests/:id` | Respond (`{ action: "accept" \| "decline" }`) |
| DELETE | `/team-requests/:id` | Cancel a pending request/invitation |

States: `pending → accepted | declined | cancelled | expired`. A user may
send at most `MAX_JOIN_REQUESTS_PER_DAY` (default 10) join requests per
rolling 24 hours. Duplicates, self-requests, full/closed teams, and
accepting when the team filled up are rejected. Filling the last seat closes
the team automatically and cancels the remaining queue.

## Notifications
| Method | Endpoint | Description |
|---|---|---|
| GET | `/notifications?unreadOnly=true&page=1&limit=20` | List notifications (polling fallback) |
| PATCH | `/notifications/:id/read` | Mark one as read |
| PATCH | `/notifications/read-all` | Mark all as read |
| GET | `/notifications/stream` | SSE stream (`event: notification`); send the session cookie |

## Calendar & Reminders
| Method | Endpoint | Description |
|---|---|---|
| GET | `/calendar?month=2026-09` | Events for calendar |
| POST | `/reminders` | Create reminder |
| GET | `/reminders` | List reminders |

## Responses
```json
{ "success": true, "data": { "items": [], "page": 1, "limit": 20, "total": 100 }, "requestId": "..." }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "..." }, "requestId": "..." }
```
Every response carries `x-request-id`; include it in bug reports.
Server-Sent Events (`/notifications/stream`) are exempt from the JSON envelope.

## Auth Header
```
Authorization: Bearer <JWT>
```
