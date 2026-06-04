import { useEffect, useState, useMemo } from 'react'
import {
  FileText, Hammer, Wallet, CheckCircle,
  ChevronDown, ChevronRight,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { fmtCurrency, fmtMonth, fmtDate, cn, PAYMENT_METHODS, REVENUE_TYPES } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Payment, Expense, Project, RevenueType } from '@/types/database'

export function FinancePage() {
  const { toast } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [quotes, setQuotes] = useState<{ project_id: string; total: number }[]>([])
  const [revenueByType, setRevenueByType] = useState<Record<RevenueType | 'unset', number>>(
    { print: 0, digital: 0, original: 0, unset: 0 }
  )
  const [loading, setLoading] = useState(true)
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      const [payRes, expRes, projRes, quoteRes, revRes] = await Promise.all([
        supabase.from('payments').select('*').order('date', { ascending: false }),
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('projects').select('*, client:clients(name)'),
        supabase.from('quotes').select('project_id, total').order('version', { ascending: false }),
        // CA par activité : agrégation au niveau ligne (un devis peut mélanger print/digital/original)
        supabase
          .from('quote_items')
          .select('revenue_type, quantity, unit_price, is_offered, quotes!inner(status)')
          .eq('quotes.status', 'accepted'),
      ])
      setPayments(payRes.data ?? [])
      setExpenses(expRes.data ?? [])
      setProjects(projRes.data ?? [])
      setQuotes(quoteRes.data ?? [])

      const rev: Record<RevenueType | 'unset', number> = { print: 0, digital: 0, original: 0, unset: 0 }
      for (const row of (revRes.data ?? []) as Array<{ revenue_type: RevenueType | null; quantity: number; unit_price: number; is_offered: boolean }>) {
        if (row.is_offered) continue
        const key: RevenueType | 'unset' = row.revenue_type ?? 'unset'
        rev[key] += row.quantity * row.unit_price
      }
      setRevenueByType(rev)
      setLoading(false)
    }
    load()
  }, [])

  // Get quote total for a project (latest quote)
  const getQuoteTotal = (projectId: string): number => {
    const q = quotes.find(q => q.project_id === projectId)
    return q?.total ?? 0
  }

  // KPI 1: Quoted — total value of projects in "quoted" stage
  const totalQuoted = useMemo(() => {
    return projects
      .filter(p => p.pipeline_stage === 'quoted')
      .reduce((sum, p) => sum + getQuoteTotal(p.id), 0)
  }, [projects, quotes])

  // KPI 2: In the Works — total value of projects in "in_progress" stage
  const totalInProgress = useMemo(() => {
    return projects
      .filter(p => p.pipeline_stage === 'in_progress')
      .reduce((sum, p) => sum + getQuoteTotal(p.id), 0)
  }, [projects, quotes])

  // KPI 3: In My Pocket — total payments received (all time)
  const totalCollected = payments.reduce((s, p) => s + p.amount, 0)
  const totalExpensesAmt = expenses.reduce((s, e) => s + e.amount, 0)

  // Monthly aggregation
  const monthlyData = useMemo(() => {
    const months = new Map<string, { revenue: number; expenses: number }>()

    payments.forEach(p => {
      const m = p.date.slice(0, 7)
      const existing = months.get(m) ?? { revenue: 0, expenses: 0 }
      existing.revenue += p.amount
      months.set(m, existing)
    })

    expenses.forEach(e => {
      const m = e.date.slice(0, 7)
      const existing = months.get(m) ?? { revenue: 0, expenses: 0 }
      existing.expenses += e.amount
      months.set(m, existing)
    })

    return [...months.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, data]) => ({
        month,
        ...data,
        profit: data.revenue - data.expenses,
      }))
  }, [payments, expenses])

  // Payment method breakdown
  const methodBreakdown = useMemo(() => {
    const methods = new Map<string, number>()
    payments.forEach(p => {
      methods.set(p.method, (methods.get(p.method) ?? 0) + p.amount)
    })
    return [...methods.entries()].sort((a, b) => b[1] - a[1])
  }, [payments])

  const toggleMonth = (m: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev)
      if (next.has(m)) next.delete(m)
      else next.add(m)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-dark border-t-transparent" />
      </div>
    )
  }

  const quotedCount = projects.filter(p => p.pipeline_stage === 'quoted').length
  const inProgressCount = projects.filter(p => p.pipeline_stage === 'in_progress').length
  const netProfit = totalCollected - totalExpensesAmt

  return (
    <div>
      <PageHeader title="Finances" subtitle="Où se trouve votre argent" />

      {/* Pipeline Money KPIs */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-navy-bg p-2.5">
              <FileText size={20} className="text-navy" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Devisé</p>
              <p className="font-display text-2xl font-bold text-bark" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(totalQuoted)}</p>
              <p className="text-[10px] text-muted">{quotedCount} projet{quotedCount !== 1 ? 's' : ''} en attente de réponse</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-navy-bg p-2.5">
              <Hammer size={20} className="text-navy" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">En production</p>
              <p className="font-display text-2xl font-bold text-bark" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(totalInProgress)}</p>
              <p className="text-[10px] text-muted">{inProgressCount} projet{inProgressCount !== 1 ? 's' : ''} en cours de production</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-forest-bg p-2.5">
              <Wallet size={20} className="text-forest" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Dans ma poche</p>
              <p className="font-display text-2xl font-bold text-forest" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(totalCollected)}</p>
              <p className="text-[10px] text-muted">
                {totalExpensesAmt > 0 ? (
                  <>après dépenses : <span className={netProfit >= 0 ? 'text-forest' : 'text-coral'}>{fmtCurrency(netProfit)}</span></>
                ) : (
                  'total des paiements encaissés'
                )}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Monthly breakdown */}
        <div className="col-span-2">
          <Card>
            <CardTitle>Détail mensuel</CardTitle>
            <div className="mt-4 space-y-1">
              {monthlyData.map(m => (
                <div key={m.month}>
                  <button
                    onClick={() => toggleMonth(m.month)}
                    className="flex w-full items-center justify-between rounded-xl px-4 py-3 hover:bg-cream transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {expandedMonths.has(m.month)
                        ? <ChevronDown size={16} className="text-muted" />
                        : <ChevronRight size={16} className="text-muted" />
                      }
                      <span className="text-sm font-semibold text-bark">{fmtMonth(m.month)}</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <span className="text-forest font-medium">{fmtCurrency(m.revenue)}</span>
                      <span className="text-coral font-medium">-{fmtCurrency(m.expenses)}</span>
                      <span className={cn('font-bold', m.profit >= 0 ? 'text-bark' : 'text-coral')}>
                        {fmtCurrency(m.profit)}
                      </span>
                    </div>
                  </button>

                  {expandedMonths.has(m.month) && (
                    <div className="ml-10 mb-2 space-y-1 rounded-xl bg-cream p-3">
                      {payments.filter(p => p.date.startsWith(m.month)).map(p => {
                        const proj = projects.find(pr => pr.id === p.project_id)
                        const clientName = (proj?.client as { name: string } | null)?.name
                        return (
                          <div key={p.id} className="flex justify-between text-xs">
                            <span className="text-muted">{fmtDate(p.date)}{clientName ? ' - ' + clientName : ''}{p.note ? ' (' + p.note + ')' : ''}</span>
                            <span className="text-forest font-medium">+{fmtCurrency(p.amount)}</span>
                          </div>
                        )
                      })}
                      {expenses.filter(e => e.date.startsWith(m.month)).map(e => (
                        <div key={e.id} className="flex justify-between text-xs">
                          <span className="text-muted">{fmtDate(e.date)} - {e.description}</span>
                          <span className="text-coral font-medium">-{fmtCurrency(e.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {monthlyData.length === 0 && (
                <p className="py-8 text-center text-sm text-muted">Aucune donnée financière pour le moment</p>
              )}
            </div>
          </Card>
        </div>

        {/* Payment methods + Sumit */}
        <div>
          <Card>
            <CardTitle>Par méthode de paiement</CardTitle>
            <div className="mt-4 space-y-3">
              {methodBreakdown.map(([method, amount]) => {
                const pct = totalCollected > 0 ? (amount / totalCollected) * 100 : 0
                return (
                  <div key={method}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-medium text-bark capitalize">{PAYMENT_METHODS[method as keyof typeof PAYMENT_METHODS] ?? method.replace(/_/g, ' ')}</span>
                      <span className="text-muted">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-cream-dark">
                      <div
                        className="h-full rounded-full bg-gold-dark transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-right text-xs text-muted">{fmtCurrency(amount)}</p>
                  </div>
                )
              })}

              {methodBreakdown.length === 0 && (
                <p className="py-4 text-center text-xs text-muted">Aucun paiement pour le moment</p>
              )}
            </div>
          </Card>

          {/* CA par activité (lignes de devis acceptés, mixte print/digital/original) */}
          <Card className="mt-6">
            <CardTitle>CA par activité</CardTitle>
            {(() => {
              const totalRev = revenueByType.print + revenueByType.digital + revenueByType.original + revenueByType.unset
              if (totalRev === 0) {
                return <p className="mt-4 py-4 text-center text-xs text-muted">Aucun devis accepté pour le moment</p>
              }
              const rows: Array<{ key: RevenueType | 'unset'; label: string; amount: number }> = [
                { key: 'print',    label: REVENUE_TYPES.print.label,    amount: revenueByType.print },
                { key: 'digital',  label: REVENUE_TYPES.digital.label,  amount: revenueByType.digital },
                { key: 'original', label: REVENUE_TYPES.original.label, amount: revenueByType.original },
              ]
              if (revenueByType.unset > 0) rows.push({ key: 'unset', label: 'Non classé', amount: revenueByType.unset })
              return (
                <div className="mt-4 space-y-3">
                  {rows.map(({ key, label, amount }) => {
                    const pct = totalRev > 0 ? (amount / totalRev) * 100 : 0
                    return (
                      <div key={key}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="font-medium text-bark">{label}</span>
                          <span className="text-muted">{pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-cream-dark">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              key === 'print'    && 'bg-navy',
                              key === 'digital'  && 'bg-gold-dark',
                              key === 'original' && 'bg-forest',
                              key === 'unset'    && 'bg-sand',
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="mt-0.5 text-right text-xs text-muted">{fmtCurrency(amount)}</p>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </Card>

          {/* Sumit tracker */}
          <Card className="mt-6">
            <CardTitle>Suivi Sumit</CardTitle>
            <div className="mt-4 space-y-2">
              {projects.filter(p => !p.sumit_done).slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-cream transition-colors">
                  <span className="text-xs text-bark">{p.name}</span>
                  <button
                    onClick={async () => {
                      const { error } = await supabase.from('projects').update({ sumit_done: true }).eq('id', p.id)
                      if (error) { toast('Échec : ' + error.message, 'error'); return }
                      setProjects(prev => prev.map(x => x.id === p.id ? { ...x, sumit_done: true } : x))
                      toast('Marqué comme fait dans Sumit')
                    }}
                    className="rounded-lg bg-forest-bg px-2 py-1 text-[10px] font-medium text-forest hover:bg-forest-dot/30 transition-colors"
                  >
                    <CheckCircle size={12} className="inline mr-1" />
                    Marquer fait
                  </button>
                </div>
              ))}
              {projects.filter(p => !p.sumit_done).length === 0 && (
                <p className="py-4 text-center text-xs text-muted">Tous les projets sont enregistrés dans Sumit</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
