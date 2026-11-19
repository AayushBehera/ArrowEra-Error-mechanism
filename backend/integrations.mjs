import { randomUUID } from 'node:crypto'

const traces = []
const MAX_TRACES = 500

export function beginTrace(request, response) {
  const traceId = randomUUID()
  const startedAt = Date.now()
  const url = new URL(request.url || '/', 'http://localhost')
  response.setHeader('x-trace-id', traceId)
  response.on('finish', () => {
    traces.unshift({
      traceId,
      method: request.method || 'GET',
      path: url.pathname,
      status: response.statusCode,
      durationMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    })
    if (traces.length > MAX_TRACES) traces.length = MAX_TRACES
  })
  return traceId
}

function json(response, status, payload) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  response.end(JSON.stringify(payload))
}

async function providerFetch(url, token, label) {
  const response = await fetch(url, {
    headers: { authorization: 'Bearer ' + token, accept: 'application/json', 'user-agent': 'ArrowEra-Observability' },
    signal: AbortSignal.timeout(12_000),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(label + ' API returned HTTP ' + response.status)
  return body
}

export async function handleIntegrationRequest(request, response, url) {
  const { pathname } = url
  if (pathname === '/api/observability/traces' && request.method === 'GET') {
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit')) || 50))
    json(response, 200, { traces: traces.slice(0, limit), retention: 'in-memory; resets on process restart' })
    return true
  }

  if (pathname === '/api/integrations/status' && request.method === 'GET') {
    json(response, 200, {
      githubActions: { configured: Boolean(process.env.GITHUB_TOKEN || process.env.GITHUB_REPOSITORY), tokenConfigured: Boolean(process.env.GITHUB_TOKEN) },
      render: { configured: Boolean(process.env.RENDER_API_KEY && process.env.RENDER_SERVICE_ID) },
      vercel: { configured: Boolean(process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID) },
      telemetry: { requestTraces: true, durableTracing: false },
      containerRegistry: { provider: 'GitHub Container Registry', configuredByActions: true },
    })
    return true
  }

  if (pathname === '/api/project/workflows/dispatch' && request.method === 'POST') {
    const token = process.env.GITHUB_TOKEN
    if (!token) { json(response, 503, { error: 'GITHUB_TOKEN is required for workflow dispatch.' }); return true }
    let raw = ''
    for await (const chunk of request) {
      raw += chunk.toString('utf8')
      if (raw.length > 16_384) { json(response, 413, { error: 'Workflow dispatch payload is too large.' }); return true }
    }
    let input
    try { input = JSON.parse(raw) } catch { json(response, 400, { error: 'Request body must be valid JSON.' }); return true }
    const repository = typeof input.repository === 'string' ? input.repository : ''
    const workflow = typeof input.workflow === 'string' ? input.workflow : ''
    const ref = typeof input.ref === 'string' ? input.ref : 'main'
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !/^[A-Za-z0-9_.-]+\.ya?ml$/.test(workflow) || !/^[A-Za-z0-9_.\/-]{1,120}$/.test(ref) || ref.includes('..')) {
      json(response, 400, { error: 'Provide a valid owner/name repository, workflow file path and branch ref.' })
      return true
    }
    try {
      const api = 'https://api.github.com/repos/' + repository + '/actions/workflows/' + encodeURIComponent(workflow) + '/dispatches'
      const upstream = await fetch(api, { method: 'POST', headers: { authorization: 'Bearer ' + token, accept: 'application/vnd.github+json', 'content-type': 'application/json', 'x-github-api-version': '2022-11-28', 'user-agent': 'ArrowEra-Workflow-Dispatcher' }, body: JSON.stringify({ ref }), signal: AbortSignal.timeout(12_000) })
      if (!upstream.ok) {
        json(response, upstream.status, { error: 'GitHub workflow dispatch returned HTTP ' + upstream.status + '. Confirm the workflow supports workflow_dispatch and GITHUB_TOKEN has Actions: write.' })
        return true
      }
      json(response, 202, { accepted: true, repository, workflow, ref, message: 'Workflow dispatch accepted by GitHub. Refresh the CI/CD run list to see the new execution.' })
    } catch (error) { json(response, 502, { error: error instanceof Error ? error.message : 'Workflow dispatch failed.' }) }
    return true
  }

  const jobsMatch = pathname.match(/^\/api\/project\/workflows\/(\d+)\/jobs$/)
  if (jobsMatch && request.method === 'GET') {
    const repository = url.searchParams.get('repository') || process.env.GITHUB_REPOSITORY || ''
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
      json(response, 400, { error: 'Provide repository=owner/name or configure GITHUB_REPOSITORY.' })
      return true
    }
    const headers = { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'ArrowEra-Workflow-Inspector' }
    if (process.env.GITHUB_TOKEN) headers.authorization = 'Bearer ' + process.env.GITHUB_TOKEN
    try {
      const upstream = await fetch('https://api.github.com/repos/' + repository + '/actions/runs/' + jobsMatch[1] + '/jobs?per_page=100', { headers, signal: AbortSignal.timeout(12_000) })
      const payload = await upstream.json().catch(() => ({}))
      if (!upstream.ok) {
        json(response, upstream.status, { error: 'GitHub Actions jobs API returned HTTP ' + upstream.status })
        return true
      }
      json(response, 200, {
        totalCount: Number(payload.total_count) || 0,
        jobs: (Array.isArray(payload.jobs) ? payload.jobs : []).map((job) => ({
          id: job.id, name: job.name, status: job.status, conclusion: job.conclusion,
          startedAt: job.started_at, completedAt: job.completed_at, url: job.html_url,
          steps: (Array.isArray(job.steps) ? job.steps : []).map((step) => ({ name: step.name, status: step.status, conclusion: step.conclusion, number: step.number })),
        })),
      })
    } catch (error) { json(response, 502, { error: error instanceof Error ? error.message : 'Could not retrieve workflow jobs.' }) }
    return true
  }

  if (pathname === '/api/deployments/status' && request.method === 'GET') {
    const provider = (url.searchParams.get('provider') || 'render').toLowerCase()
    try {
      if (provider === 'render') {
        const token = process.env.RENDER_API_KEY
        const serviceId = process.env.RENDER_SERVICE_ID
        if (!token || !serviceId) { json(response, 200, { provider, configured: false, message: 'Set RENDER_API_KEY and RENDER_SERVICE_ID on the backend.' }); return true }
        const [service, deploys] = await Promise.all([
          providerFetch('https://api.render.com/v1/services/' + encodeURIComponent(serviceId), token, 'Render'),
          providerFetch('https://api.render.com/v1/services/' + encodeURIComponent(serviceId) + '/deploys?limit=10', token, 'Render'),
        ])
        json(response, 200, { provider, configured: true, service: { id: service.id, name: service.name, type: service.type, status: service.suspended?'suspended':service.suspenders?.length?'suspending':'available', url: service.serviceDetails?.url || null }, deployments: Array.isArray(deploys)?deploys.map((item)=>({id:item.deploy?.id,status:item.deploy?.status,createdAt:item.deploy?.createdAt,updatedAt:item.deploy?.updatedAt,commit:item.deploy?.commit?.id, message:item.deploy?.commit?.message})):[] })
        return true
      }
      if (provider === 'vercel') {
        const token = process.env.VERCEL_TOKEN
        const projectId = process.env.VERCEL_PROJECT_ID
        if (!token || !projectId) { json(response, 200, { provider, configured: false, message: 'Set VERCEL_TOKEN and VERCEL_PROJECT_ID on the backend.' }); return true }
        const team = process.env.VERCEL_TEAM_ID ? '&teamId=' + encodeURIComponent(process.env.VERCEL_TEAM_ID) : ''
        const payload = await providerFetch('https://api.vercel.com/v6/deployments?projectId=' + encodeURIComponent(projectId) + '&limit=10' + team, token, 'Vercel')
        json(response, 200, { provider, configured: true, deployments: (payload.deployments || []).map((item)=>({id:item.uid,status:item.readyState,createdAt:item.createdAt?new Date(item.createdAt).toISOString():null,url:item.url? 'https://'+item.url:null,meta:item.meta||{}})) })
        return true
      }
      json(response, 400, { error: 'Supported providers are render and vercel.' })
    } catch (error) { json(response, 502, { provider, configured: true, error: error instanceof Error ? error.message : 'Provider request failed.' }) }
    return true
  }

  if (pathname === '/api/observability/logs' && request.method === 'GET') {
    const provider = (url.searchParams.get('provider') || 'render').toLowerCase()
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 50))
    try {
      if (provider === 'render') {
        const token = process.env.RENDER_API_KEY
        const serviceId = process.env.RENDER_SERVICE_ID
        if (!token || !serviceId) { json(response, 200, { provider, configured: false, logs: [], message: 'Set RENDER_API_KEY and RENDER_SERVICE_ID to retrieve Render logs.' }); return true }
        const end = new Date()
        const start = new Date(end.getTime() - 60 * 60 * 1000)
        const logs = await providerFetch('https://api.render.com/v1/logs?resource=' + encodeURIComponent(serviceId) + '&limit=' + limit + '&startTime=' + encodeURIComponent(start.toISOString()) + '&endTime=' + encodeURIComponent(end.toISOString()), token, 'Render')
        json(response, 200, { provider, configured: true, logs: Array.isArray(logs)?logs:logs.logs||[] })
        return true
      }
      if (provider === 'vercel') {
        const token = process.env.VERCEL_TOKEN
        const projectId = process.env.VERCEL_PROJECT_ID
        if (!token || !projectId) { json(response, 200, { provider, configured: false, logs: [], message: 'Set VERCEL_TOKEN and VERCEL_PROJECT_ID to retrieve Vercel deployment events.' }); return true }
        const team = process.env.VERCEL_TEAM_ID ? '&teamId=' + encodeURIComponent(process.env.VERCEL_TEAM_ID) : ''
        const deployments = await providerFetch('https://api.vercel.com/v6/deployments?projectId=' + encodeURIComponent(projectId) + '&limit=1' + team, token, 'Vercel')
        const deployment = deployments.deployments?.[0]
        if (!deployment?.uid) { json(response, 200, { provider, configured: true, logs: [], message: 'No deployment is available for log retrieval.' }); return true }
        const events = await providerFetch('https://api.vercel.com/v2/deployments/' + encodeURIComponent(deployment.uid) + '/events?limit=' + limit + team, token, 'Vercel')
        json(response, 200, { provider, configured: true, deploymentId: deployment.uid, logs: Array.isArray(events)?events:events.events||[] })
        return true
      }
      json(response, 400, { error: 'Supported log providers are render and vercel.' })
    } catch (error) { json(response, 502, { provider, configured: true, logs: [], error: error instanceof Error ? error.message : 'Log retrieval failed.' }) }
    return true
  }

  return false
}
