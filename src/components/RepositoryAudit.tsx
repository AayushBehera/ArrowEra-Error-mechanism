import { useState } from 'react'
import { analyzeRepository } from '../api/operations.ts'
import type { RepositoryAuditResult } from '../api/operations.ts'

export function RepositoryAudit() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState<RepositoryAuditResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      setResult(await analyzeRepository(url.trim()))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Repository audit failed.')
    } finally {
      setLoading(false)
    }
  }

  const meta = result?.repository
  return (
    <div className="space-y-6 animate-fade-in-up">
      <header>
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.22em] text-violet-300/70">ArrowEra / Repository intelligence</p>
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[28px]">Repository audit</h1>
        <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-slate-500">Paste a GitHub repository URL to inspect its metadata, structure, key source files, dependencies and CI/CD configuration, then generate an evidence-based engineering review.</p>
      </header>

      <section className="rounded-2xl border border-slate-800/90 bg-[#0d1421] p-4 sm:p-5">
        <form onSubmit={submit} className="space-y-3">
          <label htmlFor="repository-url" className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">GitHub repository URL</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input id="repository-url" type="url" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://github.com/owner/repository" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-violet-500/60" />
            <button type="submit" disabled={loading || !url.trim()} className="rounded-xl bg-violet-600 px-5 py-3 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40">{loading ? 'Auditing repository…' : 'Analyze repository'}</button>
          </div>
          <p className="text-[10px] leading-relaxed text-slate-600">Public repositories are supported by default. Private repositories require a server-side GITHUB_TOKEN with read access. The token is never entered in this form or sent to the browser.</p>
        </form>
        {error && <div role="alert" className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-[11px] leading-relaxed text-rose-200">{error}</div>}
        {loading && <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4"><p className="text-xs font-semibold text-violet-200">Collecting repository evidence</p><p className="mt-1 text-[10px] text-slate-500">Reading GitHub metadata, repository tree, selected manifests, source entry points and workflow files. The AI review may take up to 90 seconds.</p></div>}
      </section>

      {meta && result && (
        <>
          <section className="rounded-2xl border border-slate-800/90 bg-[#0d1421] p-4 sm:p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div className="min-w-0">
                <a href={meta.url} target="_blank" rel="noreferrer" className="break-all text-sm font-semibold text-violet-200 hover:text-white">{meta.name}</a>
                <p className="mt-1 text-[10px] text-slate-500">Default branch: <span className="font-mono text-slate-300">{meta.defaultBranch}</span> · Primary language: <span className="text-slate-300">{meta.primaryLanguage}</span></p>
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-300">Audit complete</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['Files in tree', String(meta.fileCount)],
                ['Files inspected', String(meta.inspectedFileCount)],
                ['Workflow files', String(meta.workflowCount)],
                ['Stars / forks', meta.stars + ' / ' + meta.forks],
              ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"><p className="text-[9px] uppercase tracking-wider text-slate-600">{label}</p><p className="mt-2 font-mono text-lg text-slate-100">{value}</p></div>)}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[9px] text-slate-500"><span className="rounded-md border border-slate-800 px-2 py-1">License: {meta.license}</span><span className="rounded-md border border-slate-800 px-2 py-1">Model: {result.model}</span><span className="rounded-md border border-slate-800 px-2 py-1">Last push: {new Date(meta.lastPush).toLocaleDateString()}</span>{meta.treeTruncated && <span className="rounded-md border border-amber-400/20 px-2 py-1 text-amber-300">Git tree truncated by GitHub</span>}</div>
          </section>
          <section className="rounded-2xl border border-slate-800/90 bg-[#0d1421] p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-sm font-semibold text-slate-100">Engineering assessment</h2><span className="text-[9px] uppercase tracking-wider text-slate-600">AI-generated · evidence-based</span></div>
            <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-6 text-slate-300">{result.report}</pre>
          </section>
        </>
      )}
    </div>
  )
}
