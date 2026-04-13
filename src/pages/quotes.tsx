import { useState, useMemo, useCallback } from 'react'
import {
  Plus, Trash2, GripVertical, Gift, Eye, EyeOff, Download,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { uid, fmtCurrency, safeFloat, cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Category, Article } from '@/types/database'
import { generateQuotePdf } from '@/lib/pdf-quote'

interface QuoteItemLocal {
  id: string
  name: string
  articleId: string
  qty: number
  unitPrice: string
  isOverride: boolean
  isOffered: boolean
  hideQty: boolean
}

interface QuotePageProps {
  categories: Category[]
  articles: Article[]
}

export function QuotesPage({ categories, articles }: QuotePageProps) {
  const { toast } = useToast()

  const [client, setClient] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<QuoteItemLocal[]>([])
  const [discMode, setDiscMode] = useState<'pct' | 'fixed'>('pct')
  const [discVal, setDiscVal] = useState('')
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const articleOptions = useMemo(() => {
    const parents = categories.filter(c => !c.parent_id)
    const result: { value: string; label: string }[] = []
    parents.forEach(parent => {
      const subs = categories.filter(c => c.parent_id === parent.id)
      subs.forEach(sub => {
        const arts = articles.filter(a => a.category_id === sub.id)
        arts.forEach(art => {
          result.push({ value: art.id, label: `${parent.name} > ${sub.name} > ${art.name}` })
        })
      })
    })
    return result
  }, [categories, articles])

  const subtotal = useMemo(() =>
    items.reduce((sum, it) => it.isOffered ? sum : sum + safeFloat(it.qty) * safeFloat(it.unitPrice), 0),
  [items])

  const discAmount = discMode === 'pct'
    ? subtotal * safeFloat(discVal) / 100
    : safeFloat(discVal)

  const total = Math.max(0, subtotal - discAmount)

  const addItem = useCallback(() => {
    setItems(prev => [...prev, {
      id: uid(), name: '', articleId: '', qty: 1,
      unitPrice: '', isOverride: false, isOffered: false, hideQty: false,
    }])
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const updateItem = useCallback((id: string, patch: Partial<QuoteItemLocal>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
  }, [])

  const handleArticleChange = useCallback((id: string, articleId: string) => {
    const art = articles.find(a => a.id === articleId)
    if (art) {
      updateItem(id, { articleId, unitPrice: String(art.price), isOverride: false })
    }
  }, [articles, updateItem])

  const handleDragEnd = useCallback((fromIdx: number, toIdx: number) => {
    setItems(prev => {
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      if (moved) next.splice(toIdx, 0, moved)
      return next
    })
    setDragIdx(null)
  }, [])

  const clearQuote = () => {
    setClient('')
    setDeliveryDate('')
    setNotes('')
    setItems([])
    setDiscMode('pct')
    setDiscVal('')
  }

  // ── PDF generation ──
  const exportPdf = async () => {
    if (!client.trim()) { toast('Enter a client name', 'error'); return }
    if (items.length === 0) { toast('Add at least one item', 'error'); return }

    try {
      const pdfItems = items.map(it => ({
        name: it.name || articleOptions.find(o => o.value === it.articleId)?.label || 'Item',
        qty: it.qty,
        unitPrice: safeFloat(it.unitPrice),
        isOffered: it.isOffered,
        hideQty: it.hideQty,
      }))

      const discLabel = discMode === 'pct' ? `Discount (${discVal}%)` : 'Discount'

      generateQuotePdf({
        client: client.trim(),
        deliveryDate,
        notes,
        items: pdfItems,
        subtotal,
        discAmount,
        discLabel,
        total,
      })

      toast('PDF exported successfully')
    } catch (err) {
      console.error('PDF export error:', err)
      toast('Failed to export PDF', 'error')
    }
  }

  // ── Save as project (creates client + project + quote in Supabase) ──
  const saveAsProject = async () => {
    if (!client.trim()) { toast('Enter a client name', 'error'); return }
    if (items.length === 0) { toast('Add at least one item', 'error'); return }

    setSaving(true)
    try {
      // 1. Upsert client
      const { data: existingClients } = await supabase
        .from('clients')
        .select('id')
        .ilike('name', client.trim())
        .limit(1)

      let clientId: string
      if (existingClients && existingClients.length > 0) {
        clientId = (existingClients[0] as { id: string }).id
      } else {
        const { data: newClient, error: clientErr } = await supabase
          .from('clients')
          .insert({ name: client.trim() })
          .select('id')
          .single()
        if (clientErr || !newClient) throw clientErr || new Error('Failed to create client')
        clientId = (newClient as { id: string }).id
      }

      // 2. Create project
      const { data: project, error: projErr } = await supabase
        .from('projects')
        .insert({
          client_id: clientId,
          name: `${client.trim()} - Quote`,
          delivery_date: deliveryDate || null,
          pipeline_stage: 'quoted',
          notes: notes || null,
          sumit_done: false,
        })
        .select('id')
        .single()
      if (projErr || !project) throw projErr || new Error('Failed to create project')
      const projectId = (project as { id: string }).id

      // 3. Create quote
      const { data: quote, error: quoteErr } = await supabase
        .from('quotes')
        .insert({
          project_id: projectId,
          version: 1,
          subtotal,
          discount_mode: discMode,
          discount_value: safeFloat(discVal),
          total,
          notes: notes || null,
          exported_at: null,
        })
        .select('id')
        .single()
      if (quoteErr || !quote) throw quoteErr || new Error('Failed to create quote')
      const quoteId = (quote as { id: string }).id

      // 4. Insert quote items
      const quoteItems = items.map((it, idx) => ({
        quote_id: quoteId,
        article_id: it.articleId || null,
        name: it.name || articleOptions.find(o => o.value === it.articleId)?.label || 'Item',
        description: null,
        quantity: it.qty,
        unit_price: safeFloat(it.unitPrice),
        is_override: it.isOverride,
        is_offered: it.isOffered,
        hide_qty: it.hideQty,
        sort_order: idx,
      }))

      const { error: itemsErr } = await supabase.from('quote_items').insert(quoteItems)
      if (itemsErr) throw itemsErr

      toast('Project and client saved!')
      clearQuote()
    } catch (err) {
      console.error('Save error:', err)
      toast('Failed to save project', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="New Quote"
        subtitle="Create a quote for a client"
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={clearQuote}>Clear</Button>
            <Button variant="primary" onClick={exportPdf}>
              <Download size={16} />
              Export PDF
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Client Name" value={client} onChange={e => setClient(e.target.value)} placeholder="e.g. Sarah & David" />
              <Input label="Delivery Date" type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
              <Input label="Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." />
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-bark">Line Items</h3>
              <Button variant="primary" size="sm" onClick={addItem}>
                <Plus size={14} /> Add Item
              </Button>
            </div>

            {items.length > 0 && (
              <div className="mb-2 grid grid-cols-[24px_1fr_2fr_70px_90px_90px_80px] gap-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                <div />
                <div>Description</div>
                <div>Article</div>
                <div>Qty</div>
                <div>Price</div>
                <div>Total</div>
                <div />
              </div>
            )}

            <div className="space-y-1">
              {items.map((item, idx) => {
                const lineTotal = item.isOffered ? 0 : safeFloat(item.qty) * safeFloat(item.unitPrice)
                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => setDragIdx(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => dragIdx !== null && handleDragEnd(dragIdx, idx)}
                    className={cn(
                      'grid grid-cols-[24px_1fr_2fr_70px_90px_90px_80px] items-center gap-2 rounded-lg px-1 py-1.5',
                      'hover:bg-cream transition-colors',
                      item.isOffered && 'opacity-60',
                    )}
                  >
                    <GripVertical size={14} className="cursor-grab text-sand" />
                    <input
                      value={item.name}
                      onChange={e => updateItem(item.id, { name: e.target.value })}
                      className="w-full rounded border border-sand/60 bg-white px-2 py-1.5 text-xs focus:border-gold-dark focus:outline-none"
                      placeholder="Description"
                    />
                    <select
                      value={item.articleId}
                      onChange={e => handleArticleChange(item.id, e.target.value)}
                      className="w-full appearance-none rounded border border-sand/60 bg-white px-2 py-1.5 text-xs focus:border-gold-dark focus:outline-none"
                    >
                      <option value="">Select article...</option>
                      {articleOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={e => updateItem(item.id, { qty: safeFloat(e.target.value, 1) })}
                      className="w-full rounded border border-sand/60 bg-white px-2 py-1.5 text-center text-xs focus:border-gold-dark focus:outline-none"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={e => updateItem(item.id, { unitPrice: e.target.value, isOverride: true })}
                      className={cn(
                        'w-full rounded border px-2 py-1.5 text-center text-xs focus:border-gold-dark focus:outline-none',
                        item.isOverride ? 'border-gold bg-gold/5' : 'border-sand/60 bg-white',
                      )}
                    />
                    <span className={cn('text-center text-xs font-semibold', item.isOffered ? 'text-forest' : 'text-bark')}>
                      {item.isOffered ? 'Offered' : fmtCurrency(lineTotal)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateItem(item.id, { isOffered: !item.isOffered })}
                        className={cn('rounded p-1 transition-colors', item.isOffered ? 'text-forest' : 'text-sand hover:text-muted')}
                        title={item.isOffered ? 'Remove offer' : 'Mark as offered'}
                      >
                        <Gift size={14} />
                      </button>
                      <button
                        onClick={() => updateItem(item.id, { hideQty: !item.hideQty })}
                        className={cn('rounded p-1 transition-colors', item.hideQty ? 'text-navy' : 'text-sand hover:text-muted')}
                        title={item.hideQty ? 'Show qty in PDF' : 'Hide qty in PDF'}
                      >
                        {item.hideQty ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="rounded p-1 text-sand hover:text-coral transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {items.length === 0 && (
              <button
                onClick={addItem}
                className="w-full rounded-xl border-2 border-dashed border-sand/60 py-8 text-sm text-muted hover:border-gold hover:text-bark transition-colors"
              >
                Click to add your first item
              </button>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-8">
            <h3 className="mb-4 font-display text-lg font-bold text-bark">Summary</h3>
            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted">Discount</label>
              <div className="flex gap-2">
                <div className="flex rounded-lg border border-sand overflow-hidden">
                  <button
                    onClick={() => setDiscMode('pct')}
                    className={cn('px-3 py-1.5 text-xs font-medium transition-colors', discMode === 'pct' ? 'bg-gold-dark text-white' : 'text-muted hover:bg-cream')}
                  >%</button>
                  <button
                    onClick={() => setDiscMode('fixed')}
                    className={cn('px-3 py-1.5 text-xs font-medium transition-colors', discMode === 'fixed' ? 'bg-gold-dark text-white' : 'text-muted hover:bg-cream')}
                  >NIS</button>
                </div>
                <input
                  type="number"
                  value={discVal}
                  onChange={e => setDiscVal(e.target.value)}
                  className="flex-1 rounded-lg border border-sand bg-white px-3 py-1.5 text-sm focus:border-gold-dark focus:outline-none"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2 border-t border-sand/40 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Subtotal</span>
                <span className="font-medium">{fmtCurrency(subtotal)}</span>
              </div>
              {discAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Discount</span>
                  <span className="font-medium text-coral">-{fmtCurrency(discAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-sand/40 pt-3">
                <span className="text-sm font-semibold text-bark">Total</span>
                <span className="font-display text-3xl font-bold text-bark">{fmtCurrency(total)}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <Button variant="primary" className="w-full" onClick={exportPdf}>
                <Download size={16} /> Export PDF
              </Button>
              <Button variant="secondary" className="w-full" onClick={saveAsProject} disabled={saving}>
                {saving ? 'Saving...' : 'Save as Project'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
