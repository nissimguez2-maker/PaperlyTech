import { cn } from '@/lib/utils'
import type { PipelineStage } from '@/types/database'

const stageStyles: Record<PipelineStage, { bg: string; text: string; dot: string }> = {
  quoted: { bg: 'bg-navy-bg', text: 'text-navy', dot: 'bg-navy-dot' },
  confirmed: { bg: 'bg-navy-bg', text: 'text-navy', dot: 'bg-navy' },
  in_progress: { bg: 'bg-navy-bg', text: 'text-navy', dot: 'bg-navy-dot' },
  delivered: { bg: 'bg-forest-bg', text: 'text-forest', dot: 'bg-forest-dot' },
  paid: { bg: 'bg-forest-bg', text: 'text-forest', dot: 'bg-forest' },
}

const stageLabels: Record<PipelineStage, string> = {
  quoted: 'Quoted',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  delivered: 'Delivered',
  paid: 'Paid',
}

interface BadgeProps {
  stage: PipelineStage
  className?: string
}

export function PipelineBadge({ stage, className }: BadgeProps) {
  const s = stageStyles[stage]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        s.bg, s.text,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
      {stageLabels[stage]}
    </span>
  )
}
