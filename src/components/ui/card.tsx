import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
}

export function Card({ children, className, onClick, hover = false }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl border border-sand/60 bg-white p-5',
        'shadow-sm',
        hover && 'cursor-pointer hover:border-gold/60 hover:shadow-md transition-all duration-200',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-4 flex items-center justify-between', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={cn('font-display text-xl font-bold text-bark', className)}>
      {children}
    </h3>
  )
}
