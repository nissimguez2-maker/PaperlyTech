import { useEffect, useState, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus, Search, Filter, CalendarDays, ChevronRight, ChevronDown,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { PipelineBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { fmtCurrency, fmtDate, cn, PIPELINE_STAGES } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Project, PipelineStage, Quote, Payment } from '@/types/database'

interface ProjectWithFinance extends Project {
  total: number
  paid: number
  remaining: number
  clientName: string
}

const STAGES = Object.keys(PIPELINE_STAGES) as PipelineStage[]

export function ProjectsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [projects, setProjects] = useState<ProjectWithFinance[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<PipelineStage | 'all'>('all')

  useEffect(() => {
    async function load() {
      const { data: rawProjects } = await supabase
        .from('projects')
        .select('*, client:clients(name), quotes(total), payments(amount)')
        .order('created_at', { ascending: false })

      const enriched: ProjectWithFinance[] = (rawProjects ?? []).map(p => {
        const quotes = (p.quotes as Pick<Quote, 'total'>[] | null) ?? []
        const payments = (p.payments as Pick<Payment, 'amount'>[] | null) ?? []
        const total = quotes.length > 0 ? quotes[0]!.total : 0
        const paid = payments.reduce((s, pay) => s + pay.amount, 0)
        return {
          ...p,
          total,
          paid,
          remaining: Math.max(0, total - paid),
          clientName: (p.client as { name: string } | null)?.name ?? '-',
          quotes: undefined,
          payments: undefined,
        } as ProjectWithFinance
      })

      setProjects(enriched)
      setLoading(false)
    }
    load()
  }, [])

  const changeStage = useCallback(async (projectId: string, newStage: PipelineStage) => {
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

    if (newStage === 'confirmed') {
      // Guard: don't duplicate tasks if they already exist
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
        }
      }
    }

    toast('Stage changed to ' + PIPELINE_STAGES[newStage].label)
  }, [projects, toast])

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
                    <ProjectCard key={p.id} project={p} onChangeStage={changeStage} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <ProjectCard key={p.id} project={p} onChangeStage={changeStage} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project: p, onChangeStage }: {
  project: ProjectWithFinance
  onChangeStage: (id: string, stage: PipelineStage) => void
}) {
  const [showStageMenu, setShowStageMenu] = useState(false)
  const progressPct = p.total > 0 ? Math.min(100, (p.paid / p.total) * 100) : 0

  return (
    <div className="relative flex items-center justify-between rounded-2xl border border-sand/40 bg-white px-5 py-4 hover:border-gold/40 hover:shadow-sm transition-all">
      <Link
        to={'/projects/' + p.id}
        className="flex items-center gap-5 flex-1"
      >
        <div>
          <p className="text-sm font-semibold text-bark">{p.name}</p>
          <p className="text-xs text-muted">{p.clientName}</p>
        </div>
      </Link>

      <div className="flex items-center gap-6">
        {p.delivery_date && (
          <span className="flex items-center gap-1.5 text-xs text-muted">
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

        <Link to={'/projects/' + p.id}>
          <ChevronRight size={16} className="text-sand" />
        </Link>
      </div>
    </div>
  )
}
