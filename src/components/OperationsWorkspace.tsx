import type { HistoryEntry } from '../engine/types.ts'
import type { OperationsOverview, PipelineRun } from '../api/operations.ts'

export type WorkspacePage = 'overview' | 'pipelines' | 'services'

interface Props {
  page: WorkspacePage
  overview: OperationsOverview | null
  entries: HistoryEntry[]
  loading: boolean
  error: string | null
  onNavigate: (page: 'overview' | 'errors' | 'pipelines' | 'services') => void
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return Math.floor(seconds) + 's'
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ' + Math.floor(seconds % 60) + 's'
  return Math.floor(seconds / 3600) + 'h ' + Math.floor((seconds % 3600) / 60) + 'm'
}

function timeAgo(value: string): string {
  const delta = Math.max(0, Date.now() - new Date(value).getTime())
  const minutes = Math.floor(delta / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return minutes + 'm ago'
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return hours + 'h ago'
  return Math.floor(hours / 24) + 'd ago'
}

function runState(run: PipelineRun): { label: string; tone: string } {
  if (run.status === 'in_progress') return { label: 'Running', tone: 'text-sky-300 bg-sky-400/10 border-sky-400/20' }
  if (run.status === 'queued' || run.status === 'waiting') return { label: 'Queued', tone: 'text-amber-300 bg-amber-400/10 border-amber-400/20' }
  if (run.conclusion === 'success') return { label: 'Passed', tone: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' }
  if (run.conclusion === 'failure') return { label: 'Failed', tone: 'text-rose-300 bg-rose-400/10 border-rose-400/20' }
  if (run.conclusion === 'cancelled') return { label: 'Cancelled', tone: 'text-slate-300 bg-slate-400/10 border-slate-400/20' }
  return { label: run.conclusion || run.status || 'Unknown', tone: 'text-slate-300 bg-slate-400/10 border-slate-400/20' }
}

function SectionTitle({ eyebrow, title, aside }: { eyebrow?: string; title: string; aside?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-violet-300/70">{eyebrow}</p>}
        <h2 className="text-sm font-semibold tracking-wide text-slate-100">{title}</h2>
      </div>
      {aside}
    </div>
  )
}

function MetricCard({ label, value, detail, tone, icon, pulse }: { label: string; value: string; detail: string; tone: string; icon: string; pulse?: boolean }) {
  return (
    <article className="metric-card rounded-2xl border border-slate-800/90 bg-[#0d1421] p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
        <span className={'flex h-8 w-8 items-center justify-center rounded-xl border text-sm ' + tone}>{icon}</span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-2">
        <p className="font-mono text-[26px] font-semibold leading-none tracking-tight text-slate-100">{value}</p>
        {pulse && <span className="mb-0.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-300"><i className="status-pulse" /> Live</span>}
      </div>
      <p className="mt-2 text-[10px] text-slate-500">{detail}</p>
    </article>
  )
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={'rounded-2xl border border-slate-800/90 bg-[#0d1421] p-4 sm:p-5 ' + className}>{children}</section>
}

function TelemetryChart({ overview }: { overview: OperationsOverview | null }) {
  const points = overview?.metrics ?? []
  const values = points.map((point) => point.heapUsedMb)
  const max = Math.max(64, ...values) * 1.15
  const min = Math.min(0, ...values)
  const width = 680
  const height = 170
  const line = values.map((value, index) => {
    const x = points.length <= 1 ? width / 2 : 14 + index * ((width - 28) / (points.length - 1))
    const y = height - 18 - ((value - min) / Math.max(1, max - min)) * (height - 38)
    return (index === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1)
  }).join(' ')
  const area = values.length ? line + ' L ' + (points.length <= 1 ? width / 2 : width - 14) + ' ' + (height - 18) + ' L 14 ' + (height - 18) + ' Z' : ''

  return (
    <Panel className="min-w-0">
      <SectionTitle
        eyebrow="Runtime telemetry"
        title="Node process memory"
        aside={<span className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-emerald-300"><i className="status-pulse" /> Polling every 15s</span>}
      />
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="font-mono text-2xl font-semibold text-slate-100">{overview ? overview.service.heapUsedMb.toFixed(1) + ' MB' : '—'}</p>
          <p className="mt-1 text-[10px] text-slate-500">Heap used by the live backend process</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm text-slate-300">{overview ? overview.service.heapTotalMb.toFixed(1) + ' MB' : '—'}</p>
          <p className="text-[9px] uppercase tracking-wider text-slate-600">Heap allocated</p>
        </div>
      </div>
      <div className="grid-bg overflow-hidden rounded-xl border border-slate-800/70 bg-[#080e18] px-2 pt-2">
        <svg viewBox={'0 0 ' + width + ' ' + height} className="h-[150px] w-full" role="img" aria-label="Live Node.js heap usage chart">
          {[0, 1, 2, 3].map((row) => <line key={row} x1="0" x2={width} y1={20 + row * 42} y2={20 + row * 42} stroke="#243044" strokeDasharray="3 5" strokeWidth="1" />)}
          {values.length > 0 && <path d={area} fill="url(#memoryFill)" opacity=".75" />}
          {values.length > 0 && <path d={line} fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
          {values.length > 0 && <circle cx={points.length <= 1 ? width / 2 : width - 14} cy={height - 18 - ((values[values.length - 1] - min) / Math.max(1, max - min)) * (height - 38)} r="4" fill="#c4b5fd" stroke="#0d1421" strokeWidth="2" />}
          <defs><linearGradient id="memoryFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity=".35" /><stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" /></linearGradient></defs>
        </svg>
        {points.length < 2 && <p className="pb-3 text-center text-[10px] text-slate-600">Collecting runtime samples. The graph fills as live polls arrive.</p>}
      </div>
      <div className="mt-3 flex justify-between text-[9px] text-slate-600">
        <span>{points[0] ? new Date(points[0].timestamp).toLocaleTimeString() : 'Waiting for sample'}</span>
        <span>{points.length} samples · {overview?.service.requestCount ?? 0} requests since process start</span>
        <span>{points.length ? 'Now' : '—'}</span>
      </div>
    </Panel>
  )
}

function PipelinePanel({ runs, connected, message, compact = false }: { runs: PipelineRun[]; connected: boolean; message: string; compact?: boolean }) {
  const visible = compact ? runs.slice(0, 4) : runs
  return (
    <Panel>
      <SectionTitle
        eyebrow="CI / CD"
        title="GitHub Actions pipelines"
        aside={<span className={'rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider ' + (connected ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/20 bg-amber-400/10 text-amber-300')}>{connected ? 'Connected' : 'No feed'}</span>}
      />
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700/80 bg-slate-950/40 px-4 py-7 text-center">
          <p className="text-xs font-medium text-slate-300">No workflow runs received</p>
          <p className="mx-auto mt-1 max-w-sm text-[10px] leading-relaxed text-slate-500">{message || 'The GitHub Actions API did not return runs.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((run) => {
            const state = runState(run)
            return (
              <a key={run.id} href={run.url} target="_blank" rel="noreferrer" className="group flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-3 transition hover:border-violet-500/30 hover:bg-violet-500/[0.04]">
                <span className={'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs ' + state.tone}>
                  {run.status === 'in_progress' ? '↻' : run.conclusion === 'success' ? '✓' : run.conclusion === 'failure' ? '!' : '⌁'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-slate-200 group-hover:text-white">{run.name}</span>
                  <span className="mt-1 block truncate font-mono text-[9px] text-slate-600">{run.branch} · {run.event} · #{run.id}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className={'rounded-md border px-2 py-1 text-[9px] font-semibold ' + state.tone}>{state.label}</span>
                  <span className="text-[9px] text-slate-600">{timeAgo(run.updatedAt)}</span>
                </span>
              </a>
            )
          })}
        </div>
      )}
      <p className="mt-3 text-[9px] text-slate-600">Run state and links are retrieved from the repository's GitHub Actions API.</p>
    </Panel>
  )
}

function Topology({ overview, expanded = false }: { overview: OperationsOverview | null; expanded?: boolean }) {
  const apiOk = overview?.service.status === 'ok'
  const githubOk = overview?.connections.githubActions.connected === true
  const aiOk = overview?.connections.ai.configured === true
  const nodes = [
    { title: 'Web console', sub: 'React · Vite', state: 'Online', ok: true, symbol: 'UI' },
    { title: 'Node API', sub: 'HTTP · /api', state: apiOk ? 'Healthy' : 'Waiting', ok: apiOk, symbol: 'API' },
    { title: 'Rule engine', sub: 'Deterministic analyzer', state: apiOk ? 'Available' : 'Waiting', ok: apiOk, symbol: 'RE' },
    { title: 'GitHub Actions', sub: 'Workflow telemetry', state: githubOk ? 'Connected' : 'Unavailable', ok: githubOk, symbol: 'CI' },
    { title: 'AI provider', sub: overview?.connections.ai.model || 'Model not selected', state: aiOk ? 'Connected' : 'Key pending', ok: aiOk, symbol: 'AI' },
  ]
  return (
    <Panel className={expanded ? 'p-5 sm:p-6' : ''}>
      <SectionTitle eyebrow="Architecture map" title="Service topology" aside={<span className="text-[9px] uppercase tracking-wider text-slate-600">Connection state</span>} />
      <div className={'topology-grid grid gap-2 ' + (expanded ? 'grid-cols-1 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-5')}>
        {nodes.map((node, index) => (
          <div key={node.title} className="relative flex min-w-0 flex-col items-center rounded-xl border border-slate-800/80 bg-slate-950/50 px-2 py-4 text-center">
            <div className={'mb-3 flex h-10 w-10 items-center justify-center rounded-xl border font-mono text-xs font-bold ' + (node.ok ? 'border-violet-400/30 bg-violet-500/10 text-violet-200' : 'border-slate-700 bg-slate-800/70 text-slate-500')}>{node.symbol}</div>
            <p className="text-[10px] font-semibold text-slate-200">{node.title}</p>
            <p className="mt-1 min-h-7 text-[9px] leading-relaxed text-slate-600">{node.sub}</p>
            <span className={'mt-2 inline-flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wider ' + (node.ok ? 'text-emerald-300' : 'text-amber-300')}>
              <i className={'h-1.5 w-1.5 rounded-full ' + (node.ok ? 'bg-emerald-400' : 'bg-amber-400')} />{node.state}
            </span>
            {index < nodes.length - 1 && <span className="topology-arrow absolute -right-[10px] top-1/2 z-10 hidden -translate-y-1/2 text-sm text-violet-300/80 sm:block">›</span>}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[9px] leading-relaxed text-slate-600">The map shows the current application connections. The AI node remains disconnected until a server-side API key is configured.</p>
    </Panel>
  )
}

function RecentActivity({ entries }: { entries: HistoryEntry[] }) {
  const latest = entries.slice(0, 5)
  return (
    <Panel>
      <SectionTitle eyebrow="Error intelligence" title="Recent diagnoses" aside={<span className="text-[9px] text-slate-600">Browser-local history</span>} />
      {latest.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700/80 px-4 py-7 text-center">
          <p className="text-xs text-slate-400">No diagnoses recorded in this browser</p>
          <p className="mt-1 text-[10px] text-slate-600">Run an error analysis to populate this activity feed.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {latest.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-950/30 px-3 py-2.5">
              <span className={'h-2 w-2 shrink-0 rounded-full ' + (entry.severity === 'critical' || entry.severity === 'high' ? 'bg-rose-400' : entry.severity === 'medium' ? 'bg-amber-300' : 'bg-emerald-400')} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-slate-200">{entry.category}</span>
                <span className="block truncate text-[9px] text-slate-600">{entry.input.slice(0, 100)}</span>
              </span>
              <span className="shrink-0 text-[9px] text-slate-600">{timeAgo(new Date(entry.analyzedAt).toISOString())}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

function ServiceDetails({ overview }: { overview: OperationsOverview | null }) {
  const rows = [
    ['Runtime', overview?.service.nodeVersion || '—'],
    ['Platform', overview?.service.platform || '—'],
    ['Uptime', overview ? formatDuration(overview.service.uptimeSeconds) : '—'],
    ['Heap used', overview ? overview.service.heapUsedMb.toFixed(1) + ' MB' : '—'],
    ['Requests', overview ? String(overview.service.requestCount) : '—'],
    ['Analysis calls', overview ? String(overview.service.analysisCount) : '—'],
    ['AI model', overview?.connections.ai.model || 'Not configured'],
    ['GitHub repository', overview?.connections.githubActions.repository || '—'],
  ]
  return (
    <Panel>
      <SectionTitle eyebrow="Backend diagnostics" title="Runtime details" />
      <div className="divide-y divide-slate-800/80">
        {rows.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-4 py-3"><span className="text-[10px] text-slate-500">{label}</span><span className="max-w-[65%] truncate text-right font-mono text-[10px] text-slate-300">{value}</span></div>)}
      </div>
    </Panel>
  )
}

export function OperationsWorkspace({ page, overview, entries, loading, error, onNavigate }: Props) {
  const service = overview?.service
  const github = overview?.connections.githubActions
  const ai = overview?.connections.ai

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.22em] text-violet-300/70">ArrowEra / Operations</p>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[28px]">
            {page === 'overview' ? 'Operations overview' : page === 'pipelines' ? 'Pipeline intelligence' : 'Service architecture'}
          </h1>
          <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-slate-500">
            {page === 'overview' ? 'Monitor runtime health, inspect CI/CD execution and trace the application service graph.' : page === 'pipelines' ? 'Live workflow runs from the connected GitHub repository, with direct links to execution details.' : 'Inspect the application components, runtime connections and integration readiness.'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span>
          {loading ? 'Refreshing telemetry…' : overview ? 'Telemetry connected' : 'Waiting for backend'}
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-[11px] text-rose-200">{error}</div>}

      {page === 'overview' && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Backend status" value={service?.status === 'ok' ? 'ONLINE' : '—'} detail={service ? 'Node API responding' : 'Waiting for health snapshot'} tone="border-emerald-400/20 bg-emerald-400/10 text-emerald-300" icon="◎" pulse={!!service} />
            <MetricCard label="Workflow runs" value={String(overview?.pipelines.length ?? 0)} detail={github?.connected ? 'Latest runs from GitHub Actions' : 'GitHub Actions feed unavailable'} tone="border-sky-400/20 bg-sky-400/10 text-sky-300" icon="⇄" />
            <MetricCard label="Analysis requests" value={String(service?.analysisCount ?? 0)} detail="Since current backend process started" tone="border-violet-400/20 bg-violet-400/10 text-violet-300" icon="⌘" />
            <MetricCard label="AI copilot" value={ai?.configured ? 'READY' : 'PENDING'} detail={ai?.configured ? ai.model : 'API key not configured'} tone={ai?.configured ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/20 bg-amber-400/10 text-amber-300'} icon="✧" />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
            <TelemetryChart overview={overview} />
            <PipelinePanel runs={overview?.pipelines ?? []} connected={github?.connected ?? false} message={github?.message ?? 'Waiting for GitHub Actions connection.'} compact />
          </div>

          <Topology overview={overview} />

          <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
            <RecentActivity entries={entries} />
            <Panel>
              <SectionTitle eyebrow="Service operations" title="Quick actions" />
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <button onClick={() => onNavigate('errors')} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-left transition hover:border-violet-500/40 hover:bg-violet-500/[0.05]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">⌘</span>
                  <span><span className="block text-xs font-semibold text-slate-200">Analyze an error</span><span className="mt-1 block text-[9px] text-slate-600">Run the deterministic triage engine</span></span>
                  <span className="ml-auto text-slate-600">→</span>
                </button>
                <button onClick={() => onNavigate('pipelines')} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-left transition hover:border-sky-500/40 hover:bg-sky-500/[0.05]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-300">⇄</span>
                  <span><span className="block text-xs font-semibold text-slate-200">Inspect pipelines</span><span className="mt-1 block text-[9px] text-slate-600">Review recent GitHub Actions runs</span></span>
                  <span className="ml-auto text-slate-600">→</span>
                </button>
              </div>
              <div className="mt-4 rounded-xl border border-slate-800/70 bg-slate-950/30 p-3">
                <div className="flex items-center justify-between text-[10px]"><span className="text-slate-500">Process uptime</span><span className="font-mono text-slate-300">{service ? formatDuration(service.uptimeSeconds) : '—'}</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full w-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" /></div>
                <p className="mt-2 text-[9px] text-slate-600">A process uptime indicator, not a third-party availability SLA.</p>
              </div>
            </Panel>
          </div>
        </>
      )}

      {page === 'pipelines' && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Recent workflow runs" value={String(overview?.pipelines.length ?? 0)} detail="Latest runs returned by GitHub" tone="border-sky-400/20 bg-sky-400/10 text-sky-300" icon="⇄" />
            <MetricCard label="Currently running" value={String((overview?.pipelines ?? []).filter((run) => run.status === 'in_progress').length)} detail="Active executions in returned runs" tone="border-amber-400/20 bg-amber-400/10 text-amber-300" icon="↻" />
            <MetricCard label="Latest conclusion" value={overview?.pipelines[0]?.conclusion?.toUpperCase() ?? '—'} detail={overview?.pipelines[0] ? timeAgo(overview.pipelines[0].updatedAt) : 'No run returned'} tone="border-emerald-400/20 bg-emerald-400/10 text-emerald-300" icon="✓" />
          </div>
          <PipelinePanel runs={overview?.pipelines ?? []} connected={github?.connected ?? false} message={github?.message ?? 'Waiting for GitHub Actions connection.'} />
          <Panel>
            <SectionTitle eyebrow="Execution flow" title="How CI/CD telemetry is sourced" />
            <div className="grid gap-3 md:grid-cols-3">
              {[
                ['01 · Source', 'GitHub Actions API', 'Workflow run status, branch, event, conclusion and execution links.'],
                ['02 · Normalize', 'ArrowEra backend', 'The Node API maps provider responses to a compact status feed.'],
                ['03 · Visualize', 'Operations console', 'The dashboard refreshes the feed on a 15-second polling interval.'],
              ].map(([step, title, description]) => <div key={step} className="rounded-xl border border-slate-800 bg-slate-950/35 p-4"><p className="text-[9px] font-bold uppercase tracking-wider text-violet-300/70">{step}</p><p className="mt-2 text-xs font-semibold text-slate-200">{title}</p><p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">{description}</p></div>)}
            </div>
          </Panel>
        </>
      )}

      {page === 'services' && (
        <>
          <Topology overview={overview} expanded />
          <div className="grid gap-4 xl:grid-cols-2">
            <ServiceDetails overview={overview} />
            <Panel>
              <SectionTitle eyebrow="Integration health" title="External connections" />
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                  <span className={'mt-1 h-2 w-2 rounded-full ' + (github?.connected ? 'bg-emerald-400' : 'bg-amber-400')} />
                  <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-200">GitHub Actions</p><p className="mt-1 break-words text-[10px] leading-relaxed text-slate-500">{github?.message || 'Checking repository workflow access.'}</p></div>
                  <span className="text-[9px] uppercase tracking-wider text-slate-500">{github?.connected ? 'Connected' : 'Limited'}</span>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                  <span className={'mt-1 h-2 w-2 rounded-full ' + (ai?.configured ? 'bg-emerald-400' : 'bg-amber-400')} />
                  <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-200">AI inference API</p><p className="mt-1 text-[10px] leading-relaxed text-slate-500">{ai?.configured ? 'Server-side model configuration is present.' : 'Awaiting AI_API_KEY on the Render service. No key is stored in the browser.'}</p></div>
                  <span className="text-[9px] uppercase tracking-wider text-slate-500">{ai?.configured ? 'Ready' : 'Pending'}</span>
                </div>
              </div>
              <button onClick={() => onNavigate('overview')} className="mt-4 rounded-lg border border-slate-700 px-3 py-2 text-[10px] font-semibold text-slate-300 transition hover:border-violet-500/40 hover:text-white">Back to overview</button>
            </Panel>
          </div>
        </>
      )}
    </div>
  )
}
