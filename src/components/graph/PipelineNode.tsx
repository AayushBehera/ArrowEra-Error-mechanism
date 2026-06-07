import type { JSX } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { FlowNode, PipelineNodeKind } from '../../graph/graphTypes'

interface KindMeta {
  label: string
  /** Border / accent treatment — all grayscale to keep the canvas monochrome. */
  border: string
  glyph: JSX.Element
}

function icon(path: string): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-3.5 h-3.5"
    >
      <path d={path} />
    </svg>
  )
}

const KIND_META: Record<PipelineNodeKind, KindMeta> = {
  input: {
    label: 'Input',
    border: 'border-neutral-300',
    glyph: icon('M8 6l-6 6 6 6 M16 6l6 6-6 6'),
  },
  language: {
    label: 'Detect',
    border: 'border-neutral-600',
    glyph: icon('M4 7V4h16v3 M9 20h6 M12 4v16'),
  },
  reasoning: {
    label: 'Reason',
    border: 'border-neutral-700',
    glyph: icon('M12 3a6 6 0 00-4 10.5V17h8v-3.5A6 6 0 0012 3z M9 21h6'),
  },
  primary: {
    label: 'Diagnosis',
    border: 'border-neutral-100',
    glyph: icon('M12 2l2.5 5 5.5.8-4 3.9.9 5.5L12 14.5 7.1 17l.9-5.5-4-3.9 5.5-.8z'),
  },
  alternative: {
    label: 'Alt diagnosis',
    border: 'border-neutral-700 border-dashed',
    glyph: icon('M12 2l2.5 5 5.5.8-4 3.9.9 5.5L12 14.5 7.1 17l.9-5.5-4-3.9 5.5-.8z'),
  },
  cause: {
    label: 'Root cause',
    border: 'border-neutral-700',
    glyph: icon('M12 3v6 M5.6 5.6l4.2 4.2 M18.4 5.6l-4.2 4.2 M3 14a9 9 0 0018 0'),
  },
  fix: {
    label: 'Fix',
    border: 'border-neutral-400',
    glyph: icon('M14.7 6.3a4 4 0 00-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2.4-2.4 2.6-2.6z'),
  },
  empty: {
    label: 'Result',
    border: 'border-neutral-700 border-dashed',
    glyph: icon('M12 8v5 M12 16h.01 M12 3l9 16H3z'),
  },
}

export function PipelineNode({ data, selected }: NodeProps<FlowNode>) {
  const meta = KIND_META[data.kind]
  const hasTarget = data.kind !== 'input'
  const hasSource = data.kind !== 'cause' && data.kind !== 'fix' && data.kind !== 'empty'

  return (
    <div
      className={[
        'w-[230px] rounded-lg border bg-neutral-950/95 backdrop-blur-sm',
        'transition-shadow',
        meta.border,
        selected
          ? 'ring-2 ring-white shadow-[0_0_0_4px_rgba(255,255,255,0.08)]'
          : 'hover:ring-1 hover:ring-neutral-500',
      ].join(' ')}
    >
      {hasTarget && <Handle type="target" position={Position.Left} />}

      <div className="flex items-center gap-2 px-3 pt-2.5">
        <span className="flex items-center justify-center w-6 h-6 rounded-md border border-neutral-700 text-neutral-200 shrink-0">
          {meta.glyph}
        </span>
        <span className="flex-1 text-[10px] font-medium uppercase tracking-wider text-neutral-500 truncate">
          {meta.label}
        </span>
        {data.badge && (
          <span className="px-1.5 py-0.5 rounded border border-neutral-700 bg-neutral-900 text-[9px] font-mono uppercase tracking-wide text-neutral-300 shrink-0">
            {data.badge}
          </span>
        )}
      </div>

      <div className="px-3 pb-3 pt-1.5">
        <p className="text-sm font-semibold text-neutral-100 leading-snug line-clamp-2">
          {data.title}
        </p>
        {data.subtitle && (
          <p className="mt-1 text-xs text-neutral-400 leading-snug line-clamp-2">
            {data.subtitle}
          </p>
        )}
      </div>

      {hasSource && <Handle type="source" position={Position.Right} />}
    </div>
  )
}
