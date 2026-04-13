import { useEffect, useState, useCallback, useMemo } from 'react'
import { Plus, CheckCircle, Circle, Trash2, Calendar, Users, Clock, Pencil, Check, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { fmtDate, cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Task } from '@/types/database'

type SortMode = 'client' | 'date'

interface TaskWithClient extends Task {
  clientName: string
  clientId: string | null
}

interface ClientOption {
  clientId: string
  clientName: string
  projectId: string
  projectName: string
  delivery_date: string | null
}

export function TasksPage() {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<TaskWithClient[]>([])
  const [loading, setLoading] = useState(true)
  const [sortMode, setSortMode] = useState<SortMode>('client')
  const [showCompleted, setShowCompleted] = useState(false)

  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newClientId, setNewClientId] = useState('')
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDueDate, setEditDueDate] = useState('')

  useEffect(() => {
    async function load() {
      const { data: rawTasks } = await supabase
        .from('tasks')
        .select('*, project:projects(client_id, client:clients(name, id))')
        .order('created_at', { ascending: false })

      const enriched: TaskWithClient[] = (rawTasks ?? []).map(t => {
        const project = t.project as { client_id: string; client: { name: string; id: string } | null } | null
        return {
          ...t,
          clientName: project?.client?.name ?? 'Unassigned',
          clientId: project?.client?.id ?? null,
          project: undefined,
        } as TaskWithClient
      })
      setTasks(enriched)

      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, client_id, delivery_date, pipeline_stage, client:clients(name)')
        .neq('pipeline_stage', 'paid')
        .order('created_at', { ascending: false })

      const seen = new Set<string>()
      const opts: ClientOption[] = []
      ;(projects ?? []).forEach(p => {
        const cl = p.client as { name: string } | { name: string }[] | null
        const clientName = Array.isArray(cl) ? (cl[0]?.name ?? 'Unknown') : (cl?.name ?? 'Unknown')
        if (!seen.has(p.client_id)) {
          seen.add(p.client_id)
          opts.push({
            clientId: p.client_id,
            clientName,
            projectId: p.id,
            projectName: p.name,
            delivery_date: p.delivery_date,
          })
        }
      })
      setClientOptions(opts)
      setLoading(false)
    }
    load()
  }, [])

  const toggleTask = useCallback(async (id: string) => {
    let newCompleted = false
    setTasks(prev => prev.map(t => {
      if (t.id === id) { newCompleted = !t.completed; return { ...t, completed: newCompleted } }
      return t
    }))
    const { error } = await supabase.from('tasks').update({ completed: newCompleted }).eq('id', id)
    if (error) toast('Failed to update task', 'error')
  }, [toast])

  const deleteTask = useCallback(async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) toast('Failed to delete task', 'error')
    else toast('Task deleted')
  }, [toast])

  const addTask = useCallback(async () => {
    if (!newTitle.trim()) return
    const selectedClient = clientOptions.find(c => c.clientId === newClientId)
    const projectId = selectedClient?.projectId ?? null

    const { data, error } = await supabase.from('tasks').insert({
      project_id: projectId,
      title: newTitle.trim(),
      completed: false,
      due_date: newDueDate || null,
      priority: 'medium',
    }).select('*').single()

    if (error || !data) {
      toast('Failed to save task', 'error')
      return
    }

    const newTask: TaskWithClient = {
      ...(data as Task),
      clientName: selectedClient?.clientName ?? 'Unassigned',
      clientId: selectedClient?.clientId ?? null,
    }

    setTasks(prev => [newTask, ...prev])
    setNewTitle('')
    setNewDueDate('')
    setNewClientId('')
    setShowAddForm(false)
    toast('Task added')
  }, [newTitle, newDueDate, newClientId, clientOptions, toast])

  const startEdit = useCallback((task: TaskWithClient) => {
    setEditingId(task.id)
    setEditTitle(task.title)
    setEditDueDate(task.due_date ?? '')
  }, [])

  const saveEdit = useCallback(async () => {
    if (!editingId || !editTitle.trim()) return
    setTasks(prev => prev.map(t =>
      t.id === editingId ? { ...t, title: editTitle.trim(), due_date: editDueDate || null } : t
    ))
    const { error } = await supabase.from('tasks').update({
      title: editTitle.trim(),
      due_date: editDueDate || null,
    }).eq('id', editingId)
    if (error) toast('Failed to update task', 'error')
    setEditingId(null)
  }, [editingId, editTitle, editDueDate, toast])

  const pending = useMemo(() => tasks.filter(t => !t.completed), [tasks])
  const completed = useMemo(() => tasks.filter(t => t.completed), [tasks])

  const groupedByClient = useMemo(() => {
    if (sortMode !== 'client') return null
    const groups: Record<string, TaskWithClient[]> = {}
    pending.forEach(t => {
      const key = t.clientName
      if (!groups[key]) groups[key] = []
      groups[key].push(t)
    })
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [pending, sortMode])

  const sortedByDate = useMemo(() => {
    if (sortMode !== 'date') return null
    return [...pending].sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return a.due_date.localeCompare(b.due_date)
    })
  }, [pending, sortMode])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-dark border-t-transparent" />
      </div>
    )
  }

  const renderTask = (t: TaskWithClient) => {
    const isEditing = editingId === t.id

    return (
      <div
        key={t.id}
        className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-cream transition-colors"
      >
        <button
          onClick={() => toggleTask(t.id)}
          className={cn('transition-colors', t.completed ? 'text-forest' : 'text-sand hover:text-forest')}
          aria-label={t.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {t.completed ? <CheckCircle size={20} /> : <Circle size={20} />}
        </button>

        {isEditing ? (
          <div className="flex flex-1 items-center gap-2">
            <input
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }}
              className="flex-1 rounded border border-gold-dark bg-white px-2 py-1 text-sm focus:outline-none"
              autoFocus
            />
            <input
              type="date"
              value={editDueDate}
              onChange={e => setEditDueDate(e.target.value)}
              className="rounded border border-sand bg-white px-2 py-1 text-xs focus:outline-none"
            />
            <button onClick={saveEdit} className="text-forest hover:text-forest/80"><Check size={16} /></button>
            <button onClick={() => setEditingId(null)} className="text-sand hover:text-coral"><X size={16} /></button>
          </div>
        ) : (
          <div className="flex-1">
            <p className={cn('text-sm', t.completed ? 'text-muted line-through' : 'text-bark')}>
              {t.title}
              {sortMode === 'date' && t.clientName !== 'Unassigned' && (
                <span className="ml-2 text-xs text-muted">- {t.clientName}</span>
              )}
            </p>
            {t.due_date && (
              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted">
                <Calendar size={10} /> {fmtDate(t.due_date)}
              </p>
            )}
          </div>
        )}

        {!isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            <button
              onClick={() => startEdit(t)}
              className="text-sand hover:text-bark transition-colors"
              aria-label="Edit task"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => deleteTask(t.id)}
              className="text-sand hover:text-coral transition-colors"
              aria-label="Delete task"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle={pending.length + ' pending'}
        actions={
          <Button variant="primary" onClick={() => setShowAddForm(true)}>
            <Plus size={16} /> Add Task
          </Button>
        }
      />

      <div className="mb-6 flex items-center gap-2">
        <span className="text-xs text-muted">Sort by:</span>
        <div className="flex rounded-xl border border-sand overflow-hidden">
          <button
            onClick={() => setSortMode('client')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
              sortMode === 'client' ? 'bg-gold-dark text-white' : 'text-muted hover:bg-cream',
            )}
          >
            <Users size={12} /> By Client
          </button>
          <button
            onClick={() => setSortMode('date')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
              sortMode === 'date' ? 'bg-gold-dark text-white' : 'text-muted hover:bg-cream',
            )}
          >
            <Clock size={12} /> By Due Date
          </button>
        </div>
      </div>

      {showAddForm && (
        <Card className="mb-6">
          <div className="space-y-3">
            <Input
              label="Task Title"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="What needs to be done?"
              onKeyDown={e => e.key === 'Enter' && addTask()}
              autoFocus
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted">Client</label>
                <select
                  value={newClientId}
                  onChange={e => setNewClientId(e.target.value)}
                  className="w-full rounded-xl border border-sand bg-white px-3 py-2.5 text-sm focus:border-gold-dark focus:outline-none"
                >
                  <option value="">No client</option>
                  {clientOptions.map(c => (
                    <option key={c.clientId} value={c.clientId}>{c.clientName}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Due Date"
                type="date"
                value={newDueDate}
                onChange={e => setNewDueDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setShowAddForm(false); setNewTitle(''); setNewDueDate(''); setNewClientId('') }}>
                Cancel
              </Button>
              <Button variant="primary" onClick={addTask} disabled={!newTitle.trim()}>
                <Plus size={14} /> Add Task
              </Button>
            </div>
          </div>
        </Card>
      )}

      {pending.length === 0 && completed.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title="No tasks yet"
          description="Tasks are auto-created when you confirm a project, or add one manually above"
        />
      ) : (
        <div className="space-y-6">
          {sortMode === 'client' && groupedByClient ? (
            groupedByClient.map(([clientName, clientTasks]) => (
              <Card key={clientName}>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle>{clientName}</CardTitle>
                  <span className="text-xs text-muted">{clientTasks.length} tasks</span>
                </div>
                <div className="space-y-1">
                  {clientTasks.map(renderTask)}
                </div>
              </Card>
            ))
          ) : sortedByDate ? (
            <Card>
              <CardTitle>Pending ({pending.length})</CardTitle>
              <div className="mt-3 space-y-1">
                {sortedByDate.map(renderTask)}
              </div>
            </Card>
          ) : null}

          {completed.length > 0 && (
            <Card>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex w-full items-center justify-between"
              >
                <CardTitle>Completed ({completed.length})</CardTitle>
                <span className="text-xs text-muted">{showCompleted ? 'Hide' : 'Show'}</span>
              </button>

              {showCompleted && (
                <div className="mt-3 space-y-1">
                  {completed.map(renderTask)}
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
