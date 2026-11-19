import { useState } from 'react'
import { analyze } from './engine/analyzer.ts'
import type { AnalysisResult, HistoryEntry } from './engine/types.ts'
import { analyzeWithApi } from './api/analysis.ts'
import { useHistory } from './hooks/useHistory.ts'
import { Header } from './components/Header.tsx'
import { WorkflowStepper } from './components/WorkflowStepper.tsx'
import { ErrorInput } from './components/ErrorInput.tsx'
import { AnalysisResultView } from './components/AnalysisResult.tsx'
import { HistoryPanel } from './components/HistoryPanel.tsx'
import { StatsDashboard } from './components/StatsDashboard.tsx'

type View = 'input' | 'result'

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export default function App() {
  const [view, setView] = useState<View>('input')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const { entries, add, clear, remove } = useHistory()

  async function handleAnalyze(input: string): Promise<void> {
    setIsAnalyzing(true)
    setAnalysisError(null)
    try {
      const analysisResult = await analyzeWithApi(input)
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
          result: analysisResult,
        }
        add(entry)
      }
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'The analysis service is unavailable.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  function handleBack() {
    setView('input')
    setResult(null)
    setAnalysisError(null)
  }

  function handleHistorySelect(entry: HistoryEntry) {
    // Prefer the original snapshot so the diagnosis and timestamp are stable.
    // Legacy entries without snapshots retain the previous local-analysis behavior.
    const restored = entry.result ?? analyze(entry.input)
    setResult({
      ...restored,
      analyzedAt: entry.analyzedAt || restored.analyzedAt,
    })
    setAnalysisError(null)
    setView('result')
  }

  const activeStep = view === 'input' ? 0 : result?.primary ? 3 : 1

  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-6xl px-5 py-8">
        <div className="mb-8">
          <WorkflowStepper activeStep={activeStep} />
        </div>

        {analysisError && (
          <div role="alert" className="mb-6 rounded-lg border border-red-800/60 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {analysisError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          <div>
            {view === 'input' && (
              <ErrorInput onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />
            )}
            {view === 'result' && result && (
              <AnalysisResultView result={result} onBack={handleBack} />
            )}
          </div>
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
      <footer className="border-t border-gray-800/40 py-4 text-center text-xs text-gray-600">
        ArrowEra Error Mechanism &middot; Rule-based reasoning engine &middot;{' '}
        {new Date().getFullYear()}
      </footer>
    </div>
  )
}
