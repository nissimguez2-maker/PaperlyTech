import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, Search, Filter, CalendarDays, ChevronRight, ChevronDown,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { PipelineBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { fmtCurrency, fmtDate, cn, PIPELINE_STAGES } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Project, PipelineStage } from '@/types/database'

interface ProjectWithFinance extends Project {
  total: number
  paid: number
  remaining: number
  clientName: string
}

const STAGES = Object.keys(PIPELINE_STAGES) as PipelineStage[]

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithFinance[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<PipelineStage | 'all'>('all')

  const load = async () => {
    const { data } = await supabase
      .from('projects')
      .select('*, client:clients(name), quotes(total), payments(amount)')
      .order('created_at', { ascending: false })

    const mapped = (data ?? []).map((p: Record<string, unknown>) => {
      const quotes = (p.quotes ?? []) as { total: number }[]
      const payments = (p.payments ?? []) as { amount: number }[]
      const total = quotes.reduce((s, q) => Math.max(s, q.total), 0)
      const paid = payments.reduce((s, pay) => s + pay.amount, 0)
      return {
        ...p,
        total,
        paid,
        remaining: Math.max(0, total - paid),
        clientName: (p.client as { name: string } | null)?.name ?? '-',
        quotes: undefined,
        payments: undefined,
      } as unknown as ProjectWithFinance
    })

    setProjects(mapped)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const updateStage = async (projectId: string, stage: PipelineStage) => {
    await supabase.from('projects').update({ pipeline_stage: stage }).eq('id', projectId)

    // Auto-create tasks when moving to confirmed
    if (stage === 'confirmed') {
      const proj = projects.find(p => p.id === projectId)
      if (proj) {
        // Get quote items for this project
        const { data: quotes } = await supabase
          .from('quotes')
          .select('id')
          .eq('project_id', projectId)
          .limit(1)

        if (quotes && quotes.length > 0) {
          const { data: items } = await supabase
            .from('quote_items')
            .select('name, description')
            .eq('quote_id', (quotes[0] as { id: string }).id)

          if (items && items.length > 0) {
            // Check if tasks already exist for this project
            const { data: existingTasks } = await supabase
              .from('tasks')
              .select('id')
              .eq('project_id', projectId)
              .limit(1)

            if (!existingTasks || existingTasks.length === 0) {
              const tasks = (items as { name: string; description: string | null }[]).map(item => ({
                project_id: projectId,
                title: item.description ? `${item.name} (${item.description})` : item.name,
                completed: false,
                due_date: proj.delivery_date || null,
                priority: 'medium',
              }))
              await supabase.from('tasks').insert(tasks)
            }
          }
        }
      }
    }

    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, pipeline_stage: stage } : p))
  }

  const filtered = useMemo(() => {
    let result = projects
    if (filter !== 'all') result = result.filter(p => p.pipeline_stage === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) || p.clientName.toLowerCase().includes(q)
      )
    }
    return result
  }, [projects, filter, search])

  const grouped = useMemo(() => {
    const groups: Record<string, ProjectWithFinance[]> = {}
    for (const stage of STAGES) {
      const items = filtered.filter(p => p.pipeline_stage === stage)
      if (items.length > 0) groups[stage] = items
    }
    return groups
  }, [filtered])

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-dark border-t-transparent" /></div>
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} projects total`}
        actions={
          <Link to="/quotes">
            <Button variant="primary"><Plus size={16} /> New Quote</Button>
          </Link>
        }
      />

      {/* Search + filter */}
      <div className="mb-6 flex items-center gap-4">
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
          {(['all', ...STAGES] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                'px-3 py-2 text-xs font-medium transition-colors',
                filter === s ? 'bg-gold-dark text-white' : 'text-muted hover:bg-cream',
              )}
            >
              {s === 'all' ? 'All' : PIPELINE_STAGES[s].label}
            </button>
          ))}
        </div>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <EmptyState
          icon={Filter}
          title="No projects"
          description={filter !== 'all' ? 'No projects in this stage' : 'Create a quote to start a project'}
          action={{ label: 'New Quote', onClick: () => window.location.href = '/quotes' }}
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([stage, items]) => (
            <div key={stage}>
              <div className="mb-3 flex items-center gap-2">
                <PipelineBadge stage={stage as PipelineStage} />
                <span className="text-xs text-muted">({items.length})</span>
              </div>
              <div className="space-y-2">
                {items.map(p => (
                  <ProjectCard key={p.id} project={p} onStageChange={updateStage} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project: p, onStageChange }: { project: ProjectWithFinance; onStageChange: (id: string, stage: PipelineStage) => void }) {
  const [showStageMenu, setShowStageMenu] = useState(false)
  const progressPct = p.total > 0 ? Math.min(100, (p.paid / p.total) * 100) : 0

  return (
    <div className="flex items-center justify-between rounded-2xl border border-sand/40 bg-white px-5 py-4 hover:border-gold/40 hover:shadow-sm transition-all">
      <Link to={`/projects/${p.id}`} className="flex items-center gap-5 flex-1 min-w-0">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-bark truncate">{p.name}</p>
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
            <div className="h-full rounded-full bg-forest transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Inline stage changer */}
        <div className="relative">
          <button onClick={() => setShowStageMenu(!showStageMenu)} className="flex items-center gap-1">
            <PipelineBadge stage={p.pipeline_stage} />
            <ChevronDown size={12} className="text-muted" />
          </button>
          {showStageMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowStageMenu(false)} />
              <div className="absolute right-0 top-8 z-20 rounded-xl border border-sand bg-white p-1 shadow-lg min-w-[140px]">
                {STAGES.map(s => (
                  <button
                    key={s}
                    onClick={() => { onStageChange(p.id, s); setShowStageMenu(false) }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors',
                      p.pipeline_stage === s ? 'bg-cream font-semibold text-bark' : 'text-muted hover:bg-cream hover:text-bark',
                    )}
                  >
                    <PipelineBadge stage={s} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <Link to={`/projects/${p.id}`}>
          <ChevronRight size={16} className="text-sand" />
        </Link>
      </div>
    </div>
  )
}
