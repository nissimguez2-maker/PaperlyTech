import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-8 flex items-end justify-between">
      <div>
        <h1 className="font-display text-3xl font-bold text-bark">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex gap-3">{actions}</div>}
    </div>
  )
}
