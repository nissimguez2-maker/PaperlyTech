import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'navy'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
}

const variants: Record<Variant, string> = {
  primary: 'bg-gold-dark text-white hover:bg-gold-dark/90 shadow-sm',
  secondary: 'bg-cream-dark text-bark border border-sand hover:bg-sand/50',
  danger: 'bg-coral-bg text-coral border border-coral/30 hover:bg-coral/10',
  ghost: 'bg-transparent text-muted border border-sand hover:bg-cream-dark',
  success: 'bg-forest-bg text-forest border border-forest-dot/40 hover:bg-forest-dot/20',
  navy: 'bg-navy-bg text-navy border border-navy-dot/40 hover:bg-navy-dot/20',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
        'transition-all duration-150 cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus-visible:ring-2 focus-visible:ring-gold-dark focus-visible:ring-offset-2',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
)

Button.displayName = 'Button'
