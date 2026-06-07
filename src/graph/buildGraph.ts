import { MarkerType } from '@xyflow/react'
import type { AnalysisResult, Diagnosis } from '../engine/types'
import type { FlowEdge, FlowNode } from './graphTypes'

// Column x-offsets — a left-to-right "circuit" like an n8n workflow.
const COL = {
  input: 0,
  language: 320,
  reasoning: 660,
  diagnosis: 1010,
  detail: 1360,
} as const

const CENTER_Y = 0

/** Lay a column of `count` items out vertically, centered around `centerY`. */
function columnYs(count: number, gap: number, centerY = CENTER_Y): number[] {
  if (count === 0) return []
  const total = (count - 1) * gap
  const start = centerY - total / 2
  return Array.from({ length: count }, (_, i) => start + i * gap)
}

function makeEdge(
  source: string,
  target: string,
  opts: { animated?: boolean } = {},
): FlowEdge {
  return {
    id: `${source}__${target}`,
    source,
    target,
    type: 'smoothstep',
    animated: opts.animated ?? true,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 16,
      height: 16,
      color: '#9ca3af',
    },
  }
}

function diagnosisBadge(d: Diagnosis): string {
  return `${d.confidence}%`
}

/**
 * Transform an {@link AnalysisResult} into a node/edge graph. Every stage of the
 * engine becomes a node and every causal link becomes a thread, so the whole
 * reasoning "program" is visible and any section can be inspected in place.
 */
export function buildGraph(result: AnalysisResult): {
  nodes: FlowNode[]
  edges: FlowEdge[]
} {
  const nodes: FlowNode[] = []
  const edges: FlowEdge[] = []

  // ── Input ──────────────────────────────────────────────────────────────
  const inputPreview = result.input.trim().split('\n')[0]?.slice(0, 48) || 'empty'
  nodes.push({
    id: 'input',
    type: 'pipeline',
    position: { x: COL.input, y: CENTER_Y },
    data: {
      kind: 'input',
      title: 'Error Input',
      subtitle: inputPreview,
      badge: 'source',
      input: result.input,
    },
  })

  // ── Language detection ─────────────────────────────────────────────────
  nodes.push({
    id: 'language',
    type: 'pipeline',
    position: { x: COL.language, y: CENTER_Y },
    data: {
      kind: 'language',
      title: 'Language Detection',
      subtitle: `Detected: ${result.detectedLanguage}`,
      badge: result.detectedLanguage,
      language: result.detectedLanguage,
    },
  })
  edges.push(makeEdge('input', 'language'))

  // ── Reasoning chain ────────────────────────────────────────────────────
  const reasoningYs = columnYs(result.reasoning.length, 108)
  const reasoningIds = result.reasoning.map((step, i) => {
    const id = `reasoning-${i}`
    nodes.push({
      id,
      type: 'pipeline',
      position: { x: COL.reasoning, y: reasoningYs[i] },
      data: {
        kind: 'reasoning',
        title: step.label,
        subtitle: step.detail,
        badge: `step ${i + 1}`,
        step,
      },
    })
    return id
  })

  // language → first reasoning step, then chain the steps together.
  let lastReasoning: string | null = null
  reasoningIds.forEach((id, i) => {
    if (i === 0) edges.push(makeEdge('language', id))
    else edges.push(makeEdge(reasoningIds[i - 1], id))
    lastReasoning = id
  })

  // The node that feeds the diagnosis column.
  const upstream = lastReasoning ?? 'language'

  // ── Diagnoses (primary + alternatives) ─────────────────────────────────
  const diagnoses: { id: string; diagnosis: Diagnosis; isPrimary: boolean }[] = []
  if (result.primary) {
    diagnoses.push({ id: 'primary', diagnosis: result.primary, isPrimary: true })
  }
  result.alternatives.forEach((alt, i) => {
    diagnoses.push({ id: `alt-${i}`, diagnosis: alt, isPrimary: false })
  })

  if (diagnoses.length === 0) {
    // No match — surface a terminal node so the graph still reads end-to-end.
    nodes.push({
      id: 'empty',
      type: 'pipeline',
      position: { x: COL.diagnosis, y: CENTER_Y },
      data: {
        kind: 'empty',
        title: 'No Match',
        subtitle: 'No known error pattern matched the input.',
        badge: 'unresolved',
      },
    })
    edges.push(makeEdge(upstream, 'empty'))
    return { nodes, edges }
  }

  const diagnosisYs = columnYs(diagnoses.length, 150)
  diagnoses.forEach((d, i) => {
    nodes.push({
      id: d.id,
      type: 'pipeline',
      position: { x: COL.diagnosis, y: diagnosisYs[i] },
      data: {
        kind: d.isPrimary ? 'primary' : 'alternative',
        title: d.diagnosis.rule.category,
        subtitle: d.diagnosis.rule.summary,
        badge: diagnosisBadge(d.diagnosis),
        diagnosis: d.diagnosis,
        severity: d.diagnosis.rule.severity,
      },
    })
    edges.push(makeEdge(upstream, d.id))
  })

  // ── Root causes + fixes branch off the primary diagnosis ───────────────
  const primary = result.primary
  if (primary) {
    const detailCount = primary.rule.rootCauses.length + primary.rule.fixes.length
    const detailYs = columnYs(detailCount, 96)
    let cursor = 0

    primary.rule.rootCauses.forEach((cause, i) => {
      const id = `cause-${i}`
      nodes.push({
        id,
        type: 'pipeline',
        position: { x: COL.detail, y: detailYs[cursor++] },
        data: {
          kind: 'cause',
          title: 'Root Cause',
          subtitle: cause,
          badge: 'cause',
          cause,
        },
      })
      edges.push(makeEdge('primary', id))
    })

    primary.rule.fixes.forEach((fix, i) => {
      const id = `fix-${i}`
      nodes.push({
        id,
        type: 'pipeline',
        position: { x: COL.detail, y: detailYs[cursor++] },
        data: {
          kind: 'fix',
          title: fix.title,
          subtitle: fix.detail,
          badge: 'fix',
          fix,
        },
      })
      edges.push(makeEdge('primary', id))
    })
  }

  return { nodes, edges }
}
