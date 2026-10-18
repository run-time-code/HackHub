# HackHub frontend

The frontend is a React 19 + Vite application with routes for authentication, onboarding, dashboard tracking, hackathon discovery, calendar/reminders, and account settings.

## Local development

Requirements: Node.js 18+ and npm.

```sh
npm install
npm run dev
```

Set `VITE_API_BASE_URL` to the backend API URL (for example, `http://localhost:5000/api`). `VITE_API_URL` is also accepted for compatibility with the repository's original environment example. If neither is set, the app uses `http://localhost:5000/api`. Google and GitHub sign-in navigate to the API's `/auth/google` and `/auth/github` routes, which start the provider handshake and redirect back to the SPA.

Useful checks:

```sh
npm run lint
npm run build
```

## Frontend routes

- Public auth panels share `/auth?panel=...`; the older auth URLs redirect to the matching panel.
- Protected product sections share `/app?section=...`; older section URLs redirect to their matching section.

Auth requests include credentials for cookie sessions. The API client also accepts an access token returned in an auth response in memory; it does not persist bearer tokens to local storage.

## Backend integration

The API contract and any unconfirmed frontend assumptions are documented in [`../docs/API_SPEC.md`](../docs/API_SPEC.md). API-dependent screens display loading, error, and genuine empty states; they do not substitute mock records when the backend is unavailable. Confirm the marked provisional endpoints and response shapes with the backend owners before production deployment.
