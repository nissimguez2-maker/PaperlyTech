import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'navy'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variants: Record<Variant, string> = {
  primary: 'bg-gold-dark text-white hover:bg-primary-hover shadow-sm',
  secondary: 'bg-cream-dark text-bark border border-sand hover:bg-sand/50',
  danger: 'bg-coral-bg text-coral border border-coral/30 hover:bg-coral/15',
  ghost: 'bg-transparent text-muted hover:bg-cream-dark hover:text-bark',
  success: 'bg-forest-bg text-forest border border-forest-dot/40 hover:bg-forest-dot/20',
  navy: 'bg-navy-bg text-navy border border-navy-dot/40 hover:bg-navy-dot/20',
}

const sizes = {
  sm: 'min-h-9 px-4 py-2 text-xs',
  md: 'min-h-11 px-5 py-2.5 text-sm',
  lg: 'min-h-12 px-6 py-3 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', className, children, loading = false, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium',
        'transition-all duration-150 cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <span
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      )}
      {children}
    </button>
  )
)

Button.displayName = 'Button'
