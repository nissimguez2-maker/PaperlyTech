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
            className="text-[11px] font-semibold uppercase tracking-wider text-muted"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm text-bark',
            'placeholder:text-sand',
            'focus:border-gold-dark focus:ring-1 focus:ring-gold-dark focus:outline-none',
            'transition-colors duration-150',
            error && 'border-coral focus:border-coral focus:ring-coral',
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
