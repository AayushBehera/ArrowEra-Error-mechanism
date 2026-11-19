# ArrowEra Error Mechanism

An error triage and reasoning workbench. Paste an error message or stack trace to receive a transparent, deterministic diagnosis with a reasoning chain and actionable fixes.

## Architecture

- **Frontend:** React, TypeScript, Vite and Tailwind CSS.
- **Backend:** Node.js HTTP server using built-in modules.
- **Diagnostic engine:** Existing deterministic TypeScript engine, shared by the browser build and backend runtime.
- **Persistence:** Browser history remains in localStorage. Server-side database persistence is intentionally deferred.
- **Deployment:** A single Railway service builds the frontend and serves it alongside the API.

The backend uses Node.js native TypeScript type stripping to execute the existing engine without introducing a second implementation or adding runtime dependencies. Use Node.js 24.12 or later.

## Getting started

```bash
npm ci
npm run dev:backend
```

In a second terminal:

```bash
npm run dev
```

The Vite development server proxies `/api` requests to the backend on port 3001.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite frontend |
| `npm run dev:backend` | Start the local API server |
| `npm run start:backend` | Start the production server |
| `npm run build` | Type-check and build the frontend |
| `npm run typecheck` | Run TypeScript checks |
| `npm run lint` | Run ESLint |
| `npm test` | Run analyzer and backend integration tests |

## API

### `GET /api/health`

Returns service health and a timestamp.

### `POST /api/analyze`

Request:

```json
{
  "input": "TypeError: Cannot read properties of undefined"
}
```

Returns the same `AnalysisResult` structure used by the existing diagnostic UI.

Input is limited to 50,000 characters and request bodies to 64 KB. Analysis requests are rate-limited per client address. The API returns JSON errors for invalid requests.

## Railway deployment

1. Create a Railway project and connect this GitHub repository.
2. Configure the service to deploy from the intended branch (use `main` for production).
3. Railway detects `railway.json`, runs `npm ci && npm run build`, then starts `npm run start:backend`.
4. Configure a public domain in Railway.
5. Confirm the deployment health check succeeds at `/api/health`.

The service binds to `0.0.0.0` and uses Railway's `PORT` environment variable. No database or secrets are required for this initial release. Railway deployment is configured through the Railway GitHub integration; GitHub Actions validates pull requests before merge.

## CI and security automation

GitHub Actions validates type-checking, lint, tests and the production build on pushes and pull requests. The build output is uploaded as a short-lived artifact. CodeQL scans JavaScript/TypeScript, Dependency Review checks pull-request dependency changes, and Dependabot checks npm and GitHub Actions dependencies weekly.

## Data and privacy

Analysis requests are processed in memory and are not persisted by the backend. The existing localStorage history remains browser-local. Avoid pasting credentials, access tokens, private keys or other secrets into diagnostic input.

## Existing diagnostic rules

The deterministic engine and all 18 existing rules are retained. The displayed heuristic score is an evidence-ranking aid, not a calibrated probability.
