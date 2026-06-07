export type Severity = 'critical' | 'high' | 'medium' | 'low'

export type Language =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'network'
  | 'general'

export interface Fix {
  title: string
  detail: string
  code?: string
}

/**
 * A single unit of diagnostic knowledge. The reasoning engine scores every
 * rule against the input and surfaces the best matches. Rules are intentionally
 * declarative so the knowledge base stays easy to read, audit, and extend.
 */
export interface Rule {
  id: string
  category: string
  language: Language
  severity: Severity
  /** Strong signals — a single match is highly indicative of this rule. */
  patterns: RegExp[]
  /** Weak signals — supportive evidence that nudges confidence upward. */
  keywords?: string[]
  /** One-line description of what the error means. */
  summary: string
  /** Plain-language explanation of why this class of error occurs. */
  explanation: string
  rootCauses: string[]
  fixes: Fix[]
  docs?: { label: string; url: string }[]
}

/** A single transparent step in the engine's reasoning chain. */
export interface ReasoningStep {
  label: string
  detail: string
  /** Evidence extracted from the input that supports this step. */
  evidence?: string
}

export interface Diagnosis {
  rule: Rule
  /** 0-100 normalized confidence for this rule. */
  confidence: number
  matchedPatterns: string[]
  matchedKeywords: string[]
}

export interface AnalysisResult {
  /** The raw input that was analyzed. */
  input: string
  detectedLanguage: Language
  reasoning: ReasoningStep[]
  primary: Diagnosis | null
  alternatives: Diagnosis[]
  analyzedAt: number
}

export interface HistoryEntry {
  id: string
  input: string
  category: string
  severity: Severity
  language: Language
  confidence: number
  analyzedAt: number
}
