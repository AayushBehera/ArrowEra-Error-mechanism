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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard
        label="Total Analyzed"
        value={String(entries.length)}
        accent="text-indigo-400"
      />
      <StatCard
        label="Critical/High"
        value={String(severityCounts.critical + severityCounts.high)}
        accent="text-red-400"
      />
      <StatCard
        label="Top Language"
        value={topLang ? topLang[0] : '—'}
        accent="text-emerald-400"
      />
      <StatCard
        label="Avg Confidence"
        value={`${avgConfidence}%`}
        accent="text-yellow-400"
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent: string
}) {
  return (
    <div className="rounded-lg border border-gray-800/40 bg-gray-900/30 px-3 py-3 space-y-0.5">
      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
        {label}
      </p>
      <p className={`text-lg font-bold ${accent}`}>{value}</p>
    </div>
  )
}
