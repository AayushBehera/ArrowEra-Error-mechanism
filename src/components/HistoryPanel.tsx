import type { HistoryEntry, Severity } from '../engine/types'

interface Props {
  entries: HistoryEntry[]
  onClear: () => void
  onRemove: (id: string) => void
  onSelect: (entry: HistoryEntry) => void
}

const SEVERITY_LEVEL: Record<Severity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}

function SeverityDots({ severity }: { severity: Severity }) {
  const level = SEVERITY_LEVEL[severity]
  return (
    <span className="flex items-end gap-0.5 h-3 shrink-0" aria-label={severity}>
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`w-0.5 rounded-sm ${i <= level ? 'bg-neutral-100' : 'bg-neutral-700'}`}
          style={{ height: `${i * 25}%` }}
        />
      ))}
    </span>
  )
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
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/20 p-5 text-center">
        <p className="text-sm text-neutral-500">No analyses yet.</p>
        <p className="text-xs text-neutral-600 mt-1">
          Your history will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          History <span className="text-neutral-600">({entries.length})</span>
        </h3>
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] text-neutral-500 hover:text-neutral-200 transition-colors"
        >
          Clear all
        </button>
      </div>
      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="group flex items-center gap-2.5 rounded-lg border border-neutral-800 bg-neutral-900/30 px-3 py-2 hover:border-neutral-500 transition-colors cursor-pointer"
            onClick={() => onSelect(entry)}
          >
            <SeverityDots severity={entry.severity} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-neutral-200 truncate">{entry.category}</p>
              <p className="text-xs text-neutral-500 truncate">
                {entry.input.slice(0, 56)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-neutral-600">
                {timeAgo(entry.analyzedAt)}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(entry.id)
                }}
                className="opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-neutral-200 transition-all"
                aria-label="Remove"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
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
