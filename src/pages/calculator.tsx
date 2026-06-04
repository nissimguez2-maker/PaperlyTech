import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Copy, Send, Sparkles, RotateCcw } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import { uid, safeFloat, fmtCurrency, round2, cn } from '@/lib/utils'
import type { RevenueType } from '@/types/database'

interface MaterialLocal {
  id: string
  label: string
  qty: string
  unitCost: string
}

interface ElementLocal {
  id: string
  name: string
  hours: string
  rate: string
  factor: string
  materials: MaterialLocal[]
}

const DRAFT_KEY = 'paperly:custom-calc-draft'
const SETTINGS_KEY = 'paperly:custom-calc-settings'
const DEFAULT_RATE = '250'
const DEFAULT_FACTOR = '1.3'

function newMaterial(): MaterialLocal {
  return { id: uid(), label: '', qty: '1', unitCost: '' }
}
function newElement(rate: string, factor: string): ElementLocal {
  return { id: uid(), name: '', hours: '', rate, factor, materials: [newMaterial()] }
}

function computeElement(el: ElementLocal, defRate: number, defFactor: number) {
  const hours = Math.max(0, safeFloat(el.hours))
  const rate = Math.max(0, safeFloat(el.rate, defRate))
  const factor = Math.max(0, safeFloat(el.factor, defFactor))
  const laborCost = hours * rate
  const materialsCost = el.materials.reduce(
    (s, m) => s + Math.max(0, safeFloat(m.qty, 1)) * Math.max(0, safeFloat(m.unitCost)),
    0,
  )
  const markedUp = materialsCost * factor
  return { laborCost, materialsCost, factor, markedUp, marge: markedUp - materialsCost, total: laborCost + markedUp }
}

export function CalculatorPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [defaultRate, setDefaultRate] = useState<string>(() => {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}').rate ?? DEFAULT_RATE } catch { return DEFAULT_RATE }
  })
  const [defaultFactor, setDefaultFactor] = useState<string>(() => {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}').factor ?? DEFAULT_FACTOR } catch { return DEFAULT_FACTOR }
  })
  const [elements, setElements] = useState<ElementLocal[]>(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) { const p = JSON.parse(raw); if (Array.isArray(p?.elements)) return p.elements }
    } catch { /* ignore */ }
    return []
  })
  const [showReset, setShowReset] = useState(false)

  // Autosave (draft + defaults)
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ v: 1, elements })) } catch { /* ignore */ }
  }, [elements])
  useEffect(() => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ rate: defaultRate, factor: defaultFactor })) } catch { /* ignore */ }
  }, [defaultRate, defaultFactor])

  const defRate = safeFloat(defaultRate, 0)
  const defFactor = safeFloat(defaultFactor, 1.3)

  const computed = useMemo(
    () => elements.map(el => ({ el, ...computeElement(el, defRate, defFactor) })),
    [elements, defRate, defFactor],
  )
  const grandTotal = useMemo(() => computed.reduce((s, c) => s + c.total, 0), [computed])

  // ── Mutations ──
  const addElement = useCallback(() => {
    setElements(prev => [...prev, newElement(defaultRate, defaultFactor)])
  }, [defaultRate, defaultFactor])

  const removeElement = useCallback((id: string) => {
    setElements(prev => prev.filter(e => e.id !== id))
  }, [])

  const patchElement = useCallback((id: string, patch: Partial<ElementLocal>) => {
    setElements(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e))
  }, [])

  const addMaterial = useCallback((elId: string) => {
    setElements(prev => prev.map(e => e.id === elId ? { ...e, materials: [...e.materials, newMaterial()] } : e))
  }, [])

  const removeMaterial = useCallback((elId: string, matId: string) => {
    setElements(prev => prev.map(e => e.id === elId ? { ...e, materials: e.materials.filter(m => m.id !== matId) } : e))
  }, [])

  const patchMaterial = useCallback((elId: string, matId: string, patch: Partial<MaterialLocal>) => {
    setElements(prev => prev.map(e => e.id === elId
      ? { ...e, materials: e.materials.map(m => m.id === matId ? { ...m, ...patch } : m) }
      : e))
  }, [])

  const doReset = useCallback(() => {
    setElements([])
    try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
    setShowReset(false)
    toast('Calculateur réinitialisé')
  }, [toast])

  // ── Integration ──
  const copyTotal = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fmtCurrency(round2(grandTotal)))
      toast('Total copié : ' + fmtCurrency(round2(grandTotal)))
    } catch { toast('Impossible de copier', 'error') }
  }, [grandTotal, toast])

  const addToQuote = useCallback(() => {
    const items = computed
      .filter(c => c.total > 0)
      .map(c => ({
        name: c.el.name || 'Pièce unique',
        unitPrice: round2(c.total),
        quantity: 1,
        revenueType: 'original' as RevenueType,
      }))
    if (items.length === 0) { toast('Ajoutez au moins une pièce chiffrée', 'error'); return }
    try {
      localStorage.setItem('paperly:quote-prefill', JSON.stringify({ source: 'custom-calculator', items }))
      navigate('/quotes')
    } catch { toast('Échec de l’ajout au devis', 'error') }
  }, [computed, navigate, toast])

  const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted'
  const fieldCls = 'w-full rounded-xl border border-sand bg-white px-3 py-2.5 text-sm text-bark focus:border-gold-dark focus:outline-none'

  return (
    <div>
      <PageHeader
        title="Calculateur · pièces uniques"
        subtitle="Estimez le prix d'une création originale"
        actions={
          elements.length > 0 ? (
            <Button variant="ghost" onClick={() => setShowReset(true)}>
              <RotateCcw size={16} /> Réinitialiser
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Defaults */}
          <Card>
            <CardTitle>Réglages par défaut</CardTitle>
            <p className="mt-1 text-sm text-muted">Appliqués aux nouvelles pièces — modifiables pièce par pièce.</p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Taux horaire par défaut (₪/h)"
                type="number" inputMode="decimal" step="0.01"
                value={defaultRate}
                onChange={e => setDefaultRate(e.target.value)}
                placeholder="250"
              />
              <Input
                label="Facteur matériaux par défaut"
                type="number" inputMode="decimal" step="0.01"
                value={defaultFactor}
                onChange={e => setDefaultFactor(e.target.value)}
                placeholder="1.3"
              />
            </div>
          </Card>

          {/* Elements */}
          {elements.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="Aucune pièce pour l'instant"
              description="Ajoutez votre première pièce unique pour estimer son prix."
              action={{ label: 'Ajouter une pièce', onClick: addElement }}
            />
          ) : (
            <div className="space-y-6">
              {computed.map(({ el, laborCost, materialsCost, factor, marge, total }) => (
                <Card key={el.id}>
                  <div className="mb-4 flex items-center gap-3">
                    <input
                      value={el.name}
                      onChange={e => patchElement(el.id, { name: e.target.value })}
                      placeholder="Nom de la pièce (ex. : centre de table sculpté)"
                      className="flex-1 rounded-xl border border-transparent bg-transparent px-2 py-1.5 font-display text-lg text-bark hover:border-sand focus:border-gold-dark focus:outline-none"
                    />
                    <button
                      onClick={() => removeElement(el.id)}
                      className="rounded-lg p-2 text-sand hover:text-coral transition-colors"
                      aria-label="Supprimer la pièce"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Labor + factor */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className={labelCls}>Heures de travail</label>
                      <input type="number" inputMode="decimal" step="0.25" min={0} value={el.hours}
                        onChange={e => patchElement(el.id, { hours: e.target.value })}
                        placeholder="0" className={fieldCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Taux horaire (₪/h)</label>
                      <input type="number" inputMode="decimal" step="0.01" min={0} value={el.rate}
                        onChange={e => patchElement(el.id, { rate: e.target.value })}
                        placeholder={defaultRate} className={fieldCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Facteur matériaux</label>
                      <input type="number" inputMode="decimal" step="0.01" min={0} value={el.factor}
                        onChange={e => patchElement(el.id, { factor: e.target.value })}
                        placeholder={defaultFactor} className={fieldCls} />
                    </div>
                  </div>

                  {/* Materials */}
                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className={labelCls + ' mb-0'}>Matériaux</span>
                    </div>
                    {el.materials.length > 0 && (
                      <div className="mb-1 hidden grid-cols-[1fr_72px_110px_110px_36px] gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted sm:grid">
                        <div>Matériau</div><div>Qté</div><div>Coût unit. (₪)</div><div>Sous-total</div><div />
                      </div>
                    )}
                    <div className="space-y-2">
                      {el.materials.map(m => {
                        const sub = Math.max(0, safeFloat(m.qty, 1)) * Math.max(0, safeFloat(m.unitCost))
                        return (
                          <div key={m.id} className="grid grid-cols-[1fr_56px_84px_32px] items-center gap-2 sm:grid-cols-[1fr_72px_110px_110px_36px]">
                            <input value={m.label} onChange={e => patchMaterial(el.id, m.id, { label: e.target.value })}
                              placeholder="Matériau (ex. : argile)" className={fieldCls} />
                            <input type="number" inputMode="decimal" step="1" min={0} value={m.qty}
                              onChange={e => patchMaterial(el.id, m.id, { qty: e.target.value })}
                              placeholder="1" className={fieldCls + ' text-center'} />
                            <input type="number" inputMode="decimal" step="0.01" min={0} value={m.unitCost}
                              onChange={e => patchMaterial(el.id, m.id, { unitCost: e.target.value })}
                              placeholder="0" className={fieldCls + ' text-right'} />
                            <span className="hidden text-right text-sm font-medium text-bark tabular sm:block">{fmtCurrency(sub)}</span>
                            <button onClick={() => removeMaterial(el.id, m.id)}
                              className="justify-self-center rounded-lg p-1.5 text-sand hover:text-coral transition-colors"
                              aria-label="Supprimer le matériau">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                    <button onClick={() => addMaterial(el.id)}
                      className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-gold-dark hover:text-primary-hover transition-colors">
                      <Plus size={14} /> Ajouter un matériau
                    </button>
                  </div>

                  {/* Breakdown */}
                  <div className="mt-5 space-y-1.5 border-t border-sand/50 pt-4 text-sm">
                    <div className="flex justify-between"><span className="text-muted">Main d'œuvre</span><span className="tabular font-medium text-bark">{fmtCurrency(laborCost)}</span></div>
                    <div className="flex justify-between"><span className="text-muted">Matériaux (hors marge)</span><span className="tabular font-medium text-bark">{fmtCurrency(materialsCost)}</span></div>
                    {factor !== 1 && materialsCost > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted">Marge matériaux (×{factor.toLocaleString('fr-FR')})</span>
                        <span className={cn('tabular font-medium', marge >= 0 ? 'text-forest' : 'text-coral')}>{marge >= 0 ? '+' : ''}{fmtCurrency(marge)}</span>
                      </div>
                    )}
                    {factor < 1 && (
                      <p className="text-[11px] text-muted">Facteur inférieur à 1 : marge négative sur les matériaux.</p>
                    )}
                    <div className="flex items-center justify-between border-t border-sand/50 pt-3">
                      <span className="font-semibold text-bark">Total de la pièce</span>
                      <span className="font-display text-xl font-bold text-bark tabular">{fmtCurrency(round2(total))}</span>
                    </div>
                  </div>
                </Card>
              ))}

              <Button variant="secondary" className="w-full" onClick={addElement}>
                <Plus size={16} /> Ajouter une pièce
              </Button>
            </div>
          )}
        </div>

        {/* Summary */}
        <div>
          <Card className="lg:sticky lg:top-8">
            <CardTitle>Total général</CardTitle>
            <p className="mt-3 font-display text-4xl font-bold text-bark tabular">{fmtCurrency(round2(grandTotal))}</p>

            {computed.length > 0 && (
              <div className="mt-5 space-y-2 border-t border-sand/50 pt-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted">Détail par pièce</div>
                {computed.map(({ el, total }) => (
                  <div key={el.id} className="flex justify-between text-sm">
                    <span className="truncate text-muted">{el.name || 'Pièce unique'}</span>
                    <span className="tabular ml-2 shrink-0 font-medium text-bark">{fmtCurrency(round2(total))}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 space-y-2">
              <Button variant="primary" className="w-full" onClick={addToQuote} disabled={grandTotal <= 0}>
                <Send size={16} /> Ajouter au devis
              </Button>
              <Button variant="ghost" className="w-full" onClick={copyTotal} disabled={grandTotal <= 0}>
                <Copy size={16} /> Copier le total
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={showReset}
        onClose={() => setShowReset(false)}
        onConfirm={doReset}
        title="Tout réinitialiser ?"
        message="Cela supprimera toutes les pièces et matériaux saisis. Action irréversible."
        confirmLabel="Tout effacer"
        danger
      />
    </div>
  )
}
