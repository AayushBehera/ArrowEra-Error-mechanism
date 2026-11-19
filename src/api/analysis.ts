import type { AnalysisResult } from '../engine/types.ts'

export async function analyzeWithApi(input: string): Promise<AnalysisResult> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ input }),
  })

  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      typeof payload.error === 'string'
        ? payload.error
        : `Analysis request failed (HTTP ${response.status}).`
    throw new Error(message)
  }

  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('input' in payload) ||
    typeof payload.input !== 'string' ||
    !('reasoning' in payload) ||
    !Array.isArray(payload.reasoning) ||
    !('alternatives' in payload) ||
    !Array.isArray(payload.alternatives)
  ) {
    throw new Error('The analysis service returned an invalid response.')
  }

  return payload as AnalysisResult
}
