import { useState } from 'react'
import type { Diagnosis, Severity } from '../engine/types'
import type { FlowNode } from '../graph/graphTypes'

interface Props {
  node: FlowNode | null
  onReanalyze: (input: string) => void
}

const SEVERITY_LEVEL: Record<Severity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        {title}
      </p>
      {children}
    </div>
  )
}

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-neutral-800 overflow-hidden">
        <div className="h-full rounded-full bg-neutral-200" style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-mono text-neutral-400 w-9 text-right">{value}%</span>
    </div>
  )
}

function SeverityTag({ severity }: { severity: Severity }) {
  const level = SEVERITY_LEVEL[severity]
  return (
    <span className="inline-flex items-center gap-2 px-2 py-1 rounded border border-neutral-700 bg-neutral-900">
      <span className="flex items-end gap-0.5 h-3" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`w-1 rounded-sm ${i <= level ? 'bg-neutral-100' : 'bg-neutral-700'}`}
            style={{ height: `${i * 25}%` }}
          />
        ))}
      </span>
      <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-200">
        {severity}
      </span>
    </span>
  )
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="text-xs font-mono text-neutral-300 bg-black border border-neutral-800 rounded-md px-3 py-2 overflow-x-auto whitespace-pre-wrap">
      {code}
    </pre>
  )
}

function DiagnosisDetail({ diagnosis }: { diagnosis: Diagnosis }) {
  const { rule, confidence, matchedPatterns, matchedKeywords } = diagnosis
  return (
    <div className="space-y-4">
      <Section title="Summary">
        <p className="text-sm text-neutral-300 leading-relaxed">{rule.summary}</p>
      </Section>

      <div className="flex items-center justify-between gap-3">
        <SeverityTag severity={rule.severity} />
        <span className="text-[11px] font-mono uppercase tracking-wide text-neutral-500">
          {rule.language}
        </span>
      </div>

      <Section title="Confidence">
        <ConfidenceBar value={confidence} />
      </Section>

      <Section title="Why this happens">
        <p className="text-sm text-neutral-300 leading-relaxed">{rule.explanation}</p>
      </Section>

      {(matchedPatterns.length > 0 || matchedKeywords.length > 0) && (
        <Section title="Matched signals">
          <div className="flex flex-wrap gap-1.5">
            {matchedPatterns.map((p, i) => (
              <span
                key={`p-${i}`}
                className="px-1.5 py-0.5 rounded border border-neutral-600 bg-neutral-900 text-[10px] font-mono text-neutral-200"
                title="strong pattern"
              >
                {p}
              </span>
            ))}
            {matchedKeywords.map((k, i) => (
              <span
                key={`k-${i}`}
                className="px-1.5 py-0.5 rounded border border-dashed border-neutral-700 bg-neutral-900 text-[10px] font-mono text-neutral-400"
                title="keyword"
              >
                {k}
              </span>
            ))}
          </div>
        </Section>
      )}

      <Section title="Probable root causes">
        <ul className="space-y-1.5">
          {rule.rootCauses.map((cause, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-neutral-400 shrink-0" />
              {cause}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Suggested fixes">
        <div className="space-y-2.5">
          {rule.fixes.map((fix, i) => (
            <div
              key={i}
              className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 space-y-1.5"
            >
              <p className="text-sm font-medium text-neutral-100">{fix.title}</p>
              <p className="text-xs text-neutral-400">{fix.detail}</p>
              {fix.code && <CodeBlock code={fix.code} />}
            </div>
          ))}
        </div>
      </Section>

      {rule.docs && rule.docs.length > 0 && (
        <Section title="Documentation">
          <div className="flex flex-wrap gap-2">
            {rule.docs.map((doc, i) => (
              <a
                key={i}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-neutral-300 underline underline-offset-2 hover:text-white"
              >
                {doc.label}
              </a>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function InputEditor({
  initial,
  onReanalyze,
}: {
  initial: string
  onReanalyze: (input: string) => void
}) {
  const [value, setValue] = useState(initial)
  return (
    <div className="space-y-3">
      <Section title="Edit & re-run">
        <textarea
          className="w-full min-h-[180px] rounded-lg border border-neutral-700 bg-black px-3 py-2.5 text-xs font-mono text-neutral-200 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-400 resize-y"
          value={value}
          spellCheck={false}
          onChange={(e) => setValue(e.target.value)}
        />
      </Section>
      <button
        type="button"
        disabled={!value.trim()}
        onClick={() => onReanalyze(value)}
        className="w-full px-4 py-2 rounded-lg bg-neutral-100 text-black text-sm font-medium hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        Re-analyze
      </button>
      <p className="text-[11px] text-neutral-500 leading-relaxed">
        Editing the input rewires the entire graph — the engine re-runs and every
        downstream node is rebuilt.
      </p>
    </div>
  )
}

function NodeHeader({ node }: { node: FlowNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
        {node.data.kind}
      </p>
      <h2 className="text-base font-semibold text-neutral-100 leading-snug">
        {node.data.title}
      </h2>
    </div>
  )
}

export function Inspector({ node, onReanalyze }: Props) {
  if (!node) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-2">
        <div className="w-10 h-10 rounded-lg border border-neutral-800 flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="w-5 h-5 text-neutral-600"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-sm text-neutral-400">Select a node to inspect</p>
        <p className="text-xs text-neutral-600 max-w-[15rem]">
          Click any node on the canvas to dig into that section of the analysis.
        </p>
      </div>
    )
  }

  const { data } = node

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5">
      <NodeHeader node={node} />

      {data.kind === 'input' && data.input !== undefined && (
        <InputEditor key={node.id} initial={data.input} onReanalyze={onReanalyze} />
      )}

      {data.kind === 'language' && (
        <Section title="Detection">
          <p className="text-sm text-neutral-300 leading-relaxed">
            Heuristic signals in the stack trace were scored to identify the source
            language as{' '}
            <span className="text-neutral-100 font-medium">{data.language}</span>.
          </p>
        </Section>
      )}

      {data.kind === 'reasoning' && data.step && (
        <div className="space-y-4">
          <Section title="Deduction">
            <p className="text-sm text-neutral-300 leading-relaxed">
              {data.step.detail}
            </p>
          </Section>
          {data.step.evidence && (
            <Section title="Evidence">
              <CodeBlock code={data.step.evidence} />
            </Section>
          )}
        </div>
      )}

      {(data.kind === 'primary' || data.kind === 'alternative') && data.diagnosis && (
        <DiagnosisDetail diagnosis={data.diagnosis} />
      )}

      {data.kind === 'cause' && data.cause && (
        <Section title="Root cause">
          <p className="text-sm text-neutral-300 leading-relaxed">{data.cause}</p>
        </Section>
      )}

      {data.kind === 'fix' && data.fix && (
        <div className="space-y-4">
          <Section title="Fix detail">
            <p className="text-sm text-neutral-300 leading-relaxed">
              {data.fix.detail}
            </p>
          </Section>
          {data.fix.code && (
            <Section title="Code">
              <CodeBlock code={data.fix.code} />
            </Section>
          )}
        </div>
      )}

      {data.kind === 'empty' && (
        <Section title="Result">
          <p className="text-sm text-neutral-300 leading-relaxed">
            No known error pattern matched the input. Try editing the Error Input
            node with a fuller stack trace.
          </p>
        </Section>
      )}
    </div>
  )
}
