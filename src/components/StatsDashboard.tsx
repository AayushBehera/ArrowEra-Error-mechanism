import type { HistoryEntry } from '../engine/types'

interface Props {
  entries: HistoryEntry[]
}

export function StatsDashboard({ entries }: Props) {
  if (entries.length === 0) return null

  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 }
  const langCounts: Record<string, number> = {}

  for (const entry of entries) {
    severityCounts[entry.severity]++
    langCounts[entry.language] = (langCounts[entry.language] ?? 0) + 1
  }

  const topLang = Object.entries(langCounts).sort((a, b) => b[1] - a[1])[0]
  const avgConfidence = Math.round(
    entries.reduce((sum, e) => sum + e.confidence, 0) / entries.length,
  )

  return (
    <div className="grid grid-cols-2 gap-2">
      <StatCard label="Analyzed" value={String(entries.length)} />
      <StatCard
        label="Critical/High"
        value={String(severityCounts.critical + severityCounts.high)}
      />
      <StatCard label="Top Language" value={topLang ? topLang[0] : '—'} />
      <StatCard label="Avg Confidence" value={`${avgConfidence}%`} />
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-2.5 space-y-0.5">
      <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium">
        {label}
      </p>
      <p className="text-lg font-bold text-neutral-100 truncate">{value}</p>
    </div>
  )
}
