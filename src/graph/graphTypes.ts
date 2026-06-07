import type { Edge, Node } from '@xyflow/react'
import type {
  Diagnosis,
  Fix,
  Language,
  ReasoningStep,
  Severity,
} from '../engine/types'

/** The kind of pipeline node — drives the glyph, label and inspector content. */
export type PipelineNodeKind =
  | 'input'
  | 'language'
  | 'reasoning'
  | 'primary'
  | 'alternative'
  | 'cause'
  | 'fix'
  | 'empty'

/**
 * Data carried by every node on the canvas. The index signature keeps the shape
 * compatible with React Flow's `Node<Record<string, unknown>>` constraint while
 * the named fields stay strongly typed for the inspector.
 */
export interface PipelineNodeData {
  kind: PipelineNodeKind
  title: string
  subtitle?: string
  /** Small tag rendered in the node's top-right corner. */
  badge?: string
  input?: string
  language?: Language
  step?: ReasoningStep
  diagnosis?: Diagnosis
  cause?: string
  fix?: Fix
  severity?: Severity
  [key: string]: unknown
}

export type FlowNode = Node<PipelineNodeData, 'pipeline'>
export type FlowEdge = Edge
