import { useEffect, useState, useMemo } from 'react'
import {
  TrendingUp, TrendingDown, Wallet, CheckCircle,
  ChevronDown, ChevronRight,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { fmtCurrency, fmtMonth, cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Payment, Expense, Project } from '@/types/database'

export function FinancePage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      const [payRes, expRes, projRes] = await Promise.all([
        supabase.from('payments').select('*').order('date', { ascending: false }),
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('projects').select('*, client:clients(name), quotes(total)'),
      ])
      setPayments(payRes.data ?? [])
      setExpenses(expRes.data ?? [])
      setProjects(projRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

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

  // Totals
  const totalRevenue = payments.reduce((s, p) => s + p.amount, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const totalProfit = totalRevenue - totalExpenses

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

  return (
    <div>
      <PageHeader title="Finance" subtitle="Revenue, expenses and profitability" />

      {/* KPI row */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-forest-bg p-2.5">
              <TrendingUp size={20} className="text-forest" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Total Revenue</p>
              <p className="font-display text-2xl font-bold text-bark">{fmtCurrency(totalRevenue)}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-coral-bg p-2.5">
              <TrendingDown size={20} className="text-coral" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Total Expenses</p>
              <p className="font-display text-2xl font-bold text-bark">{fmtCurrency(totalExpenses)}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className={`rounded-xl p-2.5 ${totalProfit >= 0 ? 'bg-forest-bg' : 'bg-coral-bg'}`}>
              <Wallet size={20} className={totalProfit >= 0 ? 'text-forest' : 'text-coral'} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Net Profit</p>
              <p className={cn('font-display text-2xl font-bold', totalProfit >= 0 ? 'text-forest' : 'text-coral')}>
                {fmtCurrency(totalProfit)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Monthly breakdown */}
        <div className="col-span-2">
          <Card>
            <CardTitle>Monthly Breakdown</CardTitle>
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
                      {payments.filter(p => p.date.startsWith(m.month)).map(p => (
                        <div key={p.id} className="flex justify-between text-xs">
                          <span className="text-muted">{p.date}</span>
                          <span className="text-forest font-medium">+{fmtCurrency(p.amount)}</span>
                        </div>
                      ))}
                      {expenses.filter(e => e.date.startsWith(m.month)).map(e => (
                        <div key={e.id} className="flex justify-between text-xs">
                          <span className="text-muted">{e.date} — {e.description}</span>
                          <span className="text-coral font-medium">-{fmtCurrency(e.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {monthlyData.length === 0 && (
                <p className="py-8 text-center text-sm text-muted">No financial data yet</p>
              )}
            </div>
          </Card>
        </div>

        {/* Payment methods donut */}
        <div>
          <Card>
            <CardTitle>By Payment Method</CardTitle>
            <div className="mt-4 space-y-3">
              {methodBreakdown.map(([method, amount]) => {
                const pct = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0
                return (
                  <div key={method}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-medium text-bark capitalize">{method.replace('_', ' ')}</span>
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
            </div>
          </Card>

          {/* Sumit tracker */}
          <Card className="mt-6">
            <CardTitle>Sumit Tracker</CardTitle>
            <div className="mt-4 space-y-2">
              {projects.filter(p => !p.sumit_done).slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-cream transition-colors">
                  <span className="text-xs text-bark">{p.name}</span>
                  <button className="rounded-lg bg-forest-bg px-2 py-1 text-[10px] font-medium text-forest hover:bg-forest-dot/30 transition-colors">
                    <CheckCircle size={12} className="inline mr-1" />
                    Mark done
                  </button>
                </div>
              ))}
              {projects.filter(p => !p.sumit_done).length === 0 && (
                <p className="py-4 text-center text-xs text-muted">All projects logged in Sumit</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
