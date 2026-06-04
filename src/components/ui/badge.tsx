import { cn, PIPELINE_STAGES } from '@/lib/utils'
import type { PipelineStage } from '@/types/database'

const stageStyles: Record<string, { bg: string; text: string; dot: string }> = {
  quoted:      { bg: 'bg-navy-bg',    text: 'text-navy',      dot: 'bg-navy-dot' },
  accepted:    { bg: 'bg-cream-dark', text: 'text-gold-dark', dot: 'bg-gold-dark' },
  in_progress: { bg: 'bg-navy-bg',    text: 'text-navy',      dot: 'bg-navy' },
  delivered:   { bg: 'bg-forest-bg',  text: 'text-forest',    dot: 'bg-forest' },
  paid:        { bg: 'bg-forest-bg',  text: 'text-forest',    dot: 'bg-bark' },
}

// Repli neutre : tout stage inconnu (donnée héritée, valeur future) reste affichable
// au lieu de faire planter le rendu (cf. audit C4).
const FALLBACK = { bg: 'bg-sand/40', text: 'text-muted', dot: 'bg-muted' }

interface BadgeProps {
  stage: PipelineStage | string
  className?: string
}

export function PipelineBadge({ stage, className }: BadgeProps) {
  const s = stageStyles[stage] ?? FALLBACK
  const label = PIPELINE_STAGES[stage as PipelineStage]?.label ?? stage

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        s.bg, s.text,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
      {label}
    </span>
  )
}
