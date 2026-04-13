import { useEffect, useState, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus, Search, Filter, CalendarDays, ChevronRight, ChevronDown,
  Trash2, CheckCircle, Circle,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { PipelineBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { fmtCurrency, fmtDate, cn, PIPELINE_STAGES } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Project, PipelineStage, Quote, Payment, Task } from '@/types/database'

interface ProjectWithFinance extends Project {
  total: number
  paid: number
  remaining: number
  clientName: string
  tasks: Task[]
}

const STAGES = Object.keys(PIPELINE_STAGES) as PipelineStage[]

export function ProjectsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [projects, setProjects] = useState<ProjectWithFinance[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<PipelineStage | 'all'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadProjects = useCallback(async () => {
    const [projRes, taskRes] = await Promise.all([
      supabase
        .from('projects')
        .select('*, client:clients(name), quotes(total), payments(amount)')
        .order('created_at', { ascending: false }),
      supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: true }),
    ])

    const allTasks = (taskRes.data ?? []) as Task[]

    const enriched: ProjectWithFinance[] = ((projRes.data ?? []) as Record<string, unknown>[]).map(p => {
      const quotes = (p.quotes as Pick<Quote, 'total'>[] | null) ?? []
      const payments = (p.payments as Pick<Payment, 'amount'>[] | null) ?? []
      const total = quotes.length > 0 ? (quotes[0] as Pick<Quote, 'total'>).total : 0
      const paid = payments.reduce((s: number, pay: Pick<Payment, 'amount'>) => s + pay.amount, 0)
      const projectTasks = allTasks.filter(t => t.project_id === (p as { id: string }).id)
      return {
        ...(p as unknown as Project),
        total,
        paid,
        remaining: Math.max(0, total - paid),
        clientName: (p.client as { name: string } | null)?.name ?? '-',
        tasks: projectTasks,
        quotes: undefined,
        payments: undefined,
      } as unknown as ProjectWithFinance
    })

    setProjects(enriched)
    setLoading(false)
  }, [])

  useEffect(() => { loadProjects() }, [loadProjects])

  const changeStage = useCallback(async (projectId: string, newStage: PipelineStage) => {
    // Delivery gate: block moving to Delivered if balance > 0
    if (newStage === 'delivered') {
      const proj = projects.find(p => p.id === projectId)
      if (proj && proj.remaining > 0) {
        toast('Cannot mark as Delivered — ' + fmtCurrency(proj.remaining) + ' still owed', 'error')
        return
      }
    }

    const previousStage = projects.find(p => p.id === projectId)?.pipeline_stage
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, pipeline_stage: newStage } : p
    ))
    const { error } = await supabase.from('projects').update({ pipeline_stage: newStage }).eq('id', projectId)
    if (error) {
      toast('Failed to update stage: ' + error.message, 'error')
      if (previousStage) {
        setProjects(prev => prev.map(p =>
          p.id === projectId ? { ...p, pipeline_stage: previousStage } : p
        ))
      }
      return
    }

    if (newStage === 'in_progress') {
      const { count } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)

      if (!count || count === 0) {
        const { data: qItems } = await supabase
          .from('quote_items')
          .select('name, quantity, quotes!inner(project_id)')
          .eq('quotes.project_id', projectId)

        if (qItems && qItems.length > 0) {
          const taskInserts = qItems.map((qi: Record<string, unknown>) => ({
            project_id: projectId,
            title: String(qi.name) + ' x' + String(qi.quantity),
            completed: false,
            priority: 'medium' as const,
          }))
          await supabase.from('tasks').insert(taskInserts)
          toast(taskInserts.length + ' tasks created')
          await loadProjects()
        }
      }
    }

    toast('Stage changed to ' + PIPELINE_STAGES[newStage].label)
  }, [projects, toast, loadProjects])

  const deleteProject = useCallback(async (projectId: string) => {
    // Cascade delete: quote_items -> quotes -> tasks -> payments -> project
    const { data: quotes } = await supabase.from('quotes').select('id').eq('project_id', projectId)
    const quoteIds = (quotes ?? []).map(q => q.id)
    if (quoteIds.length > 0) {
      await supabase.from('quote_items').delete().in('quote_id', quoteIds)
      await supabase.from('quotes').delete().in('id', quoteIds)
    }
    await supabase.from('tasks').delete().eq('project_id', projectId)
    await supabase.from('payments').delete().eq('project_id', projectId)
    const { error } = await supabase.from('projects').delete().eq('id', projectId)

    if (error) {
      toast('Failed to delete project: ' + error.message, 'error')
      return
    }
    setProjects(prev => prev.filter(p => p.id !== projectId))
    setDeletingId(null)
    toast('Project deleted')
  }, [toast])

  const toggleTask = useCallback(async (taskId: string) => {
    let newCompleted = false
    setProjects(prev => prev.map(p => ({
      ...p,
      tasks: p.tasks.map(t => {
        if (t.id === taskId) { newCompleted = !t.completed; return { ...t, completed: newCompleted } }
        return t
      }),
    })))
    const { error } = await supabase.from('tasks').update({ completed: newCompleted }).eq('id', taskId)
    if (error) toast('Failed to update task', 'error')
  }, [toast])

  const deleteTask = useCallback(async (taskId: string) => {
    setProjects(prev => prev.map(p => ({
      ...p,
      tasks: p.tasks.filter(t => t.id !== taskId),
    })))
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (error) toast('Failed to delete task', 'error')
    else toast('Task deleted')
  }, [toast])

  const filtered = useMemo(() => {
    let result = projects
    if (stageFilter !== 'all') {
      result = result.filter(p => p.pipeline_stage === stageFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q)
      )
    }
    return result
  }, [projects, stageFilter, search])

  const groupedByStage = useMemo(() => {
    if (stageFilter !== 'all') return null
    const groups = {} as Record<PipelineStage, ProjectWithFinance[]>
    STAGES.forEach(s => { groups[s] = [] })
    filtered.forEach(p => groups[p.pipeline_stage]?.push(p))
    return groups
  }, [filtered, stageFilter])

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
        title="Projects"
        subtitle={projects.length + ' projects total'}
        actions={
          <Link to="/quotes">
            <Button variant="primary"><Plus size={16} /> New Quote</Button>
          </Link>
        }
      />

      <div className="mb-6 flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects or clients..."
            className="w-full rounded-xl border border-sand bg-white py-2.5 pl-10 pr-4 text-sm focus:border-gold-dark focus:outline-none"
          />
        </div>
        <div className="flex rounded-xl border border-sand overflow-hidden">
          <button
            onClick={() => setStageFilter('all')}
            className={cn(
              'px-3 py-2 text-xs font-medium transition-colors',
              stageFilter === 'all' ? 'bg-gold-dark text-white' : 'text-muted hover:bg-cream',
            )}
          >
            All
          </button>
          {STAGES.map(stage => (
            <button
              key={stage}
              onClick={() => setStageFilter(stage)}
              className={cn(
                'px-3 py-2 text-xs font-medium transition-colors',
                stageFilter === stage ? 'bg-gold-dark text-white' : 'text-muted hover:bg-cream',
              )}
            >
              {PIPELINE_STAGES[stage].label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Filter}
          title="No projects found"
          description={search ? 'Try a different search term' : 'Create your first quote to get started'}
          action={!search ? { label: 'New Quote', onClick: () => navigate('/quotes') } : undefined}
        />
      ) : groupedByStage ? (
        <div className="space-y-8">
          {STAGES.map(stage => {
            const stageProjects = groupedByStage[stage]
            if (stageProjects.length === 0) return null

            return (
              <div key={stage}>
                <div className="mb-3 flex items-center gap-2">
                  <span className={cn('h-2 w-2 rounded-full', PIPELINE_STAGES[stage].dot)} />
                  <h3 className="text-sm font-semibold text-bark">
                    {PIPELINE_STAGES[stage].label}
                  </h3>
                  <span className="text-xs text-muted">({stageProjects.length})</span>
                </div>

                <div className="space-y-2">
                  {stageProjects.map(p => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      onChangeStage={changeStage}
                      onDelete={deleteProject}
                      deletingId={deletingId}
                      setDeletingId={setDeletingId}
                      onToggleTask={toggleTask}
                      onDeleteTask={deleteTask}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              onChangeStage={changeStage}
              onDelete={deleteProject}
              deletingId={deletingId}
              setDeletingId={setDeletingId}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deletingId && (
        <>
          <div className="fixed inset-0 z-40 bg-bark/30 backdrop-blur-sm" onClick={() => setDeletingId(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl border border-sand bg-white p-6 shadow-xl">
              <h3 className="mb-2 text-lg font-semibold text-bark">Delete Project</h3>
              <p className="mb-1 text-sm text-muted">
                This will permanently delete this project and all associated data:
              </p>
              <p className="mb-4 text-xs text-muted">quotes, line items, tasks, and payments.</p>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setDeletingId(null)}>Cancel</Button>
                <Button variant="danger" size="sm" onClick={() => deleteProject(deletingId)}>
                  <Trash2 size={14} /> Delete
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ProjectCard({ project: p, onChangeStage, onDelete: _onDelete, deletingId: _deletingId, setDeletingId, onToggleTask, onDeleteTask }: {
  project: ProjectWithFinance
  onChangeStage: (id: string, stage: PipelineStage) => void
  onDelete: (id: string) => void
  deletingId: string | null
  setDeletingId: (id: string | null) => void
  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => void
}) {
  const [showStageMenu, setShowStageMenu] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const progressPct = p.total > 0 ? Math.min(100, (p.paid / p.total) * 100) : 0

  const pendingTasks = p.tasks.filter(t => !t.completed)
  const completedTasks = p.tasks.filter(t => t.completed)

  return (
    <div className="rounded-2xl border border-sand/40 bg-white hover:border-gold/40 hover:shadow-sm transition-all">
      {/* Main row */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {p.tasks.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-sand hover:text-bark transition-colors shrink-0"
            >
              <ChevronRight size={16} className={cn('transition-transform', expanded && 'rotate-90')} />
            </button>
          )}
          <Link to={'/projects/' + p.id} className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-bark truncate">{p.name}</p>
            <p className="text-xs text-muted">{p.clientName}</p>
          </Link>
        </div>

        <div className="flex items-center gap-6">
          {p.tasks.length > 0 && (
            <span className="text-[10px] text-muted whitespace-nowrap">
              {completedTasks.length}/{p.tasks.length} done
            </span>
          )}

          {p.delivery_date && (
            <span className="flex items-center gap-1.5 text-xs text-muted whitespace-nowrap">
              <CalendarDays size={13} />
              {fmtDate(p.delivery_date)}
            </span>
          )}

          <div className="w-28">
            <div className="mb-1 flex justify-between text-[10px]">
              <span className="text-muted">{fmtCurrency(p.paid)}</span>
              <span className="font-semibold text-bark">{fmtCurrency(p.total)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-cream-dark">
              <div
                className="h-full rounded-full bg-forest transition-all duration-500"
                style={{ width: progressPct + '%' }}
              />
            </div>
          </div>

          <div className="relative">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowStageMenu(!showStageMenu) }}
              className="flex items-center gap-1"
            >
              <PipelineBadge stage={p.pipeline_stage} />
              <ChevronDown size={12} className="text-muted" />
            </button>

            {showStageMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowStageMenu(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-xl border border-sand bg-white py-1 shadow-lg">
                  {STAGES.map(stage => (
                    <button
                      key={stage}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onChangeStage(p.id, stage)
                        setShowStageMenu(false)
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors',
                        p.pipeline_stage === stage ? 'bg-cream font-semibold text-bark' : 'text-muted hover:bg-cream hover:text-bark',
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', PIPELINE_STAGES[stage].dot)} />
                      {PIPELINE_STAGES[stage].label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingId(p.id) }}
            className="text-sand hover:text-coral transition-colors"
            aria-label="Delete project"
          >
            <Trash2 size={15} />
          </button>

          <Link to={'/projects/' + p.id}>
            <ChevronRight size={16} className="text-sand" />
          </Link>
        </div>
      </div>

      {/* Expanded tasks section */}
      {expanded && p.tasks.length > 0 && (
        <div className="border-t border-sand/30 px-5 py-3">
          <div className="space-y-1">
            {pendingTasks.map(t => (
              <div key={t.id} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-cream transition-colors">
                <button
                  onClick={() => onToggleTask(t.id)}
                  className="text-sand hover:text-forest transition-colors shrink-0"
                >
                  <Circle size={16} />
                </button>
                <span className="text-sm text-bark flex-1 truncate">{t.title}</span>
                {t.due_date && (
                  <span className="text-[10px] text-muted whitespace-nowrap">{fmtDate(t.due_date)}</span>
                )}
                <button
                  onClick={() => onDeleteTask(t.id)}
                  className="text-sand hover:text-coral transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {completedTasks.map(t => (
              <div key={t.id} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-cream transition-colors">
                <button
                  onClick={() => onToggleTask(t.id)}
                  className="text-forest shrink-0"
                >
                  <CheckCircle size={16} />
                </button>
                <span className="text-sm text-muted line-through flex-1 truncate">{t.title}</span>
                <button
                  onClick={() => onDeleteTask(t.id)}
                  className="text-sand hover:text-coral transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
