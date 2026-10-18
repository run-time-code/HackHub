# API Specification

Base URL: `/api`

This is the frontend integration contract currently used by the Vite app. Entries marked **Frontend assumption — confirm with backend** are not defined by a backend implementation in this repository and need agreement from the API owners before deployment.

## Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register; frontend sends `{ name, email, password }` |
| POST | `/auth/login` | Login; frontend sends `{ email, password }`; successful response must include `user` and may include an access token |
| POST | `/auth/logout` | Log out |
| GET | `/auth/me` | Current user; expected result includes `user` |
| POST | `/auth/forgot-password` | Request reset link |
| POST | `/auth/reset-password?token=...` | Set a new password |
| GET | `/auth/verify-email?token=...` | Verify email |
| POST | `/auth/change-password` | **Frontend assumption — confirm with backend**; change password |
| POST | `/auth/oauth/google` | **Frontend assumption — confirm with backend**; start Google OAuth and return `{ authorizationUrl }` |
| POST | `/auth/oauth/github` | **Frontend assumption — confirm with backend**; start GitHub OAuth and return `{ authorizationUrl }` |

The frontend sends cookies (`credentials: include`) and also supports an access token returned in the login response in memory for the current page session. Prefer secure, HttpOnly cookies for refresh/session tokens. The backend must configure credentialed CORS for the deployed frontend origin. OAuth start URLs can be overridden by `VITE_GOOGLE_OAUTH_START_URL` and `VITE_GITHUB_OAUTH_START_URL`; both routes must initiate provider authorization and respond with `{ "authorizationUrl": "https://..." }`. Configure OAuth redirect/callback handling on the backend.

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
| POST | `/saved` | Save; frontend sends `{ hackathonId }` |
| GET | `/saved` | List saved/registered/ongoing/completed; frontend expects an array (or `items`, `results`, `saved`, or `hackathons`) of records with `id`, `status`, `notes`, and nested `hackathon` data |
| PATCH | `/saved/:id` | Update status with `{ status }` or private notes with `{ notes }` |
| DELETE | `/saved/:id` | Unsave |

Dashboard summary counts and the upcoming deadline are calculated from `/saved`; there is no separate summary endpoint.

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
| GET | `/calendar?month=YYYY-MM` | Events for calendar; expected array of dated events with `date` (or `start`/`startsAt`/`startDate`), `type`, and hackathon details or an associated `hackathon` |
| POST | `/reminders` | Create reminder; frontend sends `{ hackathonId, eventType, daysBefore, channel }` |
| GET | `/reminders` | List reminders |
| GET | `/reminders/preferences` | **Frontend assumption — confirm with backend**; retrieve the user's saved default reminder settings |
| PUT | `/reminders/preferences` | **Frontend assumption — confirm with backend**; save `{ defaultDaysBefore, channels, quietHours: { start, end } }`, with quiet-hour times in IST |

Month, week, and agenda views use the month-based calendar endpoint. Calendar export (ICS download/subscription) remains optional and is not implemented until the backend confirms support.

## Profile and account

| Method | Endpoint | Description |
|---|---|---|
| PUT | `/users/me/onboarding` | **Frontend assumption — confirm with backend**; save `{ skills, interests, preferredMode, location }` |
| DELETE | `/users/me` | **Frontend assumption — confirm with backend**; delete the authenticated account |
| GET | `/users/me/export` | **Frontend assumption — confirm with backend**; return personal data as JSON |

## Expected response and error behavior

Successful JSON responses may be raw data or wrapped as `{ "success": true, "data": ... }`. List endpoints must return an array or an object containing the named array documented above. Failed requests should use a non-2xx status and return `{ "success": false, "error": "message", "code": "OPTIONAL_CODE" }` (or a `message` field). The frontend displays API failures rather than treating missing/unavailable data as an empty successful result.
