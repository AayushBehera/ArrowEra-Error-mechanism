import { useCallback, useSyncExternalStore } from 'react'
import type { HistoryEntry, Language, Severity } from '../engine/types.ts'

const STORAGE_KEY = 'arrowera-error-history'
const MAX_ENTRIES = 100

const KNOWN_SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low']
const KNOWN_LANGUAGES: Language[] = [
  'javascript',
  'typescript',
  'python',
  'java',
  'network',
  'general',
]

let listeners: Array<() => void> = []
let cache: HistoryEntry[] | null = null

/**
 * localStorage is an untrusted boundary (hand-edited, stale versions, other
 * tabs). Drop malformed entries instead of letting them poison the UI.
 */
function normalizeEntry(raw: unknown): HistoryEntry | null {
  if (typeof raw !== 'object' || raw === null) return null
  const e = raw as Partial<HistoryEntry>
  if (typeof e.id !== 'string' || e.id === '') return null
  if (typeof e.input !== 'string') return null
  if (!KNOWN_SEVERITIES.includes(e.severity as Severity)) return null
  if (!KNOWN_LANGUAGES.includes(e.language as Language)) return null
  return {
    id: e.id,
    input: e.input,
    category: typeof e.category === 'string' ? e.category : 'Unknown',
    severity: e.severity as Severity,
    language: e.language as Language,
    confidence:
      typeof e.confidence === 'number' && Number.isFinite(e.confidence)
        ? e.confidence
        : 0,
    analyzedAt:
      typeof e.analyzedAt === 'number' && Number.isFinite(e.analyzedAt)
        ? e.analyzedAt
        : 0,
  }
}

function read(): HistoryEntry[] {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    cache = Array.isArray(parsed)
      ? parsed
          .map(normalizeEntry)
          .filter((e): e is HistoryEntry => e !== null)
      : []
  } catch {
    cache = []
  }
  return cache
}

function write(entries: HistoryEntry[]) {
  cache = entries
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Persistence is best-effort — quota or private-mode failures must not
    // crash the app. The in-memory cache still serves this session.
    console.warn('ArrowEra: could not persist history to localStorage')
  }
  for (const listener of listeners) listener()
}

function subscribe(cb: () => void) {
  listeners.push(cb)
  return () => {
    listeners = listeners.filter((l) => l !== cb)
  }
}

function getSnapshot() {
  return read()
}

export function useHistory() {
  const entries = useSyncExternalStore(subscribe, getSnapshot)

  const add = useCallback((entry: HistoryEntry) => {
    const current = read()
    // Re-analyzing an error replaces its old entry instead of stacking
    // duplicates — history stays a list of distinct problems.
    const deduped = current.filter((e) => e.input !== entry.input)
    write([entry, ...deduped].slice(0, MAX_ENTRIES))
  }, [])

  const clear = useCallback(() => {
    write([])
  }, [])

  const remove = useCallback((id: string) => {
    write(read().filter((e) => e.id !== id))
  }, [])

  return { entries, add, clear, remove }
}
