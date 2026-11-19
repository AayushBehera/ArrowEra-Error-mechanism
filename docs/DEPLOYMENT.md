# Production Deployment Guide

ArrowEra is designed to run as **one Node.js service**: Railway builds the Vite frontend, then the Node server serves the compiled frontend and the JSON API from the same origin.

Do not deploy this version as a static-only site. The frontend sends analysis requests to `/api/analyze`; GitHub Pages and other static hosts cannot run the Node API.

## Railway service configuration

1. Create a Railway project and add a service from the GitHub repository `AayushBehera/ArrowEra-Error-mechanism`.
2. Set the production branch to `main`. Use a separate Railway environment for any preview service.
3. Set the service root directory to the repository root.
4. Keep the build and start commands managed by the committed `railway.json`:
   - Build: `npm ci && npm run build`
   - Start: `npm run start:backend`
5. Do not hard-code a port. Railway supplies `PORT`; the server listens on `0.0.0.0`.
6. Generate a Railway public domain and enable automatic deployments from `main`.
7. Keep database provisioning disabled for this assignment stage. The application intentionally uses browser-local history and does not require a database URL or application secrets.

## Deployment verification

After Railway reports a successful deployment, verify:

| Check | Expected result |
|---|---|
| `https://YOUR-DOMAIN/` | Application HTML loads |
| `https://YOUR-DOMAIN/api/health` | HTTP 200 JSON with `status: "ok"` |
| Submit a sample error in the UI | Diagnosis appears without a cross-origin/API error |
| Refresh the browser | UI loads again and browser-local history remains available |

Run the same static and API checks against a local production build before deploying:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run smoke
npm run start:backend
```

## Rollback

Use Railway's deployment history to redeploy the last known-good deployment. Check the service logs and `/api/health` before switching traffic back. The previous deployment should remain available until the new one has passed the checks above.

## Current operational limits

- History is kept in each browser's `localStorage`; it is not shared across browsers or devices.
- The backend does not persist submitted stack traces or diagnosis results.
- Rate limiting is in-memory and local to one Node process. It is suitable as a lightweight guard for this single-service assignment, not a distributed abuse-control layer.
- Authentication, database persistence, and multi-instance coordination are intentionally out of scope.
