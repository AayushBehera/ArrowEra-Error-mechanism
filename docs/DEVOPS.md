# DevOps and Delivery

This project is a static React, TypeScript, and Vite application. It has no server process or database, so its delivery pipeline uses GitHub Actions and GitHub Pages rather than container or cloud infrastructure.

## Delivery pipeline

1. A pull request targeting main runs the reusable CI workflow on Node.js 22 and 24.
2. Each CI matrix job installs the exact lockfile dependencies, type-checks, lints, runs the test suite, and creates a production build.
3. Dependency Review checks pull-request dependency changes. CodeQL scans JavaScript and TypeScript on pull requests, main pushes, and a weekly schedule.
4. A push to main starts the deployment workflow. That workflow calls the same CI workflow and cannot publish unless both Node.js validation jobs pass.
5. The deployment job builds the application, uploads dist as a GitHub Pages artifact, deploys it, and checks the published page and favicon over HTTPS.

## One-time GitHub Pages setup

The repository owner must enable the Pages publishing source once:

1. Open the repository Settings.
2. Open Pages under the Code and automation section.
3. Under Build and deployment, set Source to GitHub Actions.
4. Save the setting.

The expected project-site URL is:

https://aayushbehera.github.io/ArrowEra-Error-mechanism/

The URL becomes active after the first successful deployment. No personal access token or repository secret is required; the workflow uses the scoped GITHUB_TOKEN and the Pages OIDC deployment permission.

## Branch protection

After the first pull-request runs have completed, configure a ruleset or branch protection rule for main:

- Require pull requests before merging.
- Require the CI checks Validate (Node 22) and Validate (Node 24).
- Require Analyze JavaScript and TypeScript.
- Require Review dependency changes.
- Require branches to be up to date before merging if the additional queue time is acceptable.
- Block force pushes and branch deletion.

For a solo-maintainer repository, requiring an additional approving review can prevent the owner from merging their own work. Enable that requirement only when another reviewer is available.

## Deployment environment

The workflow creates or uses the github-pages environment. In repository Settings > Environments, restrict deployments for this environment to the main branch. Add required reviewers only when a release approval step is actually needed.

## Local development and reproducible builds

Use Node.js 22.12 or newer, or Node.js 24.

~~~bash
npm ci
npm run dev
~~~

Run the same validation commands used by CI before opening a pull request:

~~~bash
npm run typecheck
npm run lint
npm test
npm run build
~~~

The committed package-lock.json is the dependency source of truth. Use npm install when intentionally changing dependencies, review the lockfile diff, and commit package.json and package-lock.json together.

## Dependency and code security

- Dependabot checks npm dependencies and GitHub Actions versions weekly.
- Dependency Review blocks pull requests that introduce dependencies with high or critical known severity.
- CodeQL scans the JavaScript and TypeScript codebase and runs weekly.
- Workflows grant only the permissions needed by each job.
- Do not commit API keys, tokens, credentials, or local environment files.

Enable secret scanning and push protection under the repository's Code security settings when those controls are available for the repository.

## Rollback procedure

Deployments are tied to commits on main. To roll back a faulty release:

1. Identify the commit that introduced the deployment regression.
2. Create a revert commit through a pull request.
3. Wait for the CI checks to pass and merge the revert.
4. The normal deployment workflow republishes the reverted application.

This preserves an auditable history and avoids deploying an unreviewed or locally modified build.

## Troubleshooting

- **Pages returns a 404:** confirm that the Pages source is GitHub Actions and that the latest deployment completed successfully.
- **The page loads without styles, scripts, or images:** confirm the Vite base path in vite.config.ts matches the repository project-site path.
- **Deployment did not start:** confirm the change was merged to main and inspect the Deploy to GitHub Pages workflow run.
- **A deployment failed its smoke check:** inspect the build/deploy logs and verify the Pages environment is allowed to deploy from main.

## Scope decisions

Docker, Kubernetes, Terraform, and a cloud-hosted backend are intentionally excluded. The application currently produces static browser assets; adding server infrastructure would increase maintenance without solving a current project requirement. Revisit those tools only if the product gains an API, persistent server-side data, or infrastructure that must be provisioned.
