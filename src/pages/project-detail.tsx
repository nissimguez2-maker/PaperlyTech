import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CalendarDays, Plus, Trash2, CreditCard,
  FileText, Pencil, Check, X,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PipelineBadge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { fmtCurrency, fmtDate, cn, PIPELINE_STAGES } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Project, Client, Quote, QuoteItem, Payment, PipelineStage, PaymentMethod } from '@/types/database'

interface ProjectFull extends Project {
  client?: Client
  quotes: (Quote & { items: QuoteItem[] })[]
  payments: Payment[]
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [project, setProject] = useState<ProjectFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingStage, setEditingStage] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesVal, setNotesVal] = useState('')
  const [showPayForm, setShowPayForm] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<PaymentMethod>('wire_transfer')
  const [payNote, setPayNote] = useState('')

  const loadProject = useCallback(async () => {
    if (!id) return
    const { data: p } = await supabase
      .from('projects')
      .select('*, client:clients(*)')
      .eq('id', id)
      .single()

    if (!p) { setLoading(false); return }

    const { data: quotes } = await supabase
      .from('quotes')
      .select('*, items:quote_items(*)')
      .eq('project_id', id)
      .order('version', { ascending: false })

    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('project_id', id)
      .order('date', { ascending: false })

    setProject({
      ...p,
      client: (p as unknown as Record<string, unknown>).client as Client | undefined,
      quotes: (quotes ?? []) as (Quote & { items: QuoteItem[] })[],
      payments: (payments ?? []) as Payment[],
    } as ProjectFull)
    setNotesVal((p as Record<string, unknown>).notes as string || '')
    setLoading(false)
  }, [id])

  useEffect(() => { loadProject() }, [loadProject])

  const updateStage = async (stage: PipelineStage) => {
    if (!project) return
    await supabase.from('projects').update({ pipeline_stage: stage }).eq('id', project.id)
    setProject({ ...project, pipeline_stage: stage })
    setEditingStage(false)
    toast('Stage updated')
  }

  const saveNotes = async () => {
    if (!project) return
    await supabase.from('projects').update({ notes: notesVal || null }).eq('id', project.id)
    setProject({ ...project, notes: notesVal || null })
    setEditingNotes(false)
    toast('Notes saved')
  }

  const addPayment = async () => {
    if (!project || !payAmount) return
    const { error } = await supabase.from('payments').insert({
      project_id: project.id,
      date: new Date().toISOString().split('T')[0],
      amount: parseFloat(payAmount) || 0,
      method: payMethod,
      note: payNote || null,
    })
    if (error) { toast('Failed to add payment', 'error'); return }
    setPayAmount('')
    setPayNote('')
    setShowPayForm(false)
    toast('Payment recorded')
    loadProject()
  }

  const deletePayment = async (payId: string) => {
    if (!confirm('Delete this payment?')) return
    await supabase.from('payments').delete().eq('id', payId)
    toast('Payment deleted')
    loadProject()
  }

  const deleteProject = async () => {
    if (!project) return
    if (!confirm('Delete this project and all its data? This cannot be undone.')) return
    await supabase.from('quote_items').delete().in('quote_id', project.quotes.map(q => q.id))
    await supabase.from('quotes').delete().eq('project_id', project.id)
    await supabase.from('payments').delete().eq('project_id', project.id)
    await supabase.from('projects').delete().eq('id', project.id)
    toast('Project deleted')
    navigate('/projects')
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-dark border-t-transparent" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-muted mb-4">Project not found</p>
        <Link to="/projects" className="text-sm text-gold-dark hover:underline">Back to projects</Link>
      </div>
    )
  }

  const totalQuoted = project.quotes.length > 0 ? project.quotes[0]!.total : 0
  const totalPaid = project.payments.reduce((s, p) => s + p.amount, 0)
  const remaining = Math.max(0, totalQuoted - totalPaid)
  const clientName = project.client?.name ?? 'Unknown client'

  return (
    <div>
      <PageHeader
        title={project.name}
        subtitle={clientName}
        actions={
          <div className="flex gap-2">
            <Link to="/projects">
              <Button variant="ghost"><ArrowLeft size={16} /> Back</Button>
            </Link>
            <Button variant="ghost" onClick={deleteProject} className="text-coral hover:text-coral">
              <Trash2 size={16} /> Delete
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-6">
        {/* Main content */}
        <div className="col-span-2 space-y-6">
          {/* Status + details card */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-bark">Details</h3>
              {editingStage ? (
                <div className="flex gap-1 flex-wrap">
                  {Object.entries(PIPELINE_STAGES).map(([key, s]) => (
                    <button
                      key={key}
                      onClick={() => updateStage(key as PipelineStage)}
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                        project.pipeline_stage === key
                          ? 'bg-bark text-white'
                          : 'bg-cream text-muted hover:bg-cream-dark',
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                  <button onClick={() => setEditingStage(false)} className="p-1 text-muted"><X size={14} /></button>
                </div>
              ) : (
                <button onClick={() => setEditingStage(true)} className="flex items-center gap-2">
                  <PipelineBadge stage={project.pipeline_stage} />
                  <Pencil size={12} className="text-sand" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted">Client</span>
                <p className="font-medium text-bark">{clientName}</p>
              </div>
              <div>
                <span className="text-muted">Delivery</span>
                <p className="font-medium text-bark flex items-center gap-1">
                  <CalendarDays size={13} /> {fmtDate(project.delivery_date)}
                </p>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-4 pt-4 border-t border-sand/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">Notes</span>
                {!editingNotes && (
                  <button onClick={() => setEditingNotes(true)} className="text-sand hover:text-gold-dark"><Pencil size={12} /></button>
                )}
              </div>
              {editingNotes ? (
                <div className="flex gap-2">
                  <textarea
                    value={notesVal}
                    onChange={e => setNotesVal(e.target.value)}
                    className="flex-1 rounded-lg border border-sand bg-white px-3 py-2 text-sm focus:border-gold-dark focus:outline-none resize-none"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex flex-col gap-1">
                    <button onClick={saveNotes} className="rounded p-1 text-forest hover:bg-forest-bg"><Check size={14} /></button>
                    <button onClick={() => { setEditingNotes(false); setNotesVal(project.notes || '') }} className="rounded p-1 text-coral hover:bg-coral-bg"><X size={14} /></button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted">{project.notes || 'No notes'}</p>
              )}
            </div>
          </Card>

          {/* Quotes */}
          <Card>
            <h3 className="mb-4 font-display text-lg font-bold text-bark flex items-center gap-2">
              <FileText size={18} /> Quotes
            </h3>
            {project.quotes.length === 0 ? (
              <p className="text-sm text-muted py-4">No quotes yet</p>
            ) : (
              <div className="space-y-3">
                {project.quotes.map(q => (
                  <div key={q.id} className="rounded-xl border border-sand/40 bg-cream/50 p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-semibold text-muted">Version {q.version}</span>
                      <span className="font-display text-xl font-bold text-bark">{fmtCurrency(q.total)}</span>
                    </div>
                    <div className="space-y-1">
                      {(q.items ?? []).map(item => (
                        <div key={item.id} className="flex justify-between text-xs">
                          <span className="text-muted">{item.name} {!item.hide_qty && <span className="text-sand">x{item.quantity}</span>}</span>
                          <span className={item.is_offered ? 'text-forest italic' : 'text-bark font-medium'}>
                            {item.is_offered ? 'Offered' : fmtCurrency(item.quantity * item.unit_price)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {q.discount_value > 0 && (
                      <div className="mt-2 pt-2 border-t border-sand/30 flex justify-between text-xs">
                        <span className="text-muted">Discount ({q.discount_mode === 'pct' ? `${q.discount_value}%` : 'fixed'})</span>
                        <span className="text-coral">-{fmtCurrency(q.subtotal - q.total)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Financial summary */}
          <Card>
            <h3 className="mb-4 font-display text-lg font-bold text-bark">Finances</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Quoted</span>
                <span className="font-medium">{fmtCurrency(totalQuoted)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Paid</span>
                <span className="font-medium text-forest">{fmtCurrency(totalPaid)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-sand/40 pt-2">
                <span className="font-semibold text-bark">Remaining</span>
                <span className={cn('font-bold', remaining > 0 ? 'text-coral' : 'text-forest')}>
                  {fmtCurrency(remaining)}
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-2 rounded-full bg-cream-dark overflow-hidden">
                <div
                  className="h-full rounded-full bg-forest transition-all duration-500"
                  style={{ width: `${totalQuoted > 0 ? Math.min(100, (totalPaid / totalQuoted) * 100) : 0}%` }}
                />
              </div>
            </div>
          </Card>

          {/* Payments */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-bark flex items-center gap-2">
                <CreditCard size={18} /> Payments
              </h3>
              <Button variant="primary" size="sm" onClick={() => setShowPayForm(!showPayForm)}>
                <Plus size={14} />
              </Button>
            </div>

            {showPayForm && (
              <div className="mb-4 space-y-2 rounded-xl border border-gold/30 bg-cream/50 p-3">
                <Input label="Amount" type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0" />
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">Method</label>
                  <select
                    value={payMethod}
                    onChange={e => setPayMethod(e.target.value as PaymentMethod)}
                    className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm focus:border-gold-dark focus:outline-none"
                  >
                    <option value="wire_transfer">Wire Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="bit">Bit</option>
                  </select>
                </div>
                <Input label="Note" value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Optional" />
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" className="flex-1" onClick={addPayment}>Save</Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowPayForm(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {project.payments.length === 0 ? (
              <p className="text-xs text-muted py-2">No payments yet</p>
            ) : (
              <div className="space-y-2">
                {project.payments.map(pay => (
                  <div key={pay.id} className="group flex items-center justify-between rounded-lg bg-cream/50 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-bark">{fmtCurrency(pay.amount)}</p>
                      <p className="text-[10px] text-muted">{fmtDate(pay.date)} - {pay.method.replace('_', ' ')}</p>
                    </div>
                    <button
                      onClick={() => deletePayment(pay.id)}
                      className="opacity-0 group-hover:opacity-100 text-sand hover:text-coral transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
