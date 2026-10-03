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
| GET | `/users?skills=react,ml` | Find teammates |
| POST | `/teams` | Create team |
| GET | `/teams/:id` | Team detail |
| POST | `/teams/:id/request` | Send collaboration request |
| PATCH | `/teams/:id/members` | Accept/reject |

## Calendar & Reminders
| Method | Endpoint | Description |
|---|---|---|
| GET | `/calendar?month=2026-09` | Events for calendar |
| POST | `/reminders` | Create reminder |
| GET | `/reminders` | List reminders |

## Responses
```json
{ "success": true, "data": [], "pagination": { "page": 1, "total": 100 } }
{ "success": false, "error": "message" }
```

## Auth Header
```
Authorization: Bearer <JWT>
```
