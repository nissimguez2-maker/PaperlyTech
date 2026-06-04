import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

/** Generate unique ID */
export function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/** Format date for display: "13 April 2026" */
export function fmtDate(iso: string | null): string {
  if (!iso) return '-'
  try {
    return format(parseISO(iso), 'd MMMM yyyy', { locale: fr })
  } catch {
    return '-'
  }
}

/** Format month: "April 2026" */
export function fmtMonth(iso: string | null): string {
  if (!iso) return 'Unknown'
  try {
    return format(parseISO(iso + '-01'), 'MMMM yyyy', { locale: fr })
  } catch {
    return 'Unknown'
  }
}

/** Formateur unique ₪ (ILS) — 2 décimales, format français. Source unique écran + PDF. */
const ilsFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'ILS',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Format currency in ILS → "1 234,50 ₪" */
export function fmtCurrency(amount: number): string {
  return ilsFormatter.format(amount)
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
  wire_transfer: 'Virement',
  cash: 'Espèces',
  bit: 'Bit',
} as const

/** Pipeline stage display config — cycle de vie à 5 états (migration 002) */
export const PIPELINE_STAGES = {
  quoted:      { label: 'Devisé',        color: 'bg-navy-bg',   dot: 'bg-navy-dot' },
  accepted:    { label: 'Accepté',       color: 'bg-cream-dark', dot: 'bg-gold-dark' },
  in_progress: { label: 'En production', color: 'bg-navy-bg',   dot: 'bg-navy' },
  delivered:   { label: 'Livré',         color: 'bg-forest-bg', dot: 'bg-forest' },
  paid:        { label: 'Payé',          color: 'bg-forest-bg', dot: 'bg-bark' },
} as const

/** Étiquettes des types de revenu (migration 005) */
export const REVENUE_TYPES = {
  print:    { label: 'Imprimés',         short: 'Impr.' },
  digital:  { label: 'Numériques',       short: 'Num.' },
  original: { label: 'Pièces originales', short: 'Orig.' },
} as const
