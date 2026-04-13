import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from './button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  children?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-2xl bg-cream-dark p-4">
        <Icon size={32} className="text-gold-dark" />
      </div>
      <h3 className="mb-1 font-display text-xl font-bold text-bark">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-muted">{description}</p>
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
      {children}
    </div>
  )
}
