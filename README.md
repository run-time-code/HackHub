# HackHub Frontend — Work Area 1

React + Vite implementation of the Week 1–3 Design System & Hackathon Discovery UI from the provided schedule.

## Requirements
- Node.js 18+ (Node 20 LTS recommended)
- VS Code

## Run in VS Code
1. Extract the ZIP.
2. Open the `hackhub-frontend` folder in VS Code.
3. Open Terminal → New Terminal.
4. Run:

```bash
npm install
npm run dev
```

5. Open the local URL Vite prints (usually `http://localhost:5173`).

To verify a production build:

```bash
npm run build
```

## What works with demo data
- Week 1: reusable UI components, hackathon cards and detail modal, empty states.
- Week 2: live keyword filtering, domain/mode/skill/prize filters, URL query-state sync, sorting, saved state in localStorage, compare selection up to three.
- Week 3: Worth Score badge (0–100), six-factor explanation panel, For You / Ending Soon / Trending / New This Week sections, graceful undisclosed-prize label, Not relevant action.
- Responsive desktop/mobile layout.

The initial data is in `src/data.js`. It is sample/demo content, not real event data.

## Connect the team's APIs
1. Copy `.env.example` to `.env` in the project root.
2. Ask teammates for the exact base URLs, routes, auth method, and JSON response shapes.
3. Set `VITE_HACKATHON_API_BASE_URL` and `VITE_BOOKMARK_API_BASE_URL` to the confirmed URLs.
4. The current adapter expects `GET {base}/hackathons` to return either an array or `{ "items": [...] }` / `{ "hackathons": [...] }`.
5. Bookmark adapter currently assumes `POST /bookmarks` with `{ "hackathonId": "..." }`, `DELETE /bookmarks/:id`, and `POST /feedback` with `{ "hackathonId": "...", "feedback": "not_relevant" }`. Change these only to match Berwin's actual API contract.
6. If Selva's Worth Score endpoint provides score/factors/reasons, map its actual response in `normalize()` in `src/App.jsx` and the data adapter. Until then, the UI uses demo scores/factors.

### API keys and secrets
- Do not invent a key or commit a real key to Git.
- Do not place private server keys in `VITE_*` variables; Vite exposes these values to browser code.
- If a secret key is required, the backend should keep it server-side and expose a safe endpoint for the frontend.
- The optional `VITE_PUBLIC_API_KEY` is only for a key explicitly documented by your team as safe for browser use; it is not wired in by default.

## Main structure

```text
hackhub-frontend/
├── .env.example
├── index.html
├── package.json
├── README.md
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── data.js
    ├── styles.css
    ├── components/
    │   └── UI.jsx
    └── services/
        └── api.js
```

## Notes before team integration
- This is a Vite React JavaScript starter rather than Next.js. The schedule recommends Next.js, but this setup is intentionally straightforward to run locally. If your team mandates Next.js + TypeScript, confirm before merging.
- The API adapter uses standard `fetch`. Add auth headers only after the backend team confirms the required auth scheme.
- Registration links should come from the event API; no fake registration URL is created here.
