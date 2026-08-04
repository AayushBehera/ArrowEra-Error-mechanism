import { useState } from 'react'
import { analyze } from './engine/analyzer.ts'
import type { AnalysisResult, HistoryEntry } from './engine/types.ts'
import { useHistory } from './hooks/useHistory.ts'
import { Header } from './components/Header.tsx'
import { WorkflowStepper } from './components/WorkflowStepper.tsx'
import { ErrorInput } from './components/ErrorInput.tsx'
import { AnalysisResultView } from './components/AnalysisResult.tsx'
import { HistoryPanel } from './components/HistoryPanel.tsx'
import { StatsDashboard } from './components/StatsDashboard.tsx'

type View = 'input' | 'result'

// crypto.randomUUID is only available in secure contexts (https/localhost).
// Fall back for LAN hosts or file:// without importing anything.
function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export default function App() {
  const [view, setView] = useState<View>('input')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const { entries, add, clear, remove } = useHistory()

  function handleAnalyze(input: string) {
    const analysisResult = analyze(input)
    setResult(analysisResult)
    setView('result')

    if (analysisResult.primary) {
      const entry: HistoryEntry = {
        id: uid(),
        input: analysisResult.input,
        category: analysisResult.primary.rule.category,
        severity: analysisResult.primary.rule.severity,
        language: analysisResult.detectedLanguage,
        confidence: analysisResult.primary.confidence,
        analyzedAt: analysisResult.analyzedAt,
      }
      add(entry)
    }
  }

  function handleBack() {
    setView('input')
    setResult(null)
  }

  function handleHistorySelect(entry: HistoryEntry) {
    handleAnalyze(entry.input)
  }

  const activeStep = view === 'input' ? 0 : result?.primary ? 3 : 1

  return (
    <div className="min-h-full flex flex-col">
      <Header />

      <main className="flex-1 mx-auto w-full max-w-6xl px-5 py-8">
        {/* Workflow progress */}
        <div className="mb-8">
          <WorkflowStepper activeStep={activeStep} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          {/* Main panel */}
          <div>
            {view === 'input' && <ErrorInput onAnalyze={handleAnalyze} />}
            {view === 'result' && result && (
              <AnalysisResultView result={result} onBack={handleBack} />
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <StatsDashboard entries={entries} />
            <HistoryPanel
              entries={entries}
              onClear={clear}
              onRemove={remove}
              onSelect={handleHistorySelect}
            />
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/40 py-4 text-center text-xs text-gray-600">
        ArrowEra Error Mechanism &middot; Rule-based reasoning engine &middot;{' '}
        {new Date().getFullYear()}
      </footer>
    </div>
  )
}
