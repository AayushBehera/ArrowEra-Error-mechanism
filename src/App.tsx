import { useEffect, useState } from 'react'
import { analyze } from './engine/analyzer.ts'
import type { AnalysisResult, HistoryEntry } from './engine/types.ts'
import { analyzeWithApi } from './api/analysis.ts'
import { fetchOperationsOverview, fetchGitHubConnectionStatus } from './api/operations.ts'
import type { OperationsOverview, GitHubConnectionStatus } from './api/operations.ts'
import { useHistory } from './hooks/useHistory.ts'
import { WorkflowStepper } from './components/WorkflowStepper.tsx'
import { ErrorInput } from './components/ErrorInput.tsx'
import { AnalysisResultView } from './components/AnalysisResult.tsx'
import { HistoryPanel } from './components/HistoryPanel.tsx'
import { StatsDashboard } from './components/StatsDashboard.tsx'
import { OperationsWorkspace } from './components/OperationsWorkspace.tsx'
import type { WorkspacePage } from './components/OperationsWorkspace.tsx'
import { AiAssistant } from './components/AiAssistant.tsx'
import { ProjectWorkspace } from './components/ProjectWorkspace.tsx'

type Page = WorkspacePage | 'errors'

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

const navigation: { id: Page; label: string; icon: string; group: string }[] = [
  { id: 'overview', label: 'Overview', icon: '▦', group: 'Workspace' },
  { id: 'errors', label: 'Error triage', icon: '⌘', group: 'Workspace' },

]

export default function App() {
  const [page, setPage] = useState<Page>('overview')
  const [projectContext, setProjectContext] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [overview, setOverview] = useState<OperationsOverview | null>(null)
  const [telemetryError, setTelemetryError] = useState<string | null>(null)
  const [loadingTelemetry, setLoadingTelemetry] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [githubStatus, setGithubStatus] = useState<GitHubConnectionStatus | null>(null)
  const [githubLoading, setGithubLoading] = useState(false)
  const [githubError, setGithubError] = useState<string | null>(null)
  const { entries, add, clear, remove } = useHistory()

  useEffect(() => {
    let active = true

    async function refreshTelemetry() {
      try {
        const data = await fetchOperationsOverview()
        if (!active) return
        setOverview(data)
        setTelemetryError(null)
        setLastUpdated(data.generatedAt)
      } catch (error) {
        if (!active) return
        setTelemetryError(error instanceof Error ? error.message : 'Operations telemetry is unavailable.')
      } finally {
        if (active) setLoadingTelemetry(false)
      }
    }

    void refreshTelemetry()
    const timer = window.setInterval(() => { void refreshTelemetry() }, 15_000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [])

  async function refreshGitHubStatus(): Promise<void> {
    setGithubLoading(true)
    try {
      const status = await fetchGitHubConnectionStatus()
      setGithubStatus(status)
      setGithubError(null)
    } catch (error) {
      setGithubError(error instanceof Error ? error.message : 'GitHub connection status is unavailable.')
    } finally {
      setGithubLoading(false)
    }
  }

  useEffect(() => {
    void refreshGitHubStatus()
    const timer = window.setInterval(() => { void refreshGitHubStatus() }, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  async function handleAnalyze(input: string): Promise<void> {
    setIsAnalyzing(true)
    setAnalysisError(null)
    try {
      const analysisResult = await analyzeWithApi(input)
      setResult(analysisResult)
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

  function handleHistorySelect(entry: HistoryEntry) {
    const restored = entry.result ?? analyze(entry.input)
    setResult({
      ...restored,
      analyzedAt: entry.analyzedAt || restored.analyzedAt,
    })
    setAnalysisError(null)
    setPage('errors')
  }

  const activeLabel = navigation.find((item) => item.id === page)?.label ?? 'Overview'
  const apiOnline = overview?.service.status === 'ok'

  return (
    <div className="min-h-screen bg-[#080d16] text-slate-200">
      <aside className="sidebar-shell fixed inset-y-0 left-0 z-50 hidden w-[238px] flex-col border-r border-slate-800/80 bg-[#090f1a] lg:flex">
        <div className="flex h-[76px] items-center gap-3 border-b border-slate-800/80 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/10">
            <svg viewBox="0 0 64 64" className="h-6 w-6" fill="none">
              <path d="M14 12 42 32 14 52" stroke="#b9a0ff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M34 32h16" stroke="#67e8f9" strokeWidth="6" strokeLinecap="round" />
              <circle cx="50" cy="32" r="4" fill="#67e8f9" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-white">ArrowEra</p>
            <p className="text-[9px] uppercase tracking-[0.18em] text-violet-300/70">Error Mechanism</p>
          </div>
        </div>

        <div className="px-4 pt-6">
          <p className="mb-2 px-2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">Navigation</p>
          {['Workspace', 'Delivery'].map((group) => (
            <div key={group} className="mb-5">
              <p className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-600">{group}</p>
              <div className="space-y-1">
                {navigation.filter((item) => item.group === group).map((item) => (
                  <button key={item.id} type="button" onClick={() => setPage(item.id)} className={'nav-item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ' + (page === item.id ? 'nav-item-active text-violet-100' : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-200')}>
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-800/70 font-mono text-sm">{item.icon}</span>
                    <span className="text-xs font-medium">{item.label}</span>
                    {page === item.id && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-300" />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto p-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <div className="flex items-center gap-2">
              <span className={'h-2 w-2 rounded-full ' + (apiOnline ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400')} />
              <span className="text-[10px] font-semibold text-slate-300">{apiOnline ? 'API operational' : 'Connecting to API'}</span>
            </div>
            <p className="mt-2 text-[9px] leading-relaxed text-slate-600">Production workspace · Render</p>
          </div>
          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={'h-2 w-2 rounded-full ' + (githubStatus?.authenticated && githubStatus.repositoryAccessible ? 'bg-emerald-400' : githubStatus?.configured ? 'bg-amber-400' : 'bg-slate-600')} />
                <span className="text-[10px] font-semibold text-slate-300">GitHub connection</span>
              </div>
              <button type="button" onClick={() => void refreshGitHubStatus()} disabled={githubLoading} className="text-[9px] text-violet-300 hover:text-violet-200 disabled:opacity-50">
                {githubLoading ? 'Checking…' : 'Refresh'}
              </button>
            </div>
            <p className="mt-2 text-[10px] font-medium text-slate-200">
              {githubStatus?.authenticated && githubStatus.repositoryAccessible ? 'Authenticated · Repository accessible' : githubStatus?.configured ? 'Token configured · Access unverified' : githubStatus ? 'Token not configured' : githubError || 'Checking GitHub…'}
            </p>
            {githubStatus?.account && <p className="mt-1 text-[9px] text-slate-500">Account: {githubStatus.account}</p>}
            {githubStatus && <p className="mt-1 truncate text-[9px] text-slate-600">{githubStatus.repository}</p>}
            {githubStatus && <p className="mt-1 text-[9px] leading-relaxed text-slate-600">{githubStatus.message}</p>}
            {githubError && <p role="alert" className="mt-1 text-[9px] text-rose-300">{githubError}</p>}
          </div>
          <p className="mt-4 px-1 text-[9px] text-slate-700">ARROWERA · DEVOPS CONSOLE</p>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[238px]">
        <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#080d16]/90 backdrop-blur-xl">
          <div className="flex min-h-[68px] items-center justify-between gap-3 px-4 sm:px-6 xl:px-8">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                <span className="lg:hidden text-violet-300">ArrowEra</span>
                <span className="hidden lg:inline">Production workspace</span>
                <span>/</span>
                <span className="truncate text-slate-400">{activeLabel}</span>
              </div>
              <p className="mt-1 truncate text-sm font-semibold text-slate-100">Repository intelligence & automated DevOps</p>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-[9px] uppercase tracking-wider text-slate-600">Last sync</p>
                <p className="mt-0.5 font-mono text-[10px] text-slate-400">{lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '—'}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-300">
                <i className="status-pulse" />
                {apiOnline ? 'API live' : 'API pending'}
              </span>
              <div className="hidden h-8 w-px bg-slate-800 sm:block" />
              <div className="hidden items-center gap-2 sm:flex">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-[10px] font-bold text-slate-300">AE</div>
                <div><p className="text-[10px] font-semibold text-slate-300">Operator</p><p className="text-[9px] text-slate-600">Workspace admin</p></div>
              </div>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t border-slate-800/60 px-3 py-2 lg:hidden">
            {navigation.map((item) => <button key={item.id} type="button" onClick={() => setPage(item.id)} className={'shrink-0 rounded-lg px-3 py-2 text-[10px] font-medium ' + (page === item.id ? 'bg-violet-500/15 text-violet-200' : 'text-slate-500')}>{item.label}</button>)}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
          {page === 'overview' ? (
            <ProjectWorkspace onProjectContext={setProjectContext} />
          ) : page !== 'errors' ? (
            <OperationsWorkspace
              page={page}
              overview={overview}
              entries={entries}
              loading={loadingTelemetry}
              error={telemetryError}
              onNavigate={setPage}
            />
          ) : (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.22em] text-violet-300/70">ArrowEra / Diagnostics</p>
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[28px]">Error triage workbench</h1>
                <p className="mt-1.5 text-xs text-slate-500">Capture a stack trace, classify the failure and inspect the deterministic reasoning chain.</p>
              </div>
              <WorkflowStepper activeStep={result?.primary ? 3 : 0} />
              {analysisError && <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-[11px] text-rose-200">{analysisError}</div>}
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="min-w-0">
                  {result ? <AnalysisResultView result={result} onBack={() => setResult(null)} /> : <div className="rounded-2xl border border-slate-800 bg-[#0d1421] p-4 sm:p-6"><ErrorInput onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} /></div>}
                </div>
                <aside className="space-y-5">
                  {entries.length > 0 && <StatsDashboard entries={entries} />}
                  <HistoryPanel entries={entries} onClear={clear} onRemove={remove} onSelect={handleHistorySelect} />
                  <div className="rounded-xl border border-slate-800 bg-[#0d1421] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Diagnostic engine</p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">The current classifier uses a deterministic rule base. Its evidence score is a heuristic ranking aid, not a calibrated probability. The AI copilot is a separate optional integration.</p>
                  </div>
                </aside>
              </div>
            </div>
          )}
        </main>

        <footer className="border-t border-slate-800/70 px-6 py-5 text-center text-[9px] tracking-wide text-slate-700">
          ARROWERA ERROR MECHANISM · NODE RUNTIME · {new Date().getFullYear()}
        </footer>
      </div>
      <AiAssistant projectContext={projectContext} />
    </div>
  )
}
