import type {
  AnalysisResult,
  Diagnosis,
  Language,
  ReasoningStep,
  Rule,
} from './types'
import { rules } from './rules'

// ────────────────────────────────────────────────────────────────────────────
// Language detection heuristics
// ────────────────────────────────────────────────────────────────────────────

interface LanguageSignal {
  language: Language
  weight: number
  pattern: RegExp
}

const languageSignals: LanguageSignal[] = [
  { language: 'python', weight: 3, pattern: /Traceback \(most recent call last\)/i },
  { language: 'python', weight: 2, pattern: /File ".*\.py"/i },
  { language: 'python', weight: 1, pattern: /^\s*(def |class |import |from )/m },
  { language: 'javascript', weight: 2, pattern: /at .*\(.*\.(?:js|ts|tsx|jsx):\d+:\d+\)/i },
  { language: 'javascript', weight: 2, pattern: /at Object\.<anonymous>/i },
  { language: 'typescript', weight: 2, pattern: /\.ts:\d+:\d+/i },
  { language: 'typescript', weight: 1, pattern: /(?:interface|type alias|TS\d{4})/i },
  { language: 'java', weight: 2, pattern: /at .*\(.*\.java:\d+\)/i },
  { language: 'java', weight: 1, pattern: /Exception in thread/i },
  { language: 'network', weight: 2, pattern: /CORS|ERR_CONNECTION|ECONNREFUSED|fetch failed/i },
  { language: 'network', weight: 1, pattern: /HTTP\/\d|status code \d{3}/i },
]

function detectLanguage(input: string): { language: Language; evidence: string } {
  const scores: Record<string, { score: number; evidence: string }> = {}

  for (const signal of languageSignals) {
    const match = signal.pattern.exec(input)
    if (match) {
      const key = signal.language
      if (!scores[key]) {
        scores[key] = { score: 0, evidence: match[0].slice(0, 60) }
      }
      scores[key].score += signal.weight
    }
  }

  let best: { language: Language; score: number; evidence: string } = {
    language: 'general',
    score: 0,
    evidence: '',
  }

  for (const [lang, data] of Object.entries(scores)) {
    if (data.score > best.score) {
      best = { language: lang as Language, score: data.score, evidence: data.evidence }
    }
  }

  return { language: best.language, evidence: best.evidence }
}

// ────────────────────────────────────────────────────────────────────────────
// Rule scoring
// ────────────────────────────────────────────────────────────────────────────

interface RuleScore {
  rule: Rule
  patternScore: number
  keywordScore: number
  matchedPatterns: string[]
  matchedKeywords: string[]
}

function scoreRule(rule: Rule, input: string): RuleScore {
  const matchedPatterns: string[] = []
  const matchedKeywords: string[] = []

  for (const pattern of rule.patterns) {
    const m = pattern.exec(input)
    if (m) {
      matchedPatterns.push(m[0].slice(0, 80))
    }
  }

  if (rule.keywords) {
    const lowerInput = input.toLowerCase()
    for (const kw of rule.keywords) {
      if (lowerInput.includes(kw.toLowerCase())) {
        matchedKeywords.push(kw)
      }
    }
  }

  // pattern match is strong (30 pts each), keyword is weak (5 pts each)
  const patternScore = matchedPatterns.length * 30
  const keywordScore = matchedKeywords.length * 5

  return { rule, patternScore, keywordScore, matchedPatterns, matchedKeywords }
}

function computeConfidence(score: RuleScore): number {
  const raw = score.patternScore + score.keywordScore
  // Normalize: 30 = ~70%, 60+ = 90%+, 100+ caps at 98
  const normalized = Math.min(98, Math.round(40 + (raw / 100) * 58))
  return raw === 0 ? 0 : normalized
}

// ────────────────────────────────────────────────────────────────────────────
// Reasoning chain builder
// ────────────────────────────────────────────────────────────────────────────

function buildReasoning(
  language: Language,
  langEvidence: string,
  primary: RuleScore | null,
  altCount: number,
): ReasoningStep[] {
  const steps: ReasoningStep[] = []

  steps.push({
    label: 'Language Detection',
    detail:
      language === 'general'
        ? 'Could not determine a specific language — applying general rules.'
        : `Detected language: ${language}`,
    evidence: langEvidence || undefined,
  })

  if (!primary || computeConfidence(primary) === 0) {
    steps.push({
      label: 'Pattern Matching',
      detail: 'No matching error patterns found in the input.',
    })
    return steps
  }

  if (primary.matchedPatterns.length > 0) {
    steps.push({
      label: 'Primary Signal Match',
      detail: `Matched ${primary.matchedPatterns.length} strong pattern(s) for "${primary.rule.category}".`,
      evidence: primary.matchedPatterns[0],
    })
  }

  if (primary.matchedKeywords.length > 0) {
    steps.push({
      label: 'Supporting Evidence',
      detail: `Found ${primary.matchedKeywords.length} supporting keyword(s): ${primary.matchedKeywords.join(', ')}.`,
    })
  }

  const conf = computeConfidence(primary)
  steps.push({
    label: 'Classification',
    detail: `Classified as "${primary.rule.category}" with severity ${primary.rule.severity}.`,
  })

  steps.push({
    label: 'Confidence Assessment',
    detail: `Confidence: ${conf}% based on ${primary.matchedPatterns.length} pattern match(es) and ${primary.matchedKeywords.length} keyword(s).`,
  })

  if (altCount > 0) {
    steps.push({
      label: 'Alternatives Considered',
      detail: `${altCount} alternative diagnosis(es) ranked below the primary match.`,
    })
  }

  return steps
}

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

export function analyze(input: string): AnalysisResult {
  const trimmed = input.trim()
  if (!trimmed) {
    return {
      input,
      detectedLanguage: 'general',
      reasoning: [{ label: 'Input', detail: 'No input provided.' }],
      primary: null,
      alternatives: [],
      analyzedAt: Date.now(),
    }
  }

  const { language, evidence: langEvidence } = detectLanguage(trimmed)

  // Score all rules
  const scored = rules
    .map((rule) => scoreRule(rule, trimmed))
    .filter((s) => s.patternScore + s.keywordScore > 0)
    .sort((a, b) => {
      const totalA = a.patternScore + a.keywordScore
      const totalB = b.patternScore + b.keywordScore
      return totalB - totalA
    })

  const primaryScore = scored[0] ?? null
  const altScores = scored.slice(1, 4)

  const reasoning = buildReasoning(language, langEvidence, primaryScore, altScores.length)

  const toDiagnosis = (s: RuleScore): Diagnosis => ({
    rule: s.rule,
    confidence: computeConfidence(s),
    matchedPatterns: s.matchedPatterns,
    matchedKeywords: s.matchedKeywords,
  })

  return {
    input: trimmed,
    detectedLanguage: language,
    reasoning,
    primary: primaryScore ? toDiagnosis(primaryScore) : null,
    alternatives: altScores.map(toDiagnosis),
    analyzedAt: Date.now(),
  }
}
