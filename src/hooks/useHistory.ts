import { useCallback, useSyncExternalStore } from 'react'
import type { HistoryEntry } from '../engine/types'

const STORAGE_KEY = 'arrowera-error-history'

let listeners: Array<() => void> = []
let cache: HistoryEntry[] | null = null

function read(): HistoryEntry[] {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    cache = raw ? (JSON.parse(raw) as HistoryEntry[]) : []
  } catch {
    cache = []
  }
  return cache
}

function write(entries: HistoryEntry[]) {
  cache = entries
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
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
    write([entry, ...current].slice(0, 100))
  }, [])

  const clear = useCallback(() => {
    write([])
  }, [])

  const remove = useCallback((id: string) => {
    write(read().filter((e) => e.id !== id))
  }, [])

  return { entries, add, clear, remove }
}
