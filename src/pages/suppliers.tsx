import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, Users, Phone, FileText } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { fmtCurrency, uid } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Supplier } from '@/types/database'

export function SuppliersPage() {
  const { toast } = useToast()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', contact: '', notes: '' })

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('suppliers').select('*').order('name')
      setSuppliers(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const addSupplier = useCallback(async () => {
    if (!form.name.trim()) {
      toast('Enter a name', 'error')
      return
    }
    const newSupplier: Supplier = {
      id: uid(),
      name: form.name.trim(),
      contact: form.contact || null,
      notes: form.notes || null,
      offerings: [],
      created_at: new Date().toISOString(),
    }
    setSuppliers(prev => [...prev, newSupplier])
    setShowAdd(false)
    setForm({ name: '', contact: '', notes: '' })
    toast('Supplier added')

    await supabase.from('suppliers').insert({
      name: newSupplier.name,
      contact: newSupplier.contact,
      notes: newSupplier.notes,
      offerings: [],
    })
  }, [form, toast])

  const deleteSupplier = useCallback(async (id: string) => {
    if (!confirm('Delete this supplier?')) return
    setSuppliers(prev => prev.filter(s => s.id !== id))
    await supabase.from('suppliers').delete().eq('id', id)
    toast('Supplier deleted')
  }, [toast])

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
        title="Suppliers"
        subtitle="Manage your vendor relationships"
        actions={
          <Button variant="primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Supplier
          </Button>
        }
      />

      {suppliers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No suppliers yet"
          description="Add your suppliers and their offerings"
          action={{ label: 'Add Supplier', onClick: () => setShowAdd(true) }}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {suppliers.map(s => (
            <Card key={s.id} className="group">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-bark">{s.name}</h3>
                  {s.contact && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                      <Phone size={12} /> {s.contact}
                    </p>
                  )}
                  {s.notes && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                      <FileText size={12} /> {s.notes}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => deleteSupplier(s.id)}
                  className="opacity-0 group-hover:opacity-100 rounded p-1 text-sand hover:text-coral transition-all"
                  aria-label="Delete supplier"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {s.offerings.length > 0 && (
                <div className="mt-3 space-y-1 border-t border-sand/40 pt-3">
                  {s.offerings.map((o, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-bark">{o.name}</span>
                      <span className="font-semibold text-bark">{fmtCurrency(o.price)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Supplier" width="sm">
        <div className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Supplier name"
          />
          <Input
            label="Contact"
            value={form.contact}
            onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
            placeholder="Phone or email"
          />
          <Input
            label="Notes"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Optional notes"
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button variant="primary" onClick={addSupplier}>Add Supplier</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
