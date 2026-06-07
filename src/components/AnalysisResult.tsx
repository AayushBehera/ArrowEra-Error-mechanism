import type { AnalysisResult as Result, Diagnosis, Severity } from '../engine/types'
import { ReasoningChain } from './ReasoningChain'

interface Props {
  result: Result
  onBack: () => void
}

function severityColor(severity: Severity) {
  switch (severity) {
    case 'critical':
      return 'text-red-400 bg-red-900/30 border-red-700/50'
    case 'high':
      return 'text-orange-400 bg-orange-900/30 border-orange-700/50'
    case 'medium':
      return 'text-yellow-400 bg-yellow-900/30 border-yellow-700/50'
    case 'low':
      return 'text-green-400 bg-green-900/30 border-green-700/50'
  }
}

function ConfidenceMeter({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-700"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-mono text-gray-400">{value}%</span>
    </div>
  )
}

function DiagnosisCard({ diagnosis, isPrimary }: { diagnosis: Diagnosis; isPrimary?: boolean }) {
  const { rule, confidence } = diagnosis
  return (
    <div
      className={`rounded-xl border p-5 space-y-4 ${
        isPrimary
          ? 'border-indigo-500/40 bg-indigo-950/20'
          : 'border-gray-700/50 bg-gray-900/30'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          {isPrimary && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
              Primary Diagnosis
            </span>
          )}
          <h4 className="text-base font-semibold text-gray-100">{rule.category}</h4>
          <p className="text-sm text-gray-400">{rule.summary}</p>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${severityColor(rule.severity)}`}
        >
          {rule.severity}
        </span>
      </div>

      {/* Confidence */}
      <div className="space-y-1">
        <p className="text-xs text-gray-500 font-medium">Confidence</p>
        <ConfidenceMeter value={confidence} />
      </div>

      {/* Explanation */}
      <div className="space-y-1">
        <p className="text-xs text-gray-500 font-medium">Why this happens</p>
        <p className="text-sm text-gray-300 leading-relaxed">{rule.explanation}</p>
      </div>

      {/* Root causes */}
      <div className="space-y-1.5">
        <p className="text-xs text-gray-500 font-medium">Probable root causes</p>
        <ul className="space-y-1">
          {rule.rootCauses.map((cause, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
              {cause}
            </li>
          ))}
        </ul>
      </div>

      {/* Fixes */}
      <div className="space-y-3">
        <p className="text-xs text-gray-500 font-medium">Suggested fixes</p>
        {rule.fixes.map((fix, i) => (
          <div key={i} className="rounded-lg bg-gray-900/60 border border-gray-700/40 p-3 space-y-1.5">
            <p className="text-sm font-medium text-indigo-300">{fix.title}</p>
            <p className="text-xs text-gray-400">{fix.detail}</p>
            {fix.code && (
              <pre className="mt-1 text-xs font-mono text-gray-300 bg-black/40 rounded-md px-3 py-2 overflow-x-auto whitespace-pre-wrap">
                {fix.code}
              </pre>
            )}
          </div>
        ))}
      </div>

      {/* Docs */}
      {rule.docs && rule.docs.length > 0 && (
        <div className="pt-2 border-t border-gray-800/60 space-y-1">
          <p className="text-xs text-gray-500 font-medium">Documentation</p>
          <div className="flex flex-wrap gap-2">
            {rule.docs.map((doc, i) => (
              <a
                key={i}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
              >
                {doc.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function AnalysisResultView({ result, onBack }: Props) {
  const hasResult = result.primary !== null

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Analyze another
      </button>

      {/* Language badge */}
      <div className="flex items-center gap-2">
        <span className="px-2.5 py-1 rounded-md bg-gray-800 text-xs font-medium text-gray-300 border border-gray-700/50">
          {result.detectedLanguage}
        </span>
      </div>

      {/* Reasoning chain */}
      <ReasoningChain steps={result.reasoning} />

      {/* Primary diagnosis */}
      {hasResult && result.primary && (
        <DiagnosisCard diagnosis={result.primary} isPrimary />
      )}

      {/* Alternatives */}
      {result.alternatives.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-400">
            Alternative diagnoses
          </h3>
          {result.alternatives.map((alt) => (
            <DiagnosisCard key={alt.rule.id} diagnosis={alt} />
          ))}
        </div>
      )}

      {/* No match */}
      {!hasResult && (
        <div className="rounded-xl border border-gray-700/50 bg-gray-900/30 p-6 text-center space-y-2">
          <p className="text-gray-300 font-medium">No matching error pattern found</p>
          <p className="text-sm text-gray-500">
            The input did not match any known error signatures in the rule base.
            Try pasting a complete error message or stack trace.
          </p>
        </div>
      )}
    </div>
  )
}
