export function Header() {
  return (
    <header className="border-b border-neutral-800 bg-black/80 backdrop-blur-md">
      <div className="flex items-center gap-3 px-5 py-3">
        {/* Logo mark */}
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-neutral-900 border border-neutral-700">
          <svg viewBox="0 0 64 64" className="w-5 h-5" fill="none">
            <path
              d="M16 12 L44 32 L16 52"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-neutral-100"
            />
            <circle cx="46" cy="32" r="5" className="fill-neutral-100" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-neutral-100">
            ArrowEra <span className="text-neutral-400">Error Mechanism</span>
          </h1>
          <p className="text-xs text-neutral-500 -mt-0.5">
            Node-graph reasoning workbench
          </p>
        </div>
      </div>
    </header>
  )
}
