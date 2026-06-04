import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, Gift, Save, CreditCard, Lock, CheckCircle, Calendar,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PipelineBadge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
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
  const [pendingDeleteItemId, setPendingDeleteItemId] = useState<string | null>(null)
  const [pendingAccept, setPendingAccept] = useState(false)

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
  const isLocked = quote?.locked ?? false
  const isFullyPaid = quoteTotal > 0 && totalPaid >= quoteTotal

  const syncQuoteTotal = useCallback(async (newItems: ItemLocal[]) => {
    if (!quote || quote.locked) return
    const newSubtotal = newItems.reduce((sum, it) =>
      it.isOffered ? sum : sum + it.quantity * it.unitPrice, 0)
    // Relire la remise du devis pour ne plus l'écraser (cf. audit C3)
    const discAmount = quote.discount_mode === 'pct'
      ? newSubtotal * (quote.discount_value ?? 0) / 100
      : (quote.discount_value ?? 0)
    const newTotal = Math.max(0, newSubtotal - discAmount)
    await supabase.from('quotes').update({ subtotal: newSubtotal, total: newTotal }).eq('id', quote.id)
  }, [quote])

  const updateItemField = useCallback(async (itemId: string, field: keyof ItemLocal, value: string | number | boolean) => {
    if (isLocked) return
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
    if (!quote || quote.locked) return
    const { data } = await supabase.from('quote_items').insert({
      quote_id: quote.id,
      name: 'Nouvel article',
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
        name: 'Nouvel article',
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
    if (isLocked) return
    const newItems = items.filter(it => it.id !== itemId)
    setItems(newItems)
    await supabase.from('quote_items').delete().eq('id', itemId)
    await syncQuoteTotal(newItems)
  }, [items, syncQuoteTotal, isLocked])

  const changeStage = useCallback(async (stage: PipelineStage) => {
    if (!project) return

    // Livraison indépendante du paiement : plus de blocage si solde dû (décision Phase 3)
    setProject({ ...project, pipeline_stage: stage })
    await supabase.from('projects').update({ pipeline_stage: stage }).eq('id', project.id)

    if (stage === 'in_progress') {
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
          toast(taskInserts.length + ' tâche' + (taskInserts.length > 1 ? 's' : '') + ' créée' + (taskInserts.length > 1 ? 's' : ''))
        }
      }
    }

    toast('Étape changée en ' + PIPELINE_STAGES[stage].label)
  }, [project, items, toast])

  // Marquer accepté → fige le prix (verrou) + horodate l'acceptation
  // (cf. décisions Phase 3 : Accepté = point de bascule du verrou)
  const markAccepted = useCallback(async () => {
    if (!project || !quote) return
    const acceptedAt = new Date().toISOString()
    const { error: qErr } = await supabase
      .from('quotes')
      .update({ status: 'accepted', locked: true, accepted_at: acceptedAt })
      .eq('id', quote.id)
    if (qErr) { toast('Échec du verrouillage : ' + qErr.message, 'error'); return }
    const { error: pErr } = await supabase
      .from('projects')
      .update({ pipeline_stage: 'accepted' })
      .eq('id', project.id)
    if (pErr) { toast('Échec du changement d’étape : ' + pErr.message, 'error'); return }
    setQuote({ ...quote, status: 'accepted', locked: true, accepted_at: acceptedAt })
    setProject({ ...project, pipeline_stage: 'accepted' })
    setPendingAccept(false)
    toast('Devis accepté · prix verrouillé')
  }, [project, quote, toast])

  // Marquer payé : raccourci quand le solde est nul
  const markPaid = useCallback(async () => {
    if (!project) return
    setProject({ ...project, pipeline_stage: 'paid' })
    const { error } = await supabase
      .from('projects')
      .update({ pipeline_stage: 'paid' })
      .eq('id', project.id)
    if (error) {
      toast('Échec du changement d’étape : ' + error.message, 'error')
      return
    }
    toast('Projet marqué comme payé')
  }, [project, toast])

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
      toast('Échec de l’ajout du paiement', 'error')
      return
    }

    setPayments(prev => [data as Payment, ...prev])
    setPayAmount('')
    setPayNote('')
    toast('Paiement ajouté')
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
        <p className="text-muted">Projet introuvable</p>
        <Link to="/projects" className="text-gold-dark hover:underline text-sm mt-2 inline-block">Retour aux projets</Link>
      </div>
    )
  }

  const STAGES = Object.keys(PIPELINE_STAGES) as PipelineStage[]

  return (
    <div>
      <div className="mb-4">
        <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-muted hover:text-bark transition-colors">
          <ArrowLeft size={14} /> Retour aux projets
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

      {/* Bandeaux d'état : devis verrouillé / solde réglé */}
      {(isLocked || isFullyPaid) && (
        <div className="mb-6 flex flex-wrap gap-3">
          {isLocked && (
            <div className="inline-flex items-center gap-2 rounded-full bg-cream-dark px-3 py-1.5 text-xs font-medium text-gold-dark">
              <Lock size={12} />
              Devis verrouillé{quote?.accepted_at ? ' · accepté le ' + fmtDate(quote.accepted_at.slice(0, 10)) : ''}
            </div>
          )}
          {isFullyPaid && project.pipeline_stage !== 'paid' && (
            <button
              onClick={markPaid}
              className="inline-flex items-center gap-2 rounded-full bg-forest-bg px-3 py-1.5 text-xs font-medium text-forest hover:bg-forest-bg/70 transition-colors"
            >
              <CheckCircle size={12} />
              Solde réglé — marquer comme payé
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="col-span-2 space-y-6">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <CardTitle>Articles</CardTitle>
              {!isLocked && (
                <Button variant="primary" size="sm" onClick={addItem}>
                  <Plus size={14} /> Ajouter un article
                </Button>
              )}
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-muted py-4 text-center">Aucun article pour le moment</p>
            ) : (
              <div className="space-y-1">
                <div className="grid grid-cols-[1fr_70px_90px_90px_60px] gap-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
                  <div>Nom</div>
                  <div>Qté</div>
                  <div>Prix</div>
                  <div>Total</div>
                  <div />
                </div>

                {items.map(item => (
                  <div key={item.id} className="group grid grid-cols-[1fr_70px_90px_90px_60px] gap-2 items-center rounded-lg px-2 py-1.5 hover:bg-cream transition-colors">
                    <input
                      value={item.name}
                      onChange={e => updateItemField(item.id, 'name', e.target.value)}
                      readOnly={isLocked}
                      className={cn(
                        'rounded border border-transparent bg-transparent px-2 py-1 text-sm text-bark focus:outline-none',
                        isLocked ? 'cursor-not-allowed' : 'hover:border-sand focus:border-gold-dark',
                      )}
                    />
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={e => updateItemField(item.id, 'quantity', safeFloat(e.target.value, 1))}
                      readOnly={isLocked}
                      className={cn(
                        'rounded border border-transparent bg-transparent px-2 py-1 text-center text-sm text-bark focus:outline-none',
                        isLocked ? 'cursor-not-allowed' : 'hover:border-sand focus:border-gold-dark',
                      )}
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={e => updateItemField(item.id, 'unitPrice', safeFloat(e.target.value))}
                      readOnly={isLocked}
                      className={cn(
                        'rounded border border-transparent bg-transparent px-2 py-1 text-center text-sm text-bark focus:outline-none',
                        isLocked ? 'cursor-not-allowed' : 'hover:border-sand focus:border-gold-dark',
                      )}
                    />
                    <span className={cn('text-center text-sm font-semibold', item.isOffered ? 'text-forest' : 'text-bark')}>
                      {item.isOffered ? 'Offert' : fmtCurrency(item.quantity * item.unitPrice)}
                    </span>
                    <div className="flex items-center gap-1">
                      {!isLocked && (
                        <>
                          <button
                            onClick={() => updateItemField(item.id, 'isOffered', !item.isOffered)}
                            className={cn('rounded p-1', item.isOffered ? 'text-forest' : 'text-sand hover:text-muted')}
                            title={item.isOffered ? 'Retirer l’offre' : 'Marquer comme offert'}
                          >
                            <Gift size={14} />
                          </button>
                          <button
                            onClick={() => setPendingDeleteItemId(item.id)}
                            className="opacity-0 group-hover:opacity-100 rounded p-1 text-sand hover:text-coral transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
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
            <CardTitle>Paiements</CardTitle>
            {payments.length === 0 ? (
              <p className="text-sm text-muted py-4 text-center mt-2">Aucun paiement enregistré</p>
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
            <CardTitle>Récapitulatif</CardTitle>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Total du devis</span>
                <span className="font-medium">{fmtCurrency(quoteTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Payé</span>
                <span className="font-medium text-forest">{fmtCurrency(totalPaid)}</span>
              </div>
              <div className="flex justify-between border-t border-sand/40 pt-2">
                <span className="text-sm font-semibold text-bark">Restant</span>
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

            {/* Échéances : afficher événement ET livraison (cf. audit E3) */}
            {(project.event_date || project.delivery_date) && (
              <div className="mt-4 space-y-1 border-t border-sand/40 pt-3 text-xs text-muted">
                {project.event_date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-gold-dark" />
                    <span>Événement&nbsp;: <span className="font-medium text-bark">{fmtDate(project.event_date)}</span></span>
                  </div>
                )}
                {project.delivery_date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-navy" />
                    <span>Livraison&nbsp;: <span className="font-medium text-bark">{fmtDate(project.delivery_date)}</span></span>
                  </div>
                )}
              </div>
            )}

            {/* Action d'acceptation : disponible tant que le devis n'est pas verrouillé */}
            {quote && !isLocked && items.length > 0 && (
              <div className="mt-4 border-t border-sand/40 pt-4">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => setPendingAccept(true)}
                >
                  <Lock size={14} /> Marquer accepté · verrouiller le prix
                </Button>
                <p className="mt-2 text-[11px] text-muted text-center">
                  Le prix sera figé. Toute modification ultérieure nécessitera une nouvelle version.
                </p>
              </div>
            )}
          </Card>

          <Card>
            <CardTitle>
              <CreditCard size={16} className="inline mr-2" />
              Ajouter un paiement
            </CardTitle>
            <div className="mt-3 space-y-3">
              <Input
                label="Montant (₪)"
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
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted">Méthode</label>
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
                placeholder="Note facultative..."
              />
              <Button variant="primary" className="w-full" onClick={addPayment} disabled={!payAmount || safeFloat(payAmount) <= 0}>
                <Save size={14} /> Enregistrer le paiement
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDeleteItemId !== null}
        onClose={() => setPendingDeleteItemId(null)}
        onConfirm={() => { if (pendingDeleteItemId) removeItem(pendingDeleteItemId) }}
        title="Supprimer cette ligne ?"
        message="Cette ligne sera retirée du devis."
        confirmLabel="Supprimer"
        danger
      />

      <ConfirmDialog
        open={pendingAccept}
        onClose={() => setPendingAccept(false)}
        onConfirm={markAccepted}
        title="Verrouiller ce devis ?"
        message={`Le prix de ${fmtCurrency(quoteTotal)} sera figé. Toute modification ultérieure nécessitera la création d'une nouvelle version du devis.`}
        confirmLabel="Marquer accepté"
      />
    </div>
  )
}
