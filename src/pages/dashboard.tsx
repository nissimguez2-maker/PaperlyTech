import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, Clock, AlertCircle,
  ArrowRight, Plus, CalendarDays,
} from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/card'
import { PipelineBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { fmtCurrency, fmtDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Project, Payment, Expense, Task } from '@/types/database'

interface DashboardData {
  projects: Project[]
  payments: Payment[]
  expenses: Expense[]
  tasks: Task[]
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    projects: [], payments: [], expenses: [], tasks: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [pRes, payRes, expRes, taskRes] = await Promise.all([
        supabase.from('projects').select('*, client:clients(name)').order('created_at', { ascending: false }),
        supabase.from('payments').select('*').order('date', { ascending: false }).limit(10),
        supabase.from('expenses').select('*').order('date', { ascending: false }).limit(10),
        supabase.from('tasks').select('*').eq('completed', false).order('due_date', { ascending: true }).limit(10),
      ])
      setData({
        projects: pRes.data ?? [],
        payments: payRes.data ?? [],
        expenses: expRes.data ?? [],
        tasks: taskRes.data ?? [],
      })
      setLoading(false)
    }
    load()
  }, [])

  const activeProjects = data.projects.filter(p => !['paid', 'lead'].includes(p.pipeline_stage))
  const recentPayments = data.payments.slice(0, 5)
  const pendingTasks = data.tasks.filter(t => !t.completed)
  const overdueProjects = activeProjects.filter(p =>
    p.delivery_date && new Date(p.delivery_date) < new Date()
  )

  const thisMonthRevenue = data.payments
    .filter(p => p.date.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((sum, p) => sum + p.amount, 0)

  const thisMonthExpenses = data.expenses
    .filter(e => e.date.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((sum, e) => sum + e.amount, 0)

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-dark border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your studio"
        actions={
          <Link to="/quotes">
            <Button variant="primary">
              <Plus size={16} />
              New Quote
            </Button>
          </Link>
        }
      />

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-forest-bg p-2.5">
              <TrendingUp size={20} className="text-forest" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Revenue (this month)</p>
              <p className="font-display text-2xl font-bold text-bark">{fmtCurrency(thisMonthRevenue)}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-coral-bg p-2.5">
              <TrendingDown size={20} className="text-coral" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Expenses (this month)</p>
              <p className="font-display text-2xl font-bold text-bark">{fmtCurrency(thisMonthExpenses)}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-navy-bg p-2.5">
              <Clock size={20} className="text-navy" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Active Projects</p>
              <p className="font-display text-2xl font-bold text-bark">{activeProjects.length}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className={`rounded-xl p-2.5 ${overdueProjects.length > 0 ? 'bg-coral-bg' : 'bg-forest-bg'}`}>
              <AlertCircle size={20} className={overdueProjects.length > 0 ? 'text-coral' : 'text-forest'} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Overdue</p>
              <p className="font-display text-2xl font-bold text-bark">{overdueProjects.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-5 gap-6">
        {/* Active projects */}
        <div className="col-span-3">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <CardTitle>Active Projects</CardTitle>
              <Link to="/projects" className="flex items-center gap-1 text-xs font-medium text-gold-dark hover:underline">
                View all <ArrowRight size={12} />
              </Link>
            </div>

            <div className="space-y-3">
              {activeProjects.slice(0, 6).map(p => (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  className="flex items-center justify-between rounded-xl border border-sand/40 px-4 py-3 hover:bg-cream transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm font-medium text-bark">{p.name}</p>
                      <p className="text-xs text-muted">{(p as unknown as Record<string, unknown>).client ? ((p as unknown as Record<string, unknown>).client as { name: string }).name : '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {p.delivery_date && (
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <CalendarDays size={12} />
                        {fmtDate(p.delivery_date)}
                      </span>
                    )}
                    <PipelineBadge stage={p.pipeline_stage} />
                  </div>
                </Link>
              ))}

              {activeProjects.length === 0 && (
                <p className="py-8 text-center text-sm text-muted">No active projects</p>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar: Tasks + Recent payments */}
        <div className="col-span-2 space-y-6">
          {/* Pending tasks */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <CardTitle>To Do</CardTitle>
              <Link to="/tasks" className="flex items-center gap-1 text-xs font-medium text-gold-dark hover:underline">
                View all <ArrowRight size={12} />
              </Link>
            </div>

            <div className="space-y-2">
              {pendingTasks.slice(0, 5).map(t => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-cream transition-colors"
                >
                  <div className="h-4 w-4 rounded border border-sand" />
                  <div className="flex-1">
                    <p className="text-sm text-bark">{t.title}</p>
                    {t.due_date && (
                      <p className="text-[10px] text-muted">{fmtDate(t.due_date)}</p>
                    )}
                  </div>
                </div>
              ))}

              {pendingTasks.length === 0 && (
                <p className="py-4 text-center text-sm text-muted">All caught up!</p>
              )}
            </div>
          </Card>

          {/* Recent payments */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <CardTitle>Recent Payments</CardTitle>
              <Link to="/finance" className="flex items-center gap-1 text-xs font-medium text-gold-dark hover:underline">
                View all <ArrowRight size={12} />
              </Link>
            </div>

            <div className="space-y-2">
              {recentPayments.map(p => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2"
                >
                  <div>
                    <p className="text-xs text-muted">{fmtDate(p.date)}</p>
                  </div>
                  <span className="font-display text-sm font-bold text-forest">
                    +{fmtCurrency(p.amount)}
                  </span>
                </div>
              ))}

              {recentPayments.length === 0 && (
                <p className="py-4 text-center text-sm text-muted">No payments yet</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
