interface Step {
  label: string
  icon: string
}

const steps: Step[] = [
  { label: 'Capture', icon: '1' },
  { label: 'Analyze', icon: '2' },
  { label: 'Diagnose', icon: '3' },
  { label: 'Resolve', icon: '4' },
]

interface Props {
  activeStep: number
}

export function WorkflowStepper({ activeStep }: Props) {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {steps.map((step, i) => {
        const isActive = i === activeStep
        const isDone = i < activeStep
        return (
          <div key={step.label} className="flex items-center gap-1 sm:gap-2">
            {i > 0 && (
              <div
                className={`hidden sm:block w-6 h-px ${
                  isDone ? 'bg-indigo-500' : 'bg-gray-700'
                }`}
              />
            )}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600/25 text-indigo-300 ring-1 ring-indigo-500/40'
                  : isDone
                    ? 'bg-indigo-900/30 text-indigo-400'
                    : 'bg-gray-800/40 text-gray-500'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : isDone
                      ? 'bg-indigo-700 text-indigo-200'
                      : 'bg-gray-700 text-gray-400'
                }`}
              >
                {isDone ? '✓' : step.icon}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
