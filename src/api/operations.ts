export interface PipelineRun {
  id: number
  name: string
  branch: string
  event: string
  status: string
  conclusion: string | null
  createdAt: string
  updatedAt: string
  url: string
}

export interface MetricSnapshot {
  timestamp: string
  heapUsedMb: number
  requestCount: number
  analysisCount: number
}

export interface OperationsOverview {
  service: {
    status: 'ok' | 'degraded'
    uptimeSeconds: number
    nodeVersion: string
    platform: string
    heapUsedMb: number
    heapTotalMb: number
    requestCount: number
    analysisCount: number
    aiRequestCount: number
  }
  connections: {
    githubActions: { connected: boolean; message: string; repository: string }
    ai: { configured: boolean; model: string; provider: string }
  }
  pipelines: PipelineRun[]
  metrics: MetricSnapshot[]
  generatedAt: string
}

export interface AiStatus {
  configured: boolean
  model: string
  provider: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

async function readJson<T>(response: Response): Promise<T> {
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'error' in payload &&
      typeof payload.error === 'string'
        ? payload.error
        : 'The request could not be completed.'
    throw new Error(message)
  }
  return payload as T
}

export async function fetchOperationsOverview(): Promise<OperationsOverview> {
  return readJson<OperationsOverview>(await fetch('/api/ops/overview', {
    headers: { accept: 'application/json' },
    cache: 'no-store',
  }))
}

export async function fetchAiStatus(): Promise<AiStatus> {
  return readJson<AiStatus>(await fetch('/api/ai/status', {
    headers: { accept: 'application/json' },
    cache: 'no-store',
  }))
}

export async function sendAiMessage(messages: ChatMessage[], projectContext = ''): Promise<{ answer: string; model: string }> {
  return readJson<{ answer: string; model: string }>(await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages, projectContext }),
  }))
}

export interface RepositoryAuditResult {
  repository: {
    name: string
    url: string
    defaultBranch: string
    primaryLanguage: string
    languages: Record<string, number>
    stars: number
    forks: number
    fileCount: number
    inspectedFileCount: number
    workflowCount: number
    lastPush: string
    license: string
    treeTruncated: boolean
  }
  report: string
  model: string
}

export async function analyzeRepository(url: string): Promise<RepositoryAuditResult> {
  return readJson<RepositoryAuditResult>(await fetch('/api/repository/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url }),
  }))
}

export interface ProjectConfig {
  repositoryUrl: string
  deploymentUrl: string
}

export interface ProjectSnapshot {
  repository: {
    name: string
    url: string
    description: string
    defaultBranch: string
    primaryLanguage: string
    languages: Record<string, number>
    stars: number
    forks: number
    openIssues: number
    license: string
    archived: boolean
    lastPush: string
    fileCount: number
    treeTruncated: boolean
    topLevelDirectories: string[]
    workflowFiles: string[]
    testFiles: string[]
    dependencyFiles: string[]
    deploymentFiles: string[]
    inspectedFiles: { path: string; content: string }[]
  }
  workflows: { id: number; name: string; branch: string; status: string; conclusion: string | null; createdAt: string; url: string }[]
  commits: { sha: string; message: string; author: string; date: string | null; url: string }[]
  pullRequests: { number: number; title: string; branch: string; updatedAt: string; url: string }[]
  branches: string[]
  deployment: { url: string; status: number | null; healthy: boolean; latencyMs: number; checkedAt: string; redirected?: boolean; error?: string } | null
  checks: Record<string, string>
  engine: {
    status: 'healthy' | 'review' | 'attention'
    summary: { critical: number; warning: number; info: number }
    checks: { name: string; status: string; detail: string }[]
    findings: { severity: string; category: string; title: string; detail: string; evidence?: string[] }[]
    generatedAt: string
  }
  inspectedAt: string
}

export async function inspectProject(config: ProjectConfig): Promise<ProjectSnapshot> {
  return readJson<ProjectSnapshot>(await fetch('/api/project/inspect', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(config),
  }))
}

export interface RepositoryFixResult {
  repository: string
  branch: string
  pullRequestUrl: string
  pullRequestNumber: number
  files: { path: string; summary: string }[]
  model: string
}

export async function createRepositoryFix(repositoryUrl: string, issue: string, projectContext: string): Promise<RepositoryFixResult> {
  return readJson<RepositoryFixResult>(await fetch('/api/ai/fix', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ repositoryUrl, issue, projectContext }),
  }))
}
