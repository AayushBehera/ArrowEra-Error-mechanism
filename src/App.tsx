import { useMemo, useState } from 'react'
import { analyze } from './engine/analyzer'
import { examples } from './engine/examples'
import type { AnalysisResult, HistoryEntry } from './engine/types'
import { buildGraph } from './graph/buildGraph'
import { useHistory } from './hooks/useHistory'
import { Header } from './components/Header'
import { ErrorInput } from './components/ErrorInput'
import { HistoryPanel } from './components/HistoryPanel'
import { StatsDashboard } from './components/StatsDashboard'
import { Inspector } from './components/Inspector'
import { GraphCanvas } from './components/graph/GraphCanvas'

export default function App() {
  // Seed the canvas with an example so the graph is populated on first load.
  const [result, setResult] = useState<AnalysisResult>(() =>
    analyze(examples[0].text),
  )
  const [selectedId, setSelectedId] = useState<string | null>('primary')
  const { entries, add, clear, remove } = useHistory()

  const { nodes, edges } = useMemo(() => buildGraph(result), [result])
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  )
  const graphKey = `${result.analyzedAt}-${nodes.length}`

  function handleAnalyze(input: string) {
    const analysisResult = analyze(input)
    setResult(analysisResult)
    setSelectedId(analysisResult.primary ? 'primary' : 'input')

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

  return (
    <div className="h-full flex flex-col bg-black text-neutral-200">
      <Header />

      <main className="flex-1 min-h-0 flex">
        {/* Left rail — capture, stats, history */}
        <aside className="hidden md:flex flex-col w-[300px] shrink-0 border-r border-neutral-800 overflow-y-auto p-4 gap-5">
          <ErrorInput onAnalyze={handleAnalyze} />
          <StatsDashboard entries={entries} />
          <HistoryPanel
            entries={entries}
            onClear={clear}
            onRemove={remove}
            onSelect={(entry) => handleAnalyze(entry.input)}
          />
          <p className="mt-auto pt-4 text-[10px] text-neutral-600 leading-relaxed">
            ArrowEra Error Mechanism · Node-graph reasoning workbench ·{' '}
            {new Date().getFullYear()}
          </p>
        </aside>

        {/* Canvas — the n8n-style program graph */}
        <section className="flex-1 min-w-0 relative">
          <GraphCanvas
            nodes={nodes}
            edges={edges}
            graphKey={graphKey}
            onSelect={setSelectedId}
          />
        </section>

        {/* Inspector — dig into any selected node */}
        <aside className="hidden lg:block w-[340px] shrink-0 border-l border-neutral-800">
          <Inspector node={selectedNode} onReanalyze={handleAnalyze} />
        </aside>
      </main>
    </div>
  )
}
