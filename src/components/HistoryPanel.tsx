import type { HistoryEntry, Severity } from '../engine/types'

interface Props {
  entries: HistoryEntry[]
  onClear: () => void
  onRemove: (id: string) => void
  onSelect: (entry: HistoryEntry) => void
}

function severityDot(severity: Severity) {
  switch (severity) {
    case 'critical':
      return 'bg-red-500'
    case 'high':
      return 'bg-orange-500'
    case 'medium':
      return 'bg-yellow-500'
    case 'low':
      return 'bg-green-500'
  }
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function HistoryPanel({ entries, onClear, onRemove, onSelect }: Props) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800/50 bg-gray-900/20 p-6 text-center">
        <p className="text-sm text-gray-500">No analyses yet.</p>
        <p className="text-xs text-gray-600 mt-1">
          Your error analysis history will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">
          History <span className="text-gray-500 font-normal">({entries.length})</span>
        </h3>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-gray-500 hover:text-red-400 transition-colors"
        >
          Clear all
        </button>
      </div>
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="group flex items-center gap-3 rounded-lg border border-gray-800/40 bg-gray-900/30 px-3 py-2.5 hover:border-indigo-500/30 hover:bg-indigo-950/10 transition-colors cursor-pointer"
            onClick={() => onSelect(entry)}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${severityDot(entry.severity)}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-200 truncate">{entry.category}</p>
              <p className="text-xs text-gray-500 truncate">{entry.input.slice(0, 60)}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-600">{timeAgo(entry.analyzedAt)}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(entry.id)
                }}
                className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                aria-label="Remove"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
