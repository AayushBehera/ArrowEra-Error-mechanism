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

export async function sendAiMessage(messages: ChatMessage[]): Promise<{ answer: string; model: string }> {
  return readJson<{ answer: string; model: string }>(await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages }),
  }))
}
