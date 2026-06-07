import { useState } from 'react'
import { examples } from '../engine/examples'

interface Props {
  onAnalyze: (input: string) => void
}

export function ErrorInput({ onAnalyze }: Props) {
  const [value, setValue] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (value.trim()) onAnalyze(value)
  }

  function handleExample(text: string) {
    setValue(text)
    onAnalyze(text)
  }

  return (
    <section className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          Paste an error or stack trace
        </label>
        <textarea
          className="w-full min-h-[140px] rounded-lg border border-neutral-700 bg-black px-3 py-2.5 text-xs font-mono text-neutral-200 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-400 resize-y transition"
          placeholder={"TypeError: Cannot read properties of undefined (reading 'map')\n    at UserList (src/components/UserList.tsx:14:22)"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          spellCheck={false}
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={!value.trim()}
            className="flex-1 px-4 py-2 rounded-lg bg-neutral-100 text-black text-sm font-medium hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Analyze
          </button>
          <button
            type="button"
            onClick={() => setValue('')}
            className="px-3 py-2 rounded-lg border border-neutral-700 text-neutral-400 text-sm hover:text-neutral-100 hover:border-neutral-500 transition-colors"
          >
            Clear
          </button>
        </div>
      </form>

      {/* Example pills */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          Try an example
        </p>
        <div className="flex flex-wrap gap-1.5">
          {examples.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => handleExample(ex.text)}
              className="px-2.5 py-1 rounded-full text-[11px] border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-100 hover:border-neutral-500 transition-colors"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
