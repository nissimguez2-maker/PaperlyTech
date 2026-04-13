import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, Receipt } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { fmtCurrency, fmtDate, uid } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Expense } from '@/types/database'

const EXPENSE_CATEGORIES = [
  { value: 'materials', label: 'Materials' },
  { value: 'printing', label: 'Printing' },
  { value: 'shipping', label: 'Shipping' },
  { value: 'tools', label: 'Tools & Equipment' },
  { value: 'software', label: 'Software' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'other', label: 'Other' },
]

export function ExpensesPage() {
  const { toast } = useToast()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  // Form state
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    amount: '',
    category: 'materials',
  })

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false })
      setExpenses(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const addExpense = useCallback(async () => {
    if (!form.description.trim() || !form.amount) {
      toast('Fill in all fields', 'error')
      return
    }

    const newExpense: Expense = {
      id: uid(),
      date: form.date,
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      category: form.category,
      supplier_id: null,
      project_id: null,
      sumit_done: false,
      created_at: new Date().toISOString(),
    }

    setExpenses(prev => [newExpense, ...prev])
    setShowAdd(false)
    setForm({ date: new Date().toISOString().slice(0, 10), description: '', amount: '', category: 'materials' })
    toast('Expense added')

    await supabase.from('expenses').insert({
      date: newExpense.date,
      description: newExpense.description,
      amount: newExpense.amount,
      category: newExpense.category,
    })
  }, [form, toast])

  const deleteExpense = useCallback(async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id))
    await supabase.from('expenses').delete().eq('id', id)
    toast('Expense deleted')
  }, [toast])

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)

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
        title="Expenses"
        subtitle={`Total: ${fmtCurrency(totalExpenses)}`}
        actions={
          <Button variant="primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Expense
          </Button>
        }
      />

      {expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses yet"
          description="Track your business expenses to see profitability"
          action={{ label: 'Add Expense', onClick: () => setShowAdd(true) }}
        />
      ) : (
        <Card>
          <div className="mb-3 grid grid-cols-[110px_1fr_120px_100px_40px] gap-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted">
            <div>Date</div>
            <div>Description</div>
            <div>Category</div>
            <div className="text-right">Amount</div>
            <div />
          </div>

          <div className="space-y-1">
            {expenses.map(e => (
              <div
                key={e.id}
                className="group grid grid-cols-[110px_1fr_120px_100px_40px] items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-cream transition-colors"
              >
                <span className="text-xs text-muted">{fmtDate(e.date)}</span>
                <span className="text-sm text-bark">{e.description}</span>
                <span className="text-xs text-muted capitalize">{e.category}</span>
                <span className="text-right text-sm font-semibold text-coral">{fmtCurrency(e.amount)}</span>
                <button
                  onClick={() => deleteExpense(e.id)}
                  className="opacity-0 group-hover:opacity-100 text-sand hover:text-coral transition-all"
                  aria-label="Delete expense"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Add expense modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Expense" width="sm">
        <div className="space-y-4">
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          />
          <Input
            label="Description"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="What was this expense for?"
          />
          <Input
            label="Amount (₪)"
            type="number"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            placeholder="0"
          />
          <Select
            label="Category"
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            options={EXPENSE_CATEGORIES}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button variant="primary" onClick={addExpense}>Add Expense</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
