# DevOps and Delivery

ArrowEra is a full-stack Node.js application: a Vite-built React frontend and a Node.js HTTP API are served by the same Railway service. GitHub Actions validates changes; Railway's GitHub integration deploys commits from the production branch.

## Delivery architecture

~~~text
Pull request
    |
    v
GitHub Actions CI
  - npm ci
  - TypeScript type-check
  - ESLint
  - unit and integration tests
  - Vite production build
  - local production-server smoke test
    |
    v
CodeQL + Dependency Review
    |
    v
Required checks pass
    |
    v
Merge to main
    |
    v
Railway GitHub integration
  - npm ci && npm run build
  - npm run start:backend
  - Railway health check: /api/health
    |
    v
Railway production smoke test
~~~

## CI workflow

CI runs on pull requests targeting main and pushes to main or supported working branches. Its matrix tests Node.js 24.12.0, the minimum version declared by package.json, and the latest Node 24 release.

Each matrix job installs from package-lock.json with npm ci, runs type-checking, lint, tests, builds the app, and runs scripts/smoke-test.sh. The smoke test starts the actual production server and checks the health endpoint, compiled frontend, favicon, and analysis API.

The latest Node 24 job uploads dist/ as the arrowera-production-dist artifact for seven days. Railway performs its own build during deployment.

## Railway production configuration

The existing railway.json is the deployment configuration:

- Builder: Nixpacks.
- Build command: npm ci && npm run build.
- Start command: npm run start:backend.
- Health check: /api/health.
- Restart policy: on failure.

Configure the Railway service once:

1. Connect this GitHub repository to a Railway project.
2. Set the production branch to main.
3. Keep the service root directory at the repository root so railway.json is detected.
4. Enable automatic deployment when main receives a new commit.
5. Generate or attach a Railway public HTTPS domain.
6. Confirm the first deployment reports a healthy service.

The backend binds to 0.0.0.0 and reads its port from PORT, as required by Railway. The current implementation does not require a database or application secrets.

## Production smoke test setup

The Railway Deployment Smoke Test workflow runs after a successful CI workflow on main. It checks:

- GET /api/health returns the expected healthy service identity.
- GET / serves the production frontend.
- POST /api/analyze returns a non-empty analysis result.

To enable it:

1. Open repository Settings.
2. Go to Secrets and variables → Actions → Variables.
3. Create a repository variable named RAILWAY_PUBLIC_URL.
4. Set its value to the full public HTTPS origin, for example https://your-service.up.railway.app (do not append /api/health).
5. Save the variable.

The workflow retries the health request while Railway completes its deployment. It can also be started manually from the Actions tab. If the variable is absent, the production smoke job is skipped rather than failing.

## Branch protection

Configure a ruleset or branch protection rule for main after the first successful CI run:

- Require a pull request before merging.
- Require Validate (Node 24.12.0) and Validate (Node 24).
- Require Analyze JavaScript and TypeScript.
- Require Review dependency changes after Dependency Graph is enabled.
- Block force pushes and branch deletion.
- Consider requiring branches to be up to date before merging.

Do not require an approving review if the repository has only one maintainer and no eligible second reviewer. Required status-check names must exactly match the names displayed by GitHub Actions.

## Repository security setup

Dependency Review needs GitHub's Dependency Graph. The initial workflow run returned HTTP 403 from the dependency-review API, which means the repository-side feature or API access is not enabled for this check; it is not a finding that the PR contains a vulnerable package.

Enable it once:

1. Open repository Settings.
2. Select Advanced Security.
3. Enable Dependency graph.
4. Enable Dependabot alerts and Dependabot security updates where available.

After enabling Dependency Graph, rerun the failed Dependency Review job. See GitHub's repository security quickstart:
https://docs.github.com/en/code-security/getting-started/quickstart-for-securing-your-repository

CodeQL scans JavaScript and TypeScript on pull requests, pushes to main, and weekly. Dependabot checks npm packages and GitHub Actions weekly. Patch and minor npm updates are grouped by dependency type; major updates are reviewed individually. TypeScript major updates are currently ignored because the installed typescript-eslint peer range does not support TypeScript 7.

Enable secret scanning and push protection in Advanced Security when available. Never commit credentials, Railway tokens, API keys, or local environment files. The current deployment uses Railway's GitHub integration and therefore does not need a Railway token in GitHub Actions.

## Reproducible local validation

Use Node.js 24.12.0 or later:

~~~bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
bash scripts/smoke-test.sh
~~~

Use npm install only when intentionally changing dependencies. Review and commit package.json and package-lock.json together.

## Rollback

Railway deploys commits from main. To roll back a faulty release:

1. Identify the commit associated with the faulty deployment.
2. Create a revert commit through a pull request.
3. Wait for all required CI and security checks.
4. Merge the revert to main.
5. Railway automatically deploys the reverted main branch.
6. Confirm the deployment health check and Railway smoke test pass.

This keeps the rollback auditable and avoids deploying an unreviewed local build.

## Scope decisions

GitHub Pages is not used because the frontend and API are now served together by the Railway Node.js service. Docker, Kubernetes, Terraform, and a separate database are excluded until the application needs infrastructure beyond its current single-service architecture.
