import { useEffect, useState, useCallback } from 'react'
import { Trash2, Users, FolderKanban, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { fmtDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface ClientRow {
  id: string
  name: string
  created_at: string
  projectCount: number
  latestProject: string | null
}

export function ClientsPage() {
  const { toast } = useToast()
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<ClientRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: rawClients } = await supabase
        .from('clients')
        .select('id, name, created_at, projects(id, name)')
        .order('name')

      const enriched: ClientRow[] = (rawClients ?? []).map(c => {
        const projects = (c.projects as { id: string; name: string }[] | null) ?? []
        return {
          id: c.id,
          name: c.name,
          created_at: c.created_at,
          projectCount: projects.length,
          latestProject: projects.length > 0 ? projects[projects.length - 1]!.name : null,
        }
      })
      setClients(enriched)
      setLoading(false)
    }
    load()
  }, [])

  const deleteClient = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)

    try {
      const clientId = deleteTarget.id

      // Get all project IDs for this client
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('client_id', clientId)

      const projectIds = (projects ?? []).map(p => p.id)

      if (projectIds.length > 0) {
        // Get all quote IDs for these projects
        const { data: quotes } = await supabase
          .from('quotes')
          .select('id')
          .in('project_id', projectIds)

        const quoteIds = (quotes ?? []).map(q => q.id)

        // Delete quote items
        if (quoteIds.length > 0) {
          await supabase.from('quote_items').delete().in('quote_id', quoteIds)
        }

        // Delete quotes
        await supabase.from('quotes').delete().in('project_id', projectIds)

        // Delete tasks
        await supabase.from('tasks').delete().in('project_id', projectIds)

        // Delete payments
        await supabase.from('payments').delete().in('project_id', projectIds)

        // Delete projects
        await supabase.from('projects').delete().eq('client_id', clientId)
      }

      // Delete client
      const { error } = await supabase.from('clients').delete().eq('id', clientId)
      if (error) throw error

      setClients(prev => prev.filter(c => c.id !== clientId))
      setDeleteTarget(null)
      toast('Client and all related data deleted')
    } catch (err) {
      toast('Failed to delete: ' + (err instanceof Error ? err.message : 'unknown error'), 'error')
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, toast])

  const filtered = search.trim()
    ? clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : clients

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
        title="Clients"
        subtitle={clients.length + ' clients'}
      />

      <div className="mb-6">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clients..."
          className="w-full max-w-sm rounded-xl border border-sand bg-white px-4 py-2.5 text-sm focus:border-gold-dark focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? 'No clients found' : 'No clients yet'}
          description={search ? 'Try a different search' : 'Clients are created automatically when you save a quote'}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <Card key={c.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cream-dark text-gold-dark font-display font-bold text-lg">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-bark">{c.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <FolderKanban size={11} />
                        {c.projectCount} project{c.projectCount !== 1 ? 's' : ''}
                      </span>
                      <span>Added {fmtDate(c.created_at)}</span>
                      {c.latestProject && (
                        <span className="text-gold-dark">Latest: {c.latestProject}</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setDeleteTarget(c)}
                  className="rounded-lg p-2 text-sand hover:bg-coral/10 hover:text-coral transition-all"
                  aria-label="Delete client"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Delete Client"
        width="sm"
      >
        {deleteTarget && (
          <div>
            <div className="mb-4 flex items-start gap-3 rounded-xl bg-coral/5 p-4">
              <AlertTriangle size={20} className="mt-0.5 text-coral flex-shrink-0" />
              <div className="text-sm text-bark">
                <p className="font-semibold mb-1">This will permanently delete:</p>
                <p className="text-muted">
                  Client "{deleteTarget.name}" and all their projects
                  ({deleteTarget.projectCount}), quotes, tasks, and payments.
                  This cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={deleteClient}
                disabled={deleting}
                className="bg-coral hover:bg-coral/90"
              >
                {deleting ? 'Deleting...' : 'Delete Everything'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
