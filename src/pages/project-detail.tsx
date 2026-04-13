import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, Gift, Save, CreditCard,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PipelineBadge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { fmtCurrency, fmtDate, safeFloat, cn, PIPELINE_STAGES, PAYMENT_METHODS } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Project, Quote, Payment, PipelineStage, PaymentMethod, Client } from '@/types/database'

interface ItemLocal {
  id: string
  name: string
  description: string | null
  quantity: number
  unitPrice: number
  isOffered: boolean
  isNew?: boolean
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<Project | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [items, setItems] = useState<ItemLocal[]>([])
  const [payments, setPayments] = useState<Payment[]>([])

  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<PaymentMethod>('wire_transfer')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [payNote, setPayNote] = useState('')

  useEffect(() => {
    if (!id) return
    async function load() {
      const { data: proj } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()
      if (!proj) { setLoading(false); return }
      setProject(proj)

      const { data: cl } = await supabase
        .from('clients')
        .select('*')
        .eq('id', proj.client_id)
        .single()
      setClient(cl)

      const { data: quotes } = await supabase
        .from('quotes')
        .select('*')
        .eq('project_id', id)
        .order('version', { ascending: false })
        .limit(1)
      const q = quotes?.[0] ?? null
      setQuote(q)

      if (q) {
        const { data: qItems } = await supabase
          .from('quote_items')
          .select('*')
          .eq('quote_id', q.id)
          .order('sort_order')
        setItems((qItems ?? []).map(qi => ({
          id: qi.id,
          name: qi.name,
          description: qi.description,
          quantity: qi.quantity,
          unitPrice: qi.unit_price,
          isOffered: qi.is_offered,
        })))
      }

      const { data: pays } = await supabase
        .from('payments')
        .select('*')
        .eq('project_id', id)
        .order('date', { ascending: false })
      setPayments(pays ?? [])

      setLoading(false)
    }
    load()
  }, [id])

  const quoteTotal = items.reduce((sum, it) =>
    it.isOffered ? sum : sum + it.quantity * it.unitPrice, 0)
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
  const remaining = Math.max(0, quoteTotal - totalPaid)

  const syncQuoteTotal = useCallback(async (newItems: ItemLocal[]) => {
    if (!quote) return
    const newTotal = newItems.reduce((sum, it) =>
      it.isOffered ? sum : sum + it.quantity * it.unitPrice, 0)
    await supabase.from('quotes').update({ total: newTotal, subtotal: newTotal }).eq('id', quote.id)
  }, [quote])

  const updateItemField = useCallback(async (itemId: string, field: keyof ItemLocal, value: string | number | boolean) => {
    const newItems = items.map(it =>
      it.id === itemId ? { ...it, [field]: value } : it
    )
    setItems(newItems)

    const item = newItems.find(it => it.id === itemId)
    if (!item || item.isNew) return

    const dbFields: Record<string, unknown> = {}
    if (field === 'name') dbFields.name = value
    if (field === 'quantity') dbFields.quantity = value
    if (field === 'unitPrice') dbFields.unit_price = value
    if (field === 'isOffered') dbFields.is_offered = value

    if (Object.keys(dbFields).length > 0) {
      await supabase.from('quote_items').update(dbFields).eq('id', itemId)
      await syncQuoteTotal(newItems)
    }
  }, [items, syncQuoteTotal])

  const addItem = useCallback(async () => {
    if (!quote) return
    const { data } = await supabase.from('quote_items').insert({
      quote_id: quote.id,
      name: 'New Item',
      quantity: 1,
      unit_price: 0,
      is_offered: false,
      is_override: false,
      hide_qty: false,
      sort_order: items.length,
    }).select('id').single()

    if (data) {
      const newItems = [...items, {
        id: data.id,
        name: 'New Item',
        description: null,
        quantity: 1,
        unitPrice: 0,
        isOffered: false,
      }]
      setItems(newItems)
      await syncQuoteTotal(newItems)
    }
  }, [quote, items, syncQuoteTotal])

  const removeItem = useCallback(async (itemId: string) => {
    const newItems = items.filter(it => it.id !== itemId)
    setItems(newItems)
    await supabase.from('quote_items').delete().eq('id', itemId)
    await syncQuoteTotal(newItems)
  }, [items, syncQuoteTotal])

  const changeStage = useCallback(async (stage: PipelineStage) => {
    if (!project) return
    setProject({ ...project, pipeline_stage: stage })
    await supabase.from('projects').update({ pipeline_stage: stage }).eq('id', project.id)

    if (stage === 'confirmed') {
      // Guard: don't duplicate tasks if they already exist
      const { count } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', project.id)

      if (!count || count === 0) {
        const taskInserts = items.filter(it => !it.isOffered).map(it => ({
          project_id: project.id,
          title: it.name + ' x' + it.quantity,
          completed: false,
          priority: 'medium' as const,
        }))
        if (taskInserts.length > 0) {
          await supabase.from('tasks').insert(taskInserts)
          toast(taskInserts.length + ' tasks created')
        }
      }
    }

    toast('Stage changed to ' + PIPELINE_STAGES[stage].label)
  }, [project, items, toast])

  const addPayment = useCallback(async () => {
    if (!project || !payAmount) return
    const amount = safeFloat(payAmount)
    if (amount <= 0) return

    const { data, error } = await supabase.from('payments').insert({
      project_id: project.id,
      date: payDate,
      amount,
      method: payMethod,
      note: payNote || null,
    }).select('*').single()

    if (error || !data) {
      toast('Failed to add payment', 'error')
      return
    }

    setPayments(prev => [data as Payment, ...prev])
    setPayAmount('')
    setPayNote('')
    toast('Payment added')
  }, [project, payAmount, payDate, payMethod, payNote, toast])

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
        <p className="text-muted">Project not found</p>
        <Link to="/projects" className="text-gold-dark hover:underline text-sm mt-2 inline-block">Back to Projects</Link>
      </div>
    )
  }

  const STAGES = Object.keys(PIPELINE_STAGES) as PipelineStage[]

  return (
    <div>
      <div className="mb-4">
        <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-muted hover:text-bark transition-colors">
          <ArrowLeft size={14} /> Back to Projects
        </Link>
      </div>

      <PageHeader
        title={project.name}
        subtitle={client?.name ?? ''}
        actions={
          <div className="flex items-center gap-3">
            <select
              value={project.pipeline_stage}
              onChange={e => changeStage(e.target.value as PipelineStage)}
              className="rounded-xl border border-sand bg-white px-3 py-2 text-sm focus:border-gold-dark focus:outline-none"
            >
              {STAGES.map(s => (
                <option key={s} value={s}>{PIPELINE_STAGES[s].label}</option>
              ))}
            </select>
            <PipelineBadge stage={project.pipeline_stage} />
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <CardTitle>Items</CardTitle>
              <Button variant="primary" size="sm" onClick={addItem}>
                <Plus size={14} /> Add Item
              </Button>
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-muted py-4 text-center">No items yet</p>
            ) : (
              <div className="space-y-1">
                <div className="grid grid-cols-[1fr_70px_90px_90px_60px] gap-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
                  <div>Name</div>
                  <div>Qty</div>
                  <div>Price</div>
                  <div>Total</div>
                  <div />
                </div>

                {items.map(item => (
                  <div key={item.id} className="group grid grid-cols-[1fr_70px_90px_90px_60px] gap-2 items-center rounded-lg px-2 py-1.5 hover:bg-cream transition-colors">
                    <input
                      value={item.name}
                      onChange={e => updateItemField(item.id, 'name', e.target.value)}
                      className="rounded border border-transparent bg-transparent px-2 py-1 text-sm text-bark hover:border-sand focus:border-gold-dark focus:outline-none"
                    />
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={e => updateItemField(item.id, 'quantity', safeFloat(e.target.value, 1))}
                      className="rounded border border-transparent bg-transparent px-2 py-1 text-center text-sm text-bark hover:border-sand focus:border-gold-dark focus:outline-none"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={e => updateItemField(item.id, 'unitPrice', safeFloat(e.target.value))}
                      className="rounded border border-transparent bg-transparent px-2 py-1 text-center text-sm text-bark hover:border-sand focus:border-gold-dark focus:outline-none"
                    />
                    <span className={cn('text-center text-sm font-semibold', item.isOffered ? 'text-forest' : 'text-bark')}>
                      {item.isOffered ? 'Offered' : fmtCurrency(item.quantity * item.unitPrice)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateItemField(item.id, 'isOffered', !item.isOffered)}
                        className={cn('rounded p-1', item.isOffered ? 'text-forest' : 'text-sand hover:text-muted')}
                        title={item.isOffered ? 'Remove offer' : 'Mark as offered'}
                      >
                        <Gift size={14} />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 rounded p-1 text-sand hover:text-coral transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-between items-center rounded-xl bg-bark px-5 py-3">
              <span className="text-sm font-semibold text-white">Total</span>
              <span className="font-display text-2xl font-bold text-gold">{fmtCurrency(quoteTotal)}</span>
            </div>
          </Card>

          <Card>
            <CardTitle>Payments</CardTitle>
            {payments.length === 0 ? (
              <p className="text-sm text-muted py-4 text-center mt-2">No payments recorded</p>
            ) : (
              <div className="mt-3 space-y-2">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-cream px-4 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-bark">{fmtCurrency(p.amount)}</p>
                      <p className="text-[11px] text-muted">{fmtDate(p.date)} - {PAYMENT_METHODS[p.method as keyof typeof PAYMENT_METHODS] ?? p.method}</p>
                    </div>
                    {p.note && <p className="text-xs text-muted">{p.note}</p>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardTitle>Summary</CardTitle>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Quote Total</span>
                <span className="font-medium">{fmtCurrency(quoteTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Paid</span>
                <span className="font-medium text-forest">{fmtCurrency(totalPaid)}</span>
              </div>
              <div className="flex justify-between border-t border-sand/40 pt-2">
                <span className="text-sm font-semibold text-bark">Remaining</span>
                <span className="text-lg font-bold text-bark">{fmtCurrency(remaining)}</span>
              </div>
            </div>

            <div className="mt-3">
              <div className="h-2 rounded-full bg-cream-dark">
                <div
                  className="h-full rounded-full bg-forest transition-all duration-500"
                  style={{ width: (quoteTotal > 0 ? Math.min(100, (totalPaid / quoteTotal) * 100) : 0) + '%' }}
                />
              </div>
            </div>

            {project.delivery_date && (
              <div className="mt-4 text-xs text-muted">
                Delivery: {fmtDate(project.delivery_date)}
              </div>
            )}
          </Card>

          <Card>
            <CardTitle>
              <CreditCard size={16} className="inline mr-2" />
              Add Payment
            </CardTitle>
            <div className="mt-3 space-y-3">
              <Input
                label="Amount (NIS)"
                type="number"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                placeholder="0"
              />
              <Input
                label="Date"
                type="date"
                value={payDate}
                onChange={e => setPayDate(e.target.value)}
              />
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted">Method</label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value as PaymentMethod)}
                  className="w-full rounded-xl border border-sand bg-white px-3 py-2.5 text-sm focus:border-gold-dark focus:outline-none"
                >
                  {Object.entries(PAYMENT_METHODS).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Note"
                value={payNote}
                onChange={e => setPayNote(e.target.value)}
                placeholder="Optional note..."
              />
              <Button variant="primary" className="w-full" onClick={addPayment} disabled={!payAmount || safeFloat(payAmount) <= 0}>
                <Save size={14} /> Record Payment
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
