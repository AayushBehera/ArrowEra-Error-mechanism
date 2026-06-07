export function Header() {
  return (
    <header className="border-b border-indigo-950/50 bg-[#0c0c14]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto max-w-6xl flex items-center gap-3 px-5 py-4">
        {/* Logo mark */}
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30">
          <svg viewBox="0 0 64 64" className="w-5 h-5" fill="none">
            <path
              d="M16 12 L44 32 L16 52"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-indigo-400"
            />
            <circle cx="46" cy="32" r="5" className="fill-indigo-400" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-gray-100">
            ArrowEra <span className="text-indigo-400">Error Mechanism</span>
          </h1>
          <p className="text-xs text-gray-500 -mt-0.5">
            Intelligent error triage & reasoning
          </p>
        </div>
      </div>
    </header>
  )
}
