# ArrowEra automated DevOps engine

## Implemented automation
- Multi-stage production Docker image build.
- Trivy scan blocks publishing when fixable CRITICAL/HIGH vulnerabilities are found.
- Successful main-branch images publish to GitHub Container Registry (GHCR) using the repository-scoped Actions token.
- AI remediation branches run validation before the backend opens a pull request.
- GitHub Actions jobs, deployment-provider status and runtime telemetry are exposed through backend integration endpoints.

## Required GitHub configuration
Enable Actions. The container workflow needs the repository Actions token to have packages: write; organization package policies can still block publication. The first GHCR package may need its visibility adjusted.

For private repository access, configure GITHUB_TOKEN on the backend with Contents read/write, Pull requests read/write, Actions read and Checks read. Use a fine-grained token scoped only to the target repository.

## Deployment provider configuration

Render: RENDER_API_KEY and RENDER_SERVICE_ID.

Vercel: VERCEL_TOKEN and VERCEL_PROJECT_ID; VERCEL_TEAM_ID is optional.

A supplied live URL can still be health-checked without provider credentials. Provider credentials unlock provider-native deployment history and logs. Keep credentials in the hosting provider's secret environment, never in browser storage or repository files.

## AI remediation safety
AI proposals are restricted to a source/config allow-list. ArrowEra writes a temporary arrowera/fix-* branch, waits for GitHub Actions validation, and only then opens a pull request. Failed, missing or timed-out validation must not create a PR. Production deployment remains human-approved after review and merge.

## Runtime observability
The backend emits a per-request x-trace-id and retains a bounded in-memory request trace buffer. Provider logs are retrieved from Render or Vercel when credentials are configured. In-memory traces reset on restart; durable distributed tracing requires an external telemetry backend.
