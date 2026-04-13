import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CalendarDays, Plus, Trash2, CreditCard,
  Pencil, Check, X, Gift,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PipelineBadge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { fmtCurrency, fmtDate, cn, PIPELINE_STAGES } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Project, Client, QuoteItem, Payment, PipelineStage, PaymentMethod } from '@/types/database'

interface ProjectFull extends Project {
  client?: Client
  quoteId: string | null
  items: QuoteItem[]
  payments: Payment[]
}

const STAGES = Object.keys(PIPELINE_STAGES) as PipelineStage[]

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

    // Get the single quote (latest version)
    const { data: quotes } = await supabase
      .from('quotes')
      .select('id')
      .eq('project_id', id)
      .order('version', { ascending: false })
      .limit(1)

    let quoteId: string | null = null
    let items: QuoteItem[] = []
    if (quotes && quotes.length > 0) {
      quoteId = (quotes[0] as { id: string }).id
      const { data: qItems } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quoteId)
        .order('sort_order')
      items = (qItems ?? []) as QuoteItem[]
    }

    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('project_id', id)
      .order('date', { ascending: false })

    setProject({
      ...p,
      client: (p as unknown as Record<string, unknown>).client as Client | undefined,
      quoteId,
      items,
      payments: (payments ?? []) as Payment[],
    } as ProjectFull)
    setNotesVal((p as Record<string, unknown>).notes as string || '')
    setLoading(false)
  }, [id])

  useEffect(() => { loadProject() }, [loadProject])

  // ── Quote total from items ──
  const totalQuoted = project?.items.reduce((s, it) =>
    it.is_offered ? s : s + it.quantity * it.unit_price, 0) ?? 0
  const totalPaid = project?.payments.reduce((s, p) => s + p.amount, 0) ?? 0
  const remaining = Math.max(0, totalQuoted - totalPaid)

  // ── Update quote totals in DB ──
  const syncQuoteTotal = async (items: QuoteItem[], quoteId: string) => {
    const sub = items.reduce((s, it) => it.is_offered ? s : s + it.quantity * it.unit_price, 0)
    await supabase.from('quotes').update({ subtotal: sub, total: sub }).eq('id', quoteId)
  }

  // ── Item CRUD ──
  const updateItem = async (itemId: string, patch: Partial<QuoteItem>) => {
    if (!project || !project.quoteId) return
    await supabase.from('quote_items').update(patch).eq('id', itemId)
    const updated = project.items.map(i => i.id === itemId ? { ...i, ...patch } : i)
    setProject({ ...project, items: updated })
    await syncQuoteTotal(updated, project.quoteId)
  }

  const addItem = async () => {
    if (!project || !project.quoteId) return
    const { data, error } = await supabase
      .from('quote_items')
      .insert({
        quote_id: project.quoteId,
        name: 'New item',
        description: null,
        article_id: null,
        quantity: 1,
        unit_price: 0,
        is_override: true,
        is_offered: false,
        hide_qty: false,
        sort_order: project.items.length,
      })
      .select('*')
      .single()
    if (error || !data) { toast('Failed to add item', 'error'); return }
    const newItems = [...project.items, data as QuoteItem]
    setProject({ ...project, items: newItems })
    toast('Item added')
  }

  const removeItem = async (itemId: string) => {
    if (!project || !project.quoteId) return
    await supabase.from('quote_items').delete().eq('id', itemId)
    const updated = project.items.filter(i => i.id !== itemId)
    setProject({ ...project, items: updated })
    await syncQuoteTotal(updated, project.quoteId)
    toast('Item removed')
  }

  // ── Stage ──
  const updateStage = async (stage: PipelineStage) => {
    if (!project) return
    await supabase.from('projects').update({ pipeline_stage: stage }).eq('id', project.id)

    // Auto-create tasks when confirming
    if (stage === 'confirmed' && project.items.length > 0) {
      const { data: existingTasks } = await supabase
        .from('tasks').select('id').eq('project_id', project.id).limit(1)
      if (!existingTasks || existingTasks.length === 0) {
        const tasks = project.items.map(item => ({
          project_id: project.id,
          title: item.description ? `${item.name} (${item.description})` : item.name,
          completed: false,
          due_date: project.delivery_date || null,
          priority: 'medium',
        }))
        await supabase.from('tasks').insert(tasks)
      }
    }

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
    setPayAmount(''); setPayNote(''); setShowPayForm(false)
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
    // Delete tasks
    await supabase.from('tasks').delete().eq('project_id', project.id)
    if (project.quoteId) {
      await supabase.from('quote_items').delete().eq('quote_id', project.quoteId)
      await supabase.from('quotes').delete().eq('project_id', project.id)
    }
    await supabase.from('payments').delete().eq('project_id', project.id)
    await supabase.from('projects').delete().eq('id', project.id)
    toast('Project deleted')
    navigate('/projects')
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-dark border-t-transparent" /></div>
  if (!project) return <div className="text-center py-20"><p className="text-muted mb-4">Project not found</p><Link to="/projects" className="text-sm text-gold-dark hover:underline">Back to projects</Link></div>

  const clientName = project.client?.name ?? 'Unknown client'

  return (
    <div>
      <PageHeader
        title={project.name}
        subtitle={clientName}
        actions={
          <div className="flex gap-2">
            <Link to="/projects"><Button variant="ghost"><ArrowLeft size={16} /> Back</Button></Link>
            <Button variant="ghost" onClick={deleteProject} className="text-coral hover:text-coral"><Trash2 size={16} /> Delete</Button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Details card */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-bark">Details</h3>
              {editingStage ? (
                <div className="flex gap-1 flex-wrap">
                  {STAGES.map(s => (
                    <button key={s} onClick={() => updateStage(s)}
                      className={cn('rounded-full px-3 py-1 text-xs font-medium transition-colors',
                        project.pipeline_stage === s ? 'bg-bark text-white' : 'bg-cream text-muted hover:bg-cream-dark')}>
                      {PIPELINE_STAGES[s].label}
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
              <div><span className="text-muted">Client</span><p className="font-medium text-bark">{clientName}</p></div>
              <div><span className="text-muted">Delivery</span><p className="font-medium text-bark flex items-center gap-1"><CalendarDays size={13} /> {fmtDate(project.delivery_date)}</p></div>
            </div>
            <div className="mt-4 pt-4 border-t border-sand/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">Notes</span>
                {!editingNotes && <button onClick={() => setEditingNotes(true)} className="text-sand hover:text-gold-dark"><Pencil size={12} /></button>}
              </div>
              {editingNotes ? (
                <div className="flex gap-2">
                  <textarea value={notesVal} onChange={e => setNotesVal(e.target.value)}
                    className="flex-1 rounded-lg border border-sand bg-white px-3 py-2 text-sm focus:border-gold-dark focus:outline-none resize-none" rows={3} autoFocus />
                  <div className="flex flex-col gap-1">
                    <button onClick={saveNotes} className="rounded p-1 text-forest hover:bg-forest-bg"><Check size={14} /></button>
                    <button onClick={() => { setEditingNotes(false); setNotesVal(project.notes || '') }} className="rounded p-1 text-coral hover:bg-coral-bg"><X size={14} /></button>
                  </div>
                </div>
              ) : <p className="text-sm text-muted">{project.notes || 'No notes'}</p>}
            </div>
          </Card>

          {/* Editable Items */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-bark">Items</h3>
              <Button variant="primary" size="sm" onClick={addItem}><Plus size={14} /> Add Item</Button>
            </div>

            {project.items.length > 0 && (
              <div className="mb-2 grid grid-cols-[1fr_1fr_60px_80px_80px_70px] gap-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                <div>Description</div>
                <div>Article</div>
                <div>Qty</div>
                <div>Price</div>
                <div>Total</div>
                <div />
              </div>
            )}

            <div className="space-y-1">
              {project.items.map(item => (
                <ItemRow key={item.id} item={item} onUpdate={updateItem} onRemove={removeItem} />
              ))}
            </div>

            {project.items.length === 0 && (
              <button onClick={addItem}
                className="w-full rounded-xl border-2 border-dashed border-sand/60 py-6 text-sm text-muted hover:border-gold hover:text-bark transition-colors">
                Add your first item
              </button>
            )}

            {/* Items total */}
            <div className="mt-4 pt-3 border-t border-sand/40 flex justify-between">
              <span className="text-sm font-semibold text-bark">Items Total</span>
              <span className="font-display text-2xl font-bold text-bark">{fmtCurrency(totalQuoted)}</span>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <h3 className="mb-4 font-display text-lg font-bold text-bark">Finances</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted">Quoted</span><span className="font-medium">{fmtCurrency(totalQuoted)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted">Paid</span><span className="font-medium text-forest">{fmtCurrency(totalPaid)}</span></div>
              <div className="flex justify-between text-sm border-t border-sand/40 pt-2">
                <span className="font-semibold text-bark">Remaining</span>
                <span className={cn('font-bold', remaining > 0 ? 'text-coral' : 'text-forest')}>{fmtCurrency(remaining)}</span>
              </div>
              <div className="h-2 rounded-full bg-cream-dark overflow-hidden">
                <div className="h-full rounded-full bg-forest transition-all duration-500"
                  style={{ width: `${totalQuoted > 0 ? Math.min(100, (totalPaid / totalQuoted) * 100) : 0}%` }} />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-bark flex items-center gap-2"><CreditCard size={18} /> Payments</h3>
              <Button variant="primary" size="sm" onClick={() => setShowPayForm(!showPayForm)}><Plus size={14} /></Button>
            </div>

            {showPayForm && (
              <div className="mb-4 space-y-2 rounded-xl border border-gold/30 bg-cream/50 p-3">
                <Input label="Amount" type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0" />
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">Method</label>
                  <select value={payMethod} onChange={e => setPayMethod(e.target.value as PaymentMethod)}
                    className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm focus:border-gold-dark focus:outline-none">
                    <option value="wire_transfer">Wire Transfer</option>
                    <option value="cash">Cash</option>
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
                      <p className="text-[10px] text-muted">{fmtDate(pay.date)} - {pay.method === 'wire_transfer' ? 'Wire Transfer' : 'Cash'}</p>
                    </div>
                    <button onClick={() => deletePayment(pay.id)}
                      className="opacity-0 group-hover:opacity-100 text-sand hover:text-coral transition-all"><Trash2 size={12} /></button>
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

// ── Inline editable item row ──
function ItemRow({ item, onUpdate, onRemove }: { item: QuoteItem; onUpdate: (id: string, p: Partial<QuoteItem>) => void; onRemove: (id: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.name)
  const [qty, setQty] = useState(String(item.quantity))
  const [price, setPrice] = useState(String(item.unit_price))

  const save = () => {
    onUpdate(item.id, { name, quantity: parseFloat(qty) || 1, unit_price: parseFloat(price) || 0 })
    setEditing(false)
  }

  const lineTotal = item.is_offered ? 0 : item.quantity * item.unit_price

  if (editing) {
    return (
      <div className="grid grid-cols-[1fr_1fr_60px_80px_80px_70px] items-center gap-2 rounded-lg bg-cream/50 px-1 py-1.5">
        <input value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          className="w-full rounded border border-gold bg-white px-2 py-1 text-xs focus:outline-none" autoFocus />
        <span className="text-[10px] text-muted truncate">{item.description || '-'}</span>
        <input value={qty} onChange={e => setQty(e.target.value)} type="number" min={1}
          onKeyDown={e => e.key === 'Enter' && save()}
          className="w-full rounded border border-gold bg-white px-2 py-1 text-xs text-center focus:outline-none" />
        <input value={price} onChange={e => setPrice(e.target.value)} type="number" step="0.01"
          onKeyDown={e => e.key === 'Enter' && save()}
          className="w-full rounded border border-gold bg-white px-2 py-1 text-xs text-center focus:outline-none" />
        <span className="text-xs font-semibold text-bark text-center">{fmtCurrency((parseFloat(qty) || 0) * (parseFloat(price) || 0))}</span>
        <div className="flex gap-0.5">
          <button onClick={save} className="rounded p-1 text-forest hover:bg-forest-bg"><Check size={12} /></button>
          <button onClick={() => setEditing(false)} className="rounded p-1 text-coral hover:bg-coral-bg"><X size={12} /></button>
        </div>
      </div>
    )
  }

  return (
    <div className="group grid grid-cols-[1fr_1fr_60px_80px_80px_70px] items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-cream transition-colors">
      <span className="text-xs text-bark font-medium truncate">{item.name}</span>
      <span className="text-[10px] text-muted truncate">{item.description || '-'}</span>
      <span className="text-xs text-muted text-center">{item.quantity}</span>
      <span className="text-xs text-muted text-center">{fmtCurrency(item.unit_price)}</span>
      <span className={cn('text-xs font-semibold text-center', item.is_offered ? 'text-forest italic' : 'text-bark')}>
        {item.is_offered ? 'Offered' : fmtCurrency(lineTotal)}
      </span>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
        <button onClick={() => onUpdate(item.id, { is_offered: !item.is_offered })}
          className={cn('rounded p-1', item.is_offered ? 'text-forest' : 'text-sand hover:text-muted')} title="Toggle offered">
          <Gift size={12} />
        </button>
        <button onClick={() => { setName(item.name); setQty(String(item.quantity)); setPrice(String(item.unit_price)); setEditing(true) }}
          className="rounded p-1 text-sand hover:text-gold-dark" title="Edit"><Pencil size={12} /></button>
        <button onClick={() => onRemove(item.id)}
          className="rounded p-1 text-sand hover:text-coral" title="Remove"><Trash2 size={12} /></button>
      </div>
    </div>
  )
}
