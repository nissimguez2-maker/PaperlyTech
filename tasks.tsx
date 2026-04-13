import { useEffect, useState, useCallback } from 'react'
import { Plus, CheckCircle, Circle, Trash2, Calendar } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { fmtDate, uid } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Task } from '@/types/database'

export function TasksPage() {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .order('completed', { ascending: true })
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
      setTasks(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const addTask = useCallback(async () => {
    if (!newTitle.trim()) return
    const newTask: Task = {
      id: uid(),
      project_id: null,
      title: newTitle.trim(),
      completed: false,
      due_date: null,
      priority: 'medium',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setTasks(prev => [newTask, ...prev])
    setNewTitle('')

    const { error } = await supabase.from('tasks').insert({
      title: newTask.title,
      completed: false,
      priority: 'medium',
    })
    if (error) toast('Failed to save task', 'error')
  }, [newTitle, toast])

  const toggleTask = useCallback(async (id: string) => {
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    ))
    const task = tasks.find(t => t.id === id)
    if (task) {
      await supabase.from('tasks').update({ completed: !task.completed }).eq('id', id)
    }
  }, [tasks])

  const deleteTask = useCallback(async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('tasks').delete().eq('id', id)
    toast('Task deleted')
  }, [toast])

  const pending = tasks.filter(t => !t.completed)
  const completed = tasks.filter(t => t.completed)

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-dark border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Tasks" subtitle={`${pending.length} pending`} />

      {/* Quick add */}
      <Card className="mb-6">
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Add a new task..."
              onKeyDown={e => e.key === 'Enter' && addTask()}
            />
          </div>
          <Button variant="primary" onClick={addTask} disabled={!newTitle.trim()}>
            <Plus size={16} /> Add
          </Button>
        </div>
      </Card>

      {/* Pending tasks */}
      {pending.length === 0 && completed.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title="No tasks yet"
          description="Add your first task above to get started"
        />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardTitle>Pending ({pending.length})</CardTitle>
            <div className="mt-3 space-y-1">
              {pending.map(t => (
                <div
                  key={t.id}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-cream transition-colors"
                >
                  <button
                    onClick={() => toggleTask(t.id)}
                    className="text-sand hover:text-forest transition-colors"
                    aria-label="Mark complete"
                  >
                    <Circle size={20} />
                  </button>
                  <div className="flex-1">
                    <p className="text-sm text-bark">{t.title}</p>
                    {t.due_date && (
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted">
                        <Calendar size={10} /> {fmtDate(t.due_date)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteTask(t.id)}
                    className="opacity-0 group-hover:opacity-100 text-sand hover:text-coral transition-all"
                    aria-label="Delete task"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Completed */}
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
                  {completed.map(t => (
                    <div
                      key={t.id}
                      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-cream transition-colors"
                    >
                      <button
                        onClick={() => toggleTask(t.id)}
                        className="text-forest"
                        aria-label="Mark incomplete"
                      >
                        <CheckCircle size={20} />
                      </button>
                      <p className="flex-1 text-sm text-muted line-through">{t.title}</p>
                      <button
                        onClick={() => deleteTask(t.id)}
                        className="opacity-0 group-hover:opacity-100 text-sand hover:text-coral transition-all"
                        aria-label="Delete task"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
