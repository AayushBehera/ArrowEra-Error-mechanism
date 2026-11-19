# ArrowEra AI Copilot setup

The floating AI Copilot is implemented as a frontend chat panel backed by a server-side API proxy. It uses the OpenAI Chat Completions-compatible API format. The browser never receives the provider API key.

## Render environment variables

In the Render service, open **Environment** and add:

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `AI_API_KEY` | Yes, to enable chat | — | Provider API key |
| `AI_MODEL` | No | `gpt-4.1-mini` | Model identifier accepted by the provider |
| `AI_BASE_URL` | No | `https://api.openai.com/v1` | API base URL; must expose `/chat/completions` |

Save the environment changes and redeploy/restart the service. The Copilot status endpoint is `/api/ai/status`; chat requests go to `/api/ai/chat`.

## GitHub Actions telemetry

The operations workspace reads the latest eight workflow runs from the configured repository.

- `GITHUB_REPOSITORY`: `owner/repository`; defaults to this repository.
- `GITHUB_TOKEN`: optional token with read access to Actions for private repositories or higher API limits. Use a fine-grained token with only the repository Actions read permission needed for this feed.

## Security notes

- Never commit an actual API key or token. Configure secrets in Render.
- The backend applies request-size and per-IP rate limits to chat requests.
- The assistant is advisory only. It cannot execute shell commands, trigger deployments, or mutate infrastructure.
- Do not paste passwords, tokens, private keys, or other secrets into the chat.
- AI responses can be inaccurate; verify any operational command before running it.

## Current telemetry scope

Runtime memory, uptime, request counts and analysis counts are process-local measurements. They reset when the Render instance restarts. The pipeline view is sourced from GitHub Actions. This is not yet a full observability stack: persistent time-series storage, logs ingestion, distributed tracing, alerting and multi-instance aggregation remain separate future integrations.
