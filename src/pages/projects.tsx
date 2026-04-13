import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, Search, Filter, CalendarDays, ChevronRight,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PipelineBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { fmtCurrency, fmtDate, cn, PIPELINE_STAGES } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Project, PipelineStage, Quote, Payment } from '@/types/database'

interface ProjectWithFinance extends Project {
  total: number
  paid: number
  remaining: number
  clientName: string
}

const STAGE_ORDER: PipelineStage[] = ['lead', 'quoted', 'confirmed', 'in_progress', 'delivered', 'paid']

export function ProjectsPage() {
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
        const total = quotes.length > 0 ? quotes[quotes.length - 1]!.total : 0
        const paid = payments.reduce((s, pay) => s + pay.amount, 0)
        return {
          ...p,
          total,
          paid,
          remaining: Math.max(0, total - paid),
          clientName: (p.client as { name: string } | null)?.name ?? '—',
          quotes: undefined,
          payments: undefined,
        } as ProjectWithFinance
      })

      setProjects(enriched)
      setLoading(false)
    }
    load()
  }, [])

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
    const groups: Record<PipelineStage, ProjectWithFinance[]> = {
      lead: [], quoted: [], confirmed: [], in_progress: [], delivered: [], paid: [],
    }
    filtered.forEach(p => groups[p.pipeline_stage].push(p))
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
        subtitle={`${projects.length} projects total`}
        actions={
          <Link to="/quotes">
            <Button variant="primary"><Plus size={16} /> New Quote</Button>
          </Link>
        }
      />

      {/* Search + Filters */}
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
          {STAGE_ORDER.map(stage => (
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

      {/* Project list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Filter}
          title="No projects found"
          description={search ? 'Try a different search term' : 'Create your first quote to get started'}
          action={!search ? { label: 'New Quote', onClick: () => {} } : undefined}
        />
      ) : groupedByStage ? (
        // Grouped by stage
        <div className="space-y-8">
          {STAGE_ORDER.map(stage => {
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
                    <ProjectRow key={p.id} project={p} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        // Flat list (filtered by stage)
        <div className="space-y-2">
          {filtered.map(p => (
            <ProjectRow key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectRow({ project: p }: { project: ProjectWithFinance }) {
  const progressPct = p.total > 0 ? Math.min(100, (p.paid / p.total) * 100) : 0

  return (
    <Link
      to={`/projects/${p.id}`}
      className="flex items-center justify-between rounded-2xl border border-sand/40 bg-white px-5 py-4 hover:border-gold/40 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-5">
        <div>
          <p className="text-sm font-semibold text-bark">{p.name}</p>
          <p className="text-xs text-muted">{p.clientName}</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {p.delivery_date && (
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <CalendarDays size={13} />
            {fmtDate(p.delivery_date)}
          </span>
        )}

        {/* Payment progress */}
        <div className="w-28">
          <div className="mb-1 flex justify-between text-[10px]">
            <span className="text-muted">{fmtCurrency(p.paid)}</span>
            <span className="font-semibold text-bark">{fmtCurrency(p.total)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-cream-dark">
            <div
              className="h-full rounded-full bg-forest transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <PipelineBadge stage={p.pipeline_stage} />
        <ChevronRight size={16} className="text-sand" />
      </div>
    </Link>
  )
}
