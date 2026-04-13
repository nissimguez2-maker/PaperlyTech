import { useEffect, useState, useCallback } from 'react'
import {
  CheckCircle2, Circle, Plus, Trash2, Pencil, Check, X,
  Users, CalendarDays,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { fmtDate, cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Task } from '@/types/database'

interface TaskWithClient extends Task {
  clientName: string
  projectName: string
}

type SortMode = 'client' | 'date'

export function TasksPage() {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<TaskWithClient[]>([])
  const [loading, setLoading] = useState(true)
  const [sortMode, setSortMode] = useState<SortMode>('client')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDate, setEditDate] = useState('')
  const [addingGroup, setAddingGroup] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newProjectId, setNewProjectId] = useState('')
  const [projects, setProjects] = useState<{ id: string; name: string; clientName: string; delivery_date: string | null }[]>([])
  const [showAddGlobal, setShowAddGlobal] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*, project:projects(name, delivery_date, client:clients(name))')
      .order('completed')
      .order('due_date', { ascending: true, nullsFirst: false })

    const mapped = (data ?? []).map((t: Record<string, unknown>) => {
      const proj = t.project as { name: string; delivery_date: string | null; client: { name: string } | null } | null
      return {
        ...t,
        clientName: proj?.client?.name ?? 'No client',
        projectName: proj?.name ?? 'No project',
        project: undefined,
      } as unknown as TaskWithClient
    })

    setTasks(mapped)

    // Load projects for the add-task dropdown
    const { data: projs } = await supabase
      .from('projects')
      .select('id, name, delivery_date, client:clients(name)')
      .order('name')
    setProjects((projs ?? []).map((p: Record<string, unknown>) => ({
      id: p.id as string,
      name: p.name as string,
      clientName: ((p.client as { name: string } | null)?.name) ?? '',
      delivery_date: p.delivery_date as string | null,
    })))

    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const toggleDone = async (task: TaskWithClient) => {
    const newVal = !task.completed
    await supabase.from('tasks').update({ completed: newVal }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: newVal } : t))
    toast(newVal ? 'Marked done' : 'Marked undone')
  }

  const startEdit = (task: TaskWithClient) => {
    setEditingId(task.id)
    setEditTitle(task.title)
    setEditDate(task.due_date ?? '')
  }

  const saveEdit = async () => {
    if (!editingId || !editTitle.trim()) return
    await supabase.from('tasks').update({ title: editTitle.trim(), due_date: editDate || null }).eq('id', editingId)
    setTasks(prev => prev.map(t => t.id === editingId ? { ...t, title: editTitle.trim(), due_date: editDate || null } : t))
    setEditingId(null)
    toast('Task updated')
  }

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
    toast('Task deleted')
  }

  const addTask = async (projectId?: string, groupDate?: string) => {
    if (!newTitle.trim()) return
    const pid = projectId || newProjectId || null
    const proj = projects.find(p => p.id === pid)
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        project_id: pid,
        title: newTitle.trim(),
        completed: false,
        due_date: newDate || groupDate || (proj?.delivery_date) || null,
        priority: 'medium',
      })
      .select('*')
      .single()

    if (error || !data) { toast('Failed to add task', 'error'); return }

    setTasks(prev => [...prev, {
      ...data,
      clientName: proj?.clientName ?? 'No client',
      projectName: proj?.name ?? 'No project',
    } as TaskWithClient])

    setNewTitle('')
    setNewDate('')
    setNewProjectId('')
    setAddingGroup(null)
    setShowAddGlobal(false)
    toast('Task added')
  }

  // ── Grouping logic ──
  const activeTasks = tasks.filter(t => !t.completed)
  const doneTasks = tasks.filter(t => t.completed)

  type Group = { key: string; label: string; tasks: TaskWithClient[]; projectId?: string; date?: string }

  const groups: Group[] = []

  if (sortMode === 'client') {
    const byClient: Record<string, TaskWithClient[]> = {}
    activeTasks.forEach(t => {
      const k = t.clientName
      if (!byClient[k]) byClient[k] = []
      byClient[k]!.push(t)
    })
    Object.keys(byClient).sort((a, b) => a.localeCompare(b)).forEach(k => {
      const clientTasks = byClient[k]!
      // Find a project ID for this client group (for adding tasks)
      const pid = clientTasks[0]?.project_id ?? undefined
      groups.push({ key: k, label: k, tasks: clientTasks, projectId: pid ?? undefined })
    })
  } else {
    const byDate: Record<string, TaskWithClient[]> = {}
    activeTasks.forEach(t => {
      const k = t.due_date ?? 'No date'
      if (!byDate[k]) byDate[k] = []
      byDate[k]!.push(t)
    })
    const sorted = Object.keys(byDate).sort((a, b) => {
      if (a === 'No date') return 1
      if (b === 'No date') return -1
      return a.localeCompare(b)
    })
    sorted.forEach(k => {
      groups.push({ key: k, label: k === 'No date' ? 'No due date' : fmtDate(k), tasks: byDate[k]!, date: k === 'No date' ? undefined : k })
    })
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-dark border-t-transparent" /></div>

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle={`${activeTasks.length} active, ${doneTasks.length} done`}
        actions={
          <Button variant="primary" onClick={() => setShowAddGlobal(true)}><Plus size={16} /> Add Task</Button>
        }
      />

      {/* Sort toggle */}
      <div className="mb-6 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted mr-2">Sort by</span>
        <button
          onClick={() => setSortMode('client')}
          className={cn('flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
            sortMode === 'client' ? 'bg-gold-dark text-white' : 'bg-white border border-sand text-muted hover:bg-cream')}
        >
          <Users size={14} /> By Client
        </button>
        <button
          onClick={() => setSortMode('date')}
          className={cn('flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
            sortMode === 'date' ? 'bg-gold-dark text-white' : 'bg-white border border-sand text-muted hover:bg-cream')}
        >
          <CalendarDays size={14} /> By Due Date
        </button>
      </div>

      {/* Global add task form */}
      {showAddGlobal && (
        <Card className="mb-6">
          <h4 className="text-sm font-semibold text-bark mb-3">New Task</h4>
          <div className="grid grid-cols-[1fr_180px_180px_auto] gap-3 items-end">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">Title</label>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask()}
                className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm focus:border-gold-dark focus:outline-none" placeholder="Task title..." autoFocus />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">Project</label>
              <select value={newProjectId} onChange={e => setNewProjectId(e.target.value)}
                className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm focus:border-gold-dark focus:outline-none">
                <option value="">No project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name} - {p.clientName}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">Due Date</label>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm focus:border-gold-dark focus:outline-none" />
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={() => addTask()}>Add</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAddGlobal(false)}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {groups.length === 0 && doneTasks.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No tasks yet"
          description="Tasks are created automatically when a project is confirmed, or add them manually"
          action={{ label: 'Add Task', onClick: () => setShowAddGlobal(true) }}
        />
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group.key}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-bark">{group.label}</h3>
                <button
                  onClick={() => { setAddingGroup(group.key); setNewTitle(''); setNewDate('') }}
                  className="text-sand hover:text-gold-dark transition-colors" title="Add task to group"
                ><Plus size={16} /></button>
              </div>

              <Card>
                <div className="space-y-0.5">
                  {group.tasks.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      sortMode={sortMode}
                      editing={editingId === task.id}
                      editTitle={editTitle}
                      editDate={editDate}
                      onEditTitleChange={setEditTitle}
                      onEditDateChange={setEditDate}
                      onToggle={() => toggleDone(task)}
                      onStartEdit={() => startEdit(task)}
                      onSaveEdit={saveEdit}
                      onCancelEdit={() => setEditingId(null)}
                      onDelete={() => deleteTask(task.id)}
                    />
                  ))}
                </div>

                {/* Inline add for this group */}
                {addingGroup === group.key && (
                  <div className="mt-2 flex items-center gap-2 pt-2 border-t border-sand/30">
                    <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addTask(group.projectId, group.date)}
                      className="flex-1 rounded border border-gold bg-white px-2 py-1.5 text-xs focus:outline-none"
                      placeholder="New task..." autoFocus />
                    <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                      className="rounded border border-gold bg-white px-2 py-1.5 text-xs focus:outline-none w-32" />
                    <button onClick={() => addTask(group.projectId, group.date)} className="rounded p-1 text-forest hover:bg-forest-bg"><Check size={14} /></button>
                    <button onClick={() => setAddingGroup(null)} className="rounded p-1 text-coral hover:bg-coral-bg"><X size={14} /></button>
                  </div>
                )}
              </Card>
            </div>
          ))}

          {/* Completed section */}
          {doneTasks.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-muted">Completed ({doneTasks.length})</h3>
              <Card>
                <div className="space-y-0.5">
                  {doneTasks.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      sortMode={sortMode}
                      editing={editingId === task.id}
                      editTitle={editTitle}
                      editDate={editDate}
                      onEditTitleChange={setEditTitle}
                      onEditDateChange={setEditDate}
                      onToggle={() => toggleDone(task)}
                      onStartEdit={() => startEdit(task)}
                      onSaveEdit={saveEdit}
                      onCancelEdit={() => setEditingId(null)}
                      onDelete={() => deleteTask(task.id)}
                    />
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TaskRow({ task, sortMode, editing, editTitle, editDate,
  onEditTitleChange, onEditDateChange,
  onToggle, onStartEdit, onSaveEdit, onCancelEdit, onDelete,
}: {
  task: TaskWithClient; sortMode: SortMode; editing: boolean
  editTitle: string; editDate: string
  onEditTitleChange: (v: string) => void; onEditDateChange: (v: string) => void
  onToggle: () => void; onStartEdit: () => void; onSaveEdit: () => void
  onCancelEdit: () => void; onDelete: () => void
}) {
  if (editing) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-cream/50 px-2 py-2">
        <input value={editTitle} onChange={e => onEditTitleChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSaveEdit()}
          className="flex-1 rounded border border-gold bg-white px-2 py-1 text-xs focus:outline-none" autoFocus />
        <input type="date" value={editDate} onChange={e => onEditDateChange(e.target.value)}
          className="rounded border border-gold bg-white px-2 py-1 text-xs focus:outline-none w-32" />
        <button onClick={onSaveEdit} className="rounded p-1 text-forest hover:bg-forest-bg"><Check size={14} /></button>
        <button onClick={onCancelEdit} className="rounded p-1 text-coral hover:bg-coral-bg"><X size={14} /></button>
      </div>
    )
  }

  // Label: "title" when sorted by client, "title - ClientName" when sorted by date
  const label = sortMode === 'date' ? `${task.title} - ${task.clientName}` : task.title

  return (
    <div className={cn(
      'group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-cream transition-colors',
      task.completed && 'opacity-50',
    )}>
      <button onClick={onToggle} className="shrink-0">
        {task.completed
          ? <CheckCircle2 size={18} className="text-forest" />
          : <Circle size={18} className="text-sand hover:text-gold-dark transition-colors" />
        }
      </button>

      <span className={cn('flex-1 text-sm', task.completed ? 'line-through text-muted' : 'text-bark')}>
        {label}
      </span>

      {task.due_date && sortMode === 'client' && (
        <span className="text-[10px] text-muted flex items-center gap-1">
          <CalendarDays size={11} /> {fmtDate(task.due_date)}
        </span>
      )}

      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
        <button onClick={onStartEdit} className="rounded p-1 text-sand hover:text-gold-dark"><Pencil size={12} /></button>
        <button onClick={onDelete} className="rounded p-1 text-sand hover:text-coral"><Trash2 size={12} /></button>
      </div>
    </div>
  )
}
