import { useEffect, useRef, useState } from 'react'
import { createRepositoryFix, fetchAiStatus, sendAiMessage } from '../api/operations.ts'
import type { AiStatus, ChatMessage } from '../api/operations.ts'

const starter: ChatMessage[] = [
  {
    role: 'assistant',
    content: 'I am the ArrowEra engineering copilot. I use the connected repository and deployment context to investigate issues and prepare code fixes for review.',
  },
]

export function AiAssistant({ projectContext }: { projectContext: string }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<AiStatus | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>(starter)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [fixNotice, setFixNotice] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    fetchAiStatus()
      .then((value) => { if (active) setStatus(value) })
      .catch((error: unknown) => {
        if (active) setStatusError(error instanceof Error ? error.message : 'AI status is unavailable.')
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open])

  async function prepareFix() {
    const issue = draft.trim()
    const match = projectContext.match(/Repository: (https:\/\/github\.com\/\S+)/)
    if (!issue || !match || fixing || !status?.configured) return
    setFixing(true)
    setFixNotice(null)
    try {
      const result = await createRepositoryFix(match[1], issue, projectContext)
      setFixNotice('Pull request #' + result.pullRequestNumber + ' created with ' + result.files.length + ' file change(s). Review it before merging: ' + result.pullRequestUrl)
      setMessages((current) => [...current, { role: 'assistant', content: 'I prepared a fix branch and opened pull request #' + result.pullRequestNumber + '. No changes were merged into the default branch. Review the pull request and run your checks before merging.\n' + result.pullRequestUrl }])
      setDraft('')
    } catch (error) {
      setFixNotice(error instanceof Error ? error.message : 'Could not prepare repository fix.')
    } finally { setFixing(false) }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = draft.trim()
    if (!content || sending || !status?.configured) return

    const next = [...messages, { role: 'user' as const, content }]
    setMessages(next)
    setDraft('')
    setSending(true)
    try {
      const reply = await sendAiMessage(next.slice(-12), projectContext)
      setMessages((current) => [...current, { role: 'assistant', content: reply.answer }])
    } catch (error) {
      setMessages((current) => [...current, {
        role: 'assistant',
        content: error instanceof Error ? error.message : 'The model request failed. Check the server configuration.',
      }])
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {open && (
        <section
          aria-label="AI operations assistant"
          className="ai-panel fixed bottom-24 right-5 z-[80] flex w-[min(410px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0b1220] shadow-2xl shadow-black/50"
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/15 text-violet-300">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1" strokeLinecap="round" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">ArrowEra Copilot</p>
                <p className="text-[11px] text-slate-500">Repository-aware engineering & remediation</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-slate-200">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" /></svg>
            </button>
          </div>

          <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/50 px-4 py-2.5">
            <span className="text-[11px] text-slate-400">{status?.model || 'OpenAI-compatible model'}</span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider">
              <span className={'h-1.5 w-1.5 rounded-full ' + (status?.configured ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400')} />
              <span className={status?.configured ? 'text-emerald-300' : 'text-amber-300'}>{status?.configured ? 'Configured' : 'API key pending'}</span>
            </span>
          </div>

          <div ref={scrollRef} className="flex max-h-[390px] min-h-[260px] flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
            {messages.map((message, index) => (
              <div key={index} className={'max-w-[92%] rounded-2xl px-3.5 py-3 text-[12px] leading-relaxed ' + (message.role === 'user' ? 'self-end rounded-br-md bg-violet-600/25 text-violet-100' : 'self-start rounded-bl-md border border-slate-700/70 bg-slate-900 text-slate-300')}>
                <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">{message.role === 'user' ? 'You' : 'Copilot'}</p>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            ))}
            {sending && <div className="self-start rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-400">Analyzing context…</div>}
          </div>

          {!status?.configured && (
            <div className="mx-4 mb-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
              <p className="text-[11px] font-semibold text-amber-200">Connect a model to enable chat</p>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-400">Add <code className="text-amber-200">AI_API_KEY</code> in Render. Optional: set <code className="text-amber-200">AI_MODEL</code> and <code className="text-amber-200">AI_BASE_URL</code>. The key stays on the server.</p>
              {statusError && <p className="mt-1 text-[10px] text-slate-500">{statusError}</p>}
            </div>
          )}

          {fixNotice && <div className="mx-3 mb-2 break-words rounded-lg border border-violet-400/20 bg-violet-500/5 px-3 py-2 text-[10px] leading-relaxed text-violet-200">{fixNotice}</div>}
          <form onSubmit={submit} className="flex flex-col gap-2 border-t border-slate-800 p-3">
            <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={2}
              maxLength={4000}
              placeholder={status?.configured ? (projectContext ? 'Ask about this application or request a code fix…' : 'Connect a repository to add project context…') : 'Chat becomes available after the API key is added'}
              disabled={!status?.configured || sending}
              className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-violet-500/60 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!status?.configured || !draft.trim() || sending}
              aria-label="Send message"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="m4 12 16-8-5 16-3-7-8-1Z" strokeLinejoin="round" /><path d="m12 13 8-9" /></svg>
            </button>
            </div>
            {projectContext && <button type="button" onClick={() => void prepareFix()} disabled={!status?.configured || !status.githubWriteConfigured || !draft.trim() || fixing || sending} className="w-full rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-[10px] font-semibold text-violet-200 hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-40">{fixing ? 'Preparing fix branch & pull request…' : status?.githubWriteConfigured ? 'Generate fix & open GitHub pull request' : 'GitHub write token required for code fixes'}</button>}
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
        className="ai-launcher fixed bottom-5 right-5 z-[80] flex h-14 items-center gap-2.5 rounded-2xl border border-violet-400/35 bg-[#17102a] px-4 text-white shadow-xl shadow-violet-950/40 transition hover:-translate-y-0.5 hover:bg-[#21143b]"
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/20 text-violet-200">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1" strokeLinecap="round" /><circle cx="12" cy="12" r="4" /></svg>
          <span className={'absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-[#17102a] ' + (status?.configured ? 'bg-emerald-400' : 'bg-amber-400')} />
        </span>
        <span className="text-left">
          <span className="block text-xs font-semibold tracking-wide">AI Copilot</span>
          <span className="block text-[9px] text-violet-200/60">{status?.configured ? 'Repository context ' + (projectContext ? 'attached' : 'not connected')' : 'Configure API key'}</span>
        </span>
      </button>
    </>
  )
}
