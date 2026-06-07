import type { ReasoningStep } from '../engine/types'

interface Props {
  steps: ReasoningStep[]
}

export function ReasoningChain({ steps }: Props) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">
        Reasoning Chain
      </h3>
      <div className="relative pl-5 border-l-2 border-indigo-800/50 space-y-4">
        {steps.map((step, i) => (
          <div key={i} className="relative animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
            {/* Dot on the line */}
            <div className="absolute -left-[calc(0.625rem+1px)] top-1 w-3 h-3 rounded-full bg-indigo-600 border-2 border-[#0c0c14]" />
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">
                {step.label}
              </p>
              <p className="text-sm text-gray-300">{step.detail}</p>
              {step.evidence && (
                <code className="block text-xs text-gray-500 bg-gray-900/50 px-2 py-1 rounded mt-1 font-mono break-all">
                  {step.evidence}
                </code>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
