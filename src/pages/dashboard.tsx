import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, Clock, AlertCircle, DollarSign,
  ArrowRight, Plus, CalendarDays, Circle, Truck,
} from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/card'
import { PipelineBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { useToast } from '@/components/ui/toast'
import { fmtCurrency, fmtDate, cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Project, Payment, Expense, Task } from '@/types/database'

interface DashboardData {
  projects: Project[]
  payments: Payment[]
  expenses: Expense[]
  tasks: Task[]
}

export function DashboardPage() {
  const { toast } = useToast()
  const [data, setData] = useState<DashboardData>({
    projects: [], payments: [], expenses: [], tasks: [],
  })
  const [loading, setLoading] = useState(true)

  // Quick-add task
  const [showQuickTask, setShowQuickTask] = useState(false)
  const [quickTaskTitle, setQuickTaskTitle] = useState('')

  const currentMonth = new Date().toISOString().slice(0, 7)

  useEffect(() => {
    async function load() {
      const [pRes, payRes, expRes, taskRes] = await Promise.all([
        supabase.from('projects').select('*, client:clients(name)').order('created_at', { ascending: false }),
        supabase.from('payments').select('*').gte('date', currentMonth + '-01').order('date', { ascending: false }),
        supabase.from('expenses').select('*').gte('date', currentMonth + '-01').order('date', { ascending: false }),
        supabase.from('tasks').select('*, project:projects(name, client:clients(name))').eq('completed', false).order('due_date', { ascending: true }).limit(10),
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
  }, [currentMonth])

  const toggleTask = useCallback(async (id: string) => {
    setData(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? { ...t, completed: true } : t),
    }))
    const { error } = await supabase.from('tasks').update({ completed: true }).eq('id', id)
    if (error) {
      toast('Failed to update task', 'error')
      setData(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t.id === id ? { ...t, completed: false } : t),
      }))
    }
  }, [toast])

  const addQuickTask = useCallback(async () => {
    if (!quickTaskTitle.trim()) return
    const { data: saved, error } = await supabase.from('tasks').insert({
      title: quickTaskTitle.trim(),
      completed: false,
      priority: 'medium',
    }).select('*').single()
    if (error || !saved) {
      toast('Failed to add task', 'error')
      return
    }
    setData(prev => ({ ...prev, tasks: [saved as Task, ...prev.tasks] }))
    setQuickTaskTitle('')
    setShowQuickTask(false)
    toast('Task added')
  }, [quickTaskTitle, toast])

  const activeProjects = data.projects.filter(p => p.pipeline_stage !== 'delivered')
  const recentPayments = data.payments.slice(0, 5)
  const pendingTasks = data.tasks.filter(t => !t.completed)
  const overdueProjects = activeProjects.filter(p =>
    p.delivery_date && new Date(p.delivery_date) < new Date()
  )

  // Next 3 upcoming deliveries: active projects with a future delivery_date, sorted nearest first
  const nextDeliveries = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return activeProjects
      .filter(p => p.delivery_date && p.delivery_date >= today)
      .sort((a, b) => (a.delivery_date ?? '').localeCompare(b.delivery_date ?? ''))
      .slice(0, 3)
  }, [activeProjects])

  const thisMonthRevenue = data.payments
    .filter(p => p.date.startsWith(currentMonth))
    .reduce((sum, p) => sum + p.amount, 0)

  const thisMonthExpenses = data.expenses
    .filter(e => e.date.startsWith(currentMonth))
    .reduce((sum, e) => sum + e.amount, 0)

  const thisMonthNet = thisMonthRevenue - thisMonthExpenses

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
      <div className="mb-8 grid grid-cols-5 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-forest-bg p-2.5">
              <TrendingUp size={20} className="text-forest" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Revenue (this month)</p>
              <p className="font-display text-2xl font-bold text-bark" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(thisMonthRevenue)}</p>
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
              <p className="font-display text-2xl font-bold text-bark" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtCurrency(thisMonthExpenses)}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className={`rounded-xl p-2.5 ${thisMonthNet >= 0 ? 'bg-forest-bg' : 'bg-coral-bg'}`}>
              <DollarSign size={20} className={thisMonthNet >= 0 ? 'text-forest' : 'text-coral'} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Net (this month)</p>
              <p className={cn('font-display text-2xl font-bold', thisMonthNet >= 0 ? 'text-forest' : 'text-coral')} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {thisMonthNet >= 0 ? '+' : ''}{fmtCurrency(thisMonthNet)}
              </p>
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
        {/* Left column: Active projects + Next deliveries */}
        <div className="col-span-3 space-y-6">
          {/* Next Deliveries */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <CardTitle>Next Deliveries</CardTitle>
              <Link to="/projects" className="flex items-center gap-1 text-xs font-medium text-gold-dark hover:underline">
                View all <ArrowRight size={12} />
              </Link>
            </div>

            {nextDeliveries.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">No upcoming deliveries</p>
            ) : (
              <div className="space-y-3">
                {nextDeliveries.map(p => {
                  const daysLeft = Math.ceil(
                    (new Date(p.delivery_date + 'T00:00:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  )
                  const clientName = (p as unknown as Record<string, unknown>).client
                    ? ((p as unknown as Record<string, unknown>).client as { name: string }).name
                    : '-'
                  return (
                    <Link
                      key={p.id}
                      to={`/projects/${p.id}`}
                      className="flex items-center justify-between rounded-xl border border-sand/40 px-4 py-3 hover:bg-cream transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-gold-dark/10 p-2">
                          <Truck size={16} className="text-gold-dark" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-bark">{p.name}</p>
                          <p className="text-xs text-muted">{clientName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-bark">{fmtDate(p.delivery_date!)}</p>
                          <p className={cn(
                            'text-[10px] font-medium',
                            daysLeft <= 3 ? 'text-coral' : daysLeft <= 7 ? 'text-gold-dark' : 'text-muted',
                          )}>
                            {daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : daysLeft + ' days left'}
                          </p>
                        </div>
                        <PipelineBadge stage={p.pipeline_stage} />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Active projects */}
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
          {/* Pending tasks - INTERACTIVE */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <CardTitle>To Do</CardTitle>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowQuickTask(!showQuickTask)}
                  className="flex items-center gap-1 text-xs font-medium text-gold-dark hover:underline"
                >
                  <Plus size={12} /> Add
                </button>
                <Link to="/projects" className="flex items-center gap-1 text-xs font-medium text-gold-dark hover:underline">
                  View all <ArrowRight size={12} />
                </Link>
              </div>
            </div>

            {showQuickTask && (
              <div className="mb-3 flex gap-2">
                <input
                  value={quickTaskTitle}
                  onChange={e => setQuickTaskTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addQuickTask(); if (e.key === 'Escape') setShowQuickTask(false) }}
                  placeholder="Quick task..."
                  className="flex-1 rounded-lg border border-sand bg-white px-3 py-2 text-sm focus:border-gold-dark focus:outline-none"
                  autoFocus
                />
                <Button variant="primary" size="sm" onClick={addQuickTask}>Add</Button>
              </div>
            )}

            <div className="space-y-1">
              {pendingTasks.slice(0, 7).map(t => {
                const proj = (t as unknown as Record<string, unknown>).project as { name: string; client: { name: string } | null } | undefined
                return (
                  <div
                    key={t.id}
                    className="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-cream transition-colors"
                  >
                    <button
                      onClick={() => toggleTask(t.id)}
                      className="text-sand hover:text-forest transition-colors"
                      aria-label="Mark complete"
                    >
                      <Circle size={18} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-bark truncate">{t.title}</p>
                      <div className="flex items-center gap-2">
                        {t.due_date && (
                          <p className="text-[10px] text-muted">{fmtDate(t.due_date)}</p>
                        )}
                        {proj?.client?.name && (
                          <p className="text-[10px] text-gold-dark">{proj.client.name}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {pendingTasks.length === 0 && (
                <p className="py-4 text-center text-sm text-muted">All caught up!</p>
              )}
            </div>
          </Card>

          {/* Recent payments — with project/client name */}
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
                    {p.note && <p className="text-[10px] text-muted truncate max-w-[160px]">{p.note}</p>}
                  </div>
                  <span className="font-display text-sm font-bold text-forest" style={{ fontVariantNumeric: 'tabular-nums' }}>
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
