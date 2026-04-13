import { useEffect, useRef, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: ReactNode
  width?: 'sm' | 'md' | 'lg' | 'xl'
}

const widths = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

export function Modal({ open, onClose, title, subtitle, children, width = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Trap focus and handle Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-bark/30 backdrop-blur-sm" />

          {/* Panel */}
          <motion.div
            className={cn(
              'relative w-full rounded-2xl bg-white shadow-xl',
              'max-h-[90vh] overflow-y-auto',
              'p-7',
              widths[width],
            )}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            {(title || subtitle) && (
              <div className="mb-5 flex items-start justify-between">
                <div>
                  {title && (
                    <h2 className="font-display text-2xl font-bold text-bark">{title}</h2>
                  )}
                  {subtitle && (
                    <p className="mt-1 text-sm text-muted">{subtitle}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-muted hover:bg-cream-dark hover:text-bark transition-colors"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
