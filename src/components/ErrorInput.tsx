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
    <section className="space-y-4 animate-fade-in-up">
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">
          Paste your error message or stack trace
        </label>
        <textarea
          className="w-full min-h-[160px] rounded-xl border border-gray-700/60 bg-gray-900/60 px-4 py-3 text-sm font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-y transition"
          placeholder={"TypeError: Cannot read properties of undefined (reading 'map')\n    at UserList (src/components/UserList.tsx:14:22)\n    at renderWithHooks ..."}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          spellCheck={false}
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!value.trim()}
            className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
          >
            Analyze Error
          </button>
          <button
            type="button"
            onClick={() => setValue('')}
            className="px-4 py-2.5 rounded-lg border border-gray-700 text-gray-400 text-sm hover:text-gray-200 hover:border-gray-500 transition-colors"
          >
            Clear
          </button>
        </div>
      </form>

      {/* Example pills */}
      <div className="space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
          Try an example
        </p>
        <div className="flex flex-wrap gap-2">
          {examples.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => handleExample(ex.text)}
              className="px-3 py-1.5 rounded-full text-xs border border-gray-700/60 bg-gray-800/40 text-gray-400 hover:text-indigo-300 hover:border-indigo-500/40 hover:bg-indigo-950/30 transition-colors"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
