import { format, parseISO } from 'date-fns'

/** Generate unique ID */
export function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/** Format date for display: "13 April 2026" */
export function fmtDate(iso: string | null): string {
  if (!iso) return '-'
  try {
    return format(parseISO(iso), 'd MMMM yyyy')
  } catch {
    return '-'
  }
}

/** Format month: "April 2026" */
export function fmtMonth(iso: string | null): string {
  if (!iso) return 'Unknown'
  try {
    return format(parseISO(iso + '-01'), 'MMMM yyyy')
  } catch {
    return 'Unknown'
  }
}

/** Format currency in ILS */
export function fmtCurrency(amount: number): string {
  return `NIS ${amount.toLocaleString('en-IL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

/** Safe parseFloat with fallback */
export function safeFloat(val: string | number | null | undefined, fallback = 0): number {
  if (val === null || val === undefined || val === '') return fallback
  const n = typeof val === 'number' ? val : parseFloat(val)
  return isNaN(n) ? fallback : n
}

/** Clamp a number between min and max */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max)
}

/** cn: merge class names (simple implementation) */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

/** Payment method display labels */
export const PAYMENT_METHODS = {
  wire_transfer: 'Wire Transfer',
  cash: 'Cash',
  bit: 'Bit',
} as const

/** Pipeline stage display config */
export const PIPELINE_STAGES = {
  quoted: { label: 'Quoted', color: 'bg-navy-bg', dot: 'bg-navy-dot' },
  confirmed: { label: 'Confirmed', color: 'bg-navy-bg', dot: 'bg-navy' },
  in_progress: { label: 'In Progress', color: 'bg-navy-bg', dot: 'bg-navy-dot' },
  delivered: { label: 'Delivered', color: 'bg-forest-bg', dot: 'bg-forest-dot' },
  paid: { label: 'Paid', color: 'bg-forest-bg', dot: 'bg-forest' },
} as const
