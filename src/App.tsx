import { useState } from 'react'
import { analyze } from './engine/analyzer'
import type { AnalysisResult, HistoryEntry } from './engine/types'
import { useHistory } from './hooks/useHistory'
import { Header } from './components/Header'
import { WorkflowStepper } from './components/WorkflowStepper'
import { ErrorInput } from './components/ErrorInput'
import { AnalysisResultView } from './components/AnalysisResult'
import { HistoryPanel } from './components/HistoryPanel'
import { StatsDashboard } from './components/StatsDashboard'

type View = 'input' | 'result'

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
        id: crypto.randomUUID(),
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
