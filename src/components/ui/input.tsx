import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold uppercase tracking-wider text-muted"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-xl border border-sand bg-white px-4 py-2.5 text-sm text-bark',
            'placeholder:text-muted/60',
            'focus:border-gold-dark transition-colors duration-150',
            error && 'border-coral focus:border-coral',
            className,
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-coral">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
