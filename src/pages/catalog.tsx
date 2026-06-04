import { useState, useCallback } from 'react'
import {
  Plus, ChevronRight, ChevronDown, Trash2,
  FolderPlus, Package, Pencil, Check, X,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { fmtCurrency, cn, safeFloat } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { Category, Article } from '@/types/database'

interface CatalogPageProps {
  categories: Category[]
  articles: Article[]
  onUpdateCategories: (cats: Category[]) => void
  onUpdateArticles: (arts: Article[]) => void
}

export function CatalogPage({ categories, articles, onUpdateCategories, onUpdateArticles }: CatalogPageProps) {
  const { toast } = useToast()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editingCat, setEditingCat] = useState<{ id: string; name: string } | null>(null)
  const [editingArt, setEditingArt] = useState<{ id: string; name: string; price: string } | null>(null)

  // Modale d'ajout de catégorie / sous-catégorie (parentId null => catégorie racine)
  const [catModal, setCatModal] = useState<{ parentId: string | null; name: string } | null>(null)
  // Modale d'ajout d'article (rattaché à une catégorie)
  const [artModal, setArtModal] = useState<{ catId: string; name: string; price: string } | null>(null)
  // Confirmation de suppression d'une catégorie
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null)

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const submitCategory = useCallback(async () => {
    if (!catModal || !catModal.name.trim()) return
    const parentId = catModal.parentId
    const { data, error } = await supabase.from('categories').insert({ name: catModal.name.trim(), parent_id: parentId }).select().single()
    if (error || !data) { toast('Échec de l’ajout de la catégorie : ' + (error?.message ?? 'inconnu'), 'error'); return }
    onUpdateCategories([...categories, data as Category])
    setCatModal(null)
    toast(parentId ? 'Sous-catégorie ajoutée' : 'Catégorie ajoutée')
  }, [catModal, categories, onUpdateCategories, toast])

  const submitArticle = useCallback(async () => {
    if (!artModal || !artModal.name.trim()) return
    const { data, error } = await supabase.from('articles').insert({ category_id: artModal.catId, name: artModal.name.trim(), price: safeFloat(artModal.price), note: null }).select().single()
    if (error || !data) { toast('Échec de l’ajout de l’article : ' + (error?.message ?? 'inconnu'), 'error'); return }
    onUpdateArticles([...articles, data as Article])
    setArtModal(null)
    toast('Article ajouté')
  }, [artModal, articles, onUpdateArticles, toast])

  const deleteCategory = useCallback(async (id: string) => {
    const desc = getAllDescendants(id, categories)
    const allIds = [id, ...desc]
    onUpdateCategories(categories.filter(c => !allIds.includes(c.id)))
    onUpdateArticles(articles.filter(a => !allIds.includes(a.category_id)))
    // Delete articles in these categories first, then categories
    await supabase.from('articles').delete().in('category_id', allIds)
    const { error } = await supabase.from('categories').delete().in('id', allIds)
    if (error) toast('Échec de la suppression : ' + error.message, 'error')
    else toast('Catégorie supprimée')
  }, [categories, articles, onUpdateCategories, onUpdateArticles, toast])

  const deleteArticle = useCallback(async (id: string) => {
    onUpdateArticles(articles.filter(a => a.id !== id))
    const { error } = await supabase.from('articles').delete().eq('id', id)
    if (error) toast('Échec de la suppression : ' + error.message, 'error')
    else toast('Article supprimé')
  }, [articles, onUpdateArticles, toast])

  const saveCatEdit = useCallback(async () => {
    if (!editingCat || !editingCat.name.trim()) return
    onUpdateCategories(categories.map(c => c.id === editingCat.id ? { ...c, name: editingCat.name.trim() } : c))
    const { error } = await supabase.from('categories').update({ name: editingCat.name.trim() }).eq('id', editingCat.id)
    if (error) toast('Échec de la mise à jour : ' + error.message, 'error')
    else toast('Catégorie mise à jour')
    setEditingCat(null)
  }, [editingCat, categories, onUpdateCategories, toast])

  const saveArtEdit = useCallback(async () => {
    if (!editingArt || !editingArt.name.trim()) return
    const newPrice = safeFloat(editingArt.price)
    onUpdateArticles(articles.map(a => a.id === editingArt.id ? { ...a, name: editingArt.name.trim(), price: newPrice } : a))
    const { error } = await supabase.from('articles').update({ name: editingArt.name.trim(), price: newPrice }).eq('id', editingArt.id)
    if (error) toast('Échec de la mise à jour : ' + error.message, 'error')
    else toast('Article mis à jour')
    setEditingArt(null)
  }, [editingArt, articles, onUpdateArticles, toast])

  const topLevelCats = categories.filter(c => !c.parent_id)

  function renderCategory(cat: Category, level: number) {
    const subCats = categories.filter(c => c.parent_id === cat.id)
    const catArticles = articles.filter(a => a.category_id === cat.id)
    const isExpanded = expanded.has(cat.id)
    const hasChildren = subCats.length > 0 || catArticles.length > 0
    const isEditingThis = editingCat?.id === cat.id

    return (
      <div key={cat.id}>
        <div
          className={cn(
            'group flex items-center gap-2 rounded-xl px-3 py-2.5 hover:bg-cream transition-colors cursor-pointer',
          )}
          style={{ paddingLeft: `${12 + level * 24}px` }}
          onClick={() => !isEditingThis && toggle(cat.id)}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown size={14} className="text-muted" /> : <ChevronRight size={14} className="text-muted" />
          ) : (
            <div className="w-3.5" />
          )}

          {isEditingThis ? (
            <div className="flex flex-1 items-center gap-2" onClick={e => e.stopPropagation()}>
              <input
                value={editingCat.name}
                onChange={e => setEditingCat({ ...editingCat, name: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') saveCatEdit(); if (e.key === 'Escape') setEditingCat(null) }}
                className="flex-1 rounded border border-gold-dark bg-white px-2 py-1 text-sm focus:outline-none"
                autoFocus
              />
              <button onClick={saveCatEdit} className="text-forest hover:text-forest/80"><Check size={14} /></button>
              <button onClick={() => setEditingCat(null)} className="text-sand hover:text-coral"><X size={14} /></button>
            </div>
          ) : (
            <>
              <span className={cn('flex-1 text-sm', level === 0 ? 'font-semibold text-bark' : 'font-medium text-bark')}>
                {cat.name}
              </span>

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={e => { e.stopPropagation(); setEditingCat({ id: cat.id, name: cat.name }) }}
                  className="rounded p-1 text-sand hover:text-bark"
                  title="Modifier la catégorie"
                >
                  <Pencil size={14} />
                </button>
                {level < 2 && (
                  <button
                    onClick={e => { e.stopPropagation(); setCatModal({ parentId: cat.id, name: '' }) }}
                    className="rounded p-1 text-sand hover:text-navy"
                    title="Ajouter une sous-catégorie"
                  >
                    <FolderPlus size={14} />
                  </button>
                )}
                <button
                  onClick={e => { e.stopPropagation(); setArtModal({ catId: cat.id, name: '', price: '' }) }}
                  className="rounded p-1 text-sand hover:text-forest"
                  title="Ajouter un article"
                >
                  <Package size={14} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setDeletingCatId(cat.id) }}
                  className="rounded p-1 text-sand hover:text-coral"
                  title="Supprimer la catégorie"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </>
          )}
        </div>

        {isExpanded && (
          <>
            {subCats.map(sub => renderCategory(sub, level + 1))}
            {catArticles.map(art => {
              const isEditingThisArt = editingArt?.id === art.id
              return (
                <div
                  key={art.id}
                  className="group flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-cream transition-colors"
                  style={{ paddingLeft: `${36 + level * 24}px` }}
                >
                  {isEditingThisArt ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        value={editingArt.name}
                        onChange={e => setEditingArt({ ...editingArt, name: e.target.value })}
                        onKeyDown={e => { if (e.key === 'Enter') saveArtEdit(); if (e.key === 'Escape') setEditingArt(null) }}
                        className="flex-1 rounded border border-gold-dark bg-white px-2 py-1 text-xs focus:outline-none"
                        autoFocus
                      />
                      <input
                        value={editingArt.price}
                        onChange={e => setEditingArt({ ...editingArt, price: e.target.value })}
                        onKeyDown={e => { if (e.key === 'Enter') saveArtEdit(); if (e.key === 'Escape') setEditingArt(null) }}
                        className="w-20 rounded border border-gold-dark bg-white px-2 py-1 text-xs text-right focus:outline-none"
                        type="number"
                        step="0.01"
                      />
                      <button onClick={saveArtEdit} className="text-forest hover:text-forest/80"><Check size={12} /></button>
                      <button onClick={() => setEditingArt(null)} className="text-sand hover:text-coral"><X size={12} /></button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 text-xs text-muted">{art.name}</span>
                      <span className="text-xs font-semibold text-bark">{fmtCurrency(art.price)}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => setEditingArt({ id: art.id, name: art.name, price: String(art.price) })}
                          className="rounded p-1 text-sand hover:text-bark"
                          title="Modifier l’article"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => deleteArticle(art.id)}
                          className="rounded p-1 text-sand hover:text-coral"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Catalogue"
        subtitle="Gérez les tarifs de vos articles"
        actions={
          <Button variant="primary" onClick={() => setCatModal({ parentId: null, name: '' })}>
            <Plus size={16} /> Ajouter une catégorie
          </Button>
        }
      />

      {topLevelCats.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Catalogue vide"
          description="Ajoutez des catégories et des articles pour construire votre catalogue de tarifs"
          action={{ label: 'Ajouter une catégorie', onClick: () => setCatModal({ parentId: null, name: '' }) }}
        />
      ) : (
        <Card>
          {topLevelCats.map(cat => renderCategory(cat, 0))}
        </Card>
      )}

      {/* Modale d'ajout de catégorie / sous-catégorie */}
      <Modal
        open={catModal !== null}
        onClose={() => setCatModal(null)}
        title={catModal?.parentId ? 'Nouvelle sous-catégorie' : 'Nouvelle catégorie'}
        width="sm"
      >
        <div className="space-y-4">
          <Input
            label="Nom"
            value={catModal?.name ?? ''}
            onChange={e => setCatModal(m => m && { ...m, name: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter') submitCategory() }}
            placeholder="Nom de la catégorie"
            autoFocus
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setCatModal(null)}>Annuler</Button>
            <Button variant="primary" onClick={submitCategory}>Ajouter</Button>
          </div>
        </div>
      </Modal>

      {/* Modale d'ajout d'article */}
      <Modal
        open={artModal !== null}
        onClose={() => setArtModal(null)}
        title="Nouvel article"
        width="sm"
      >
        <div className="space-y-4">
          <Input
            label="Nom"
            value={artModal?.name ?? ''}
            onChange={e => setArtModal(m => m && { ...m, name: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter') submitArticle() }}
            placeholder="Nom de l’article"
            autoFocus
          />
          <Input
            label="Prix (₪)"
            type="number"
            step="0.01"
            value={artModal?.price ?? ''}
            onChange={e => setArtModal(m => m && { ...m, price: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter') submitArticle() }}
            placeholder="0"
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setArtModal(null)}>Annuler</Button>
            <Button variant="primary" onClick={submitArticle}>Ajouter</Button>
          </div>
        </div>
      </Modal>

      {/* Confirmation de suppression de catégorie */}
      <ConfirmDialog
        open={deletingCatId !== null}
        onClose={() => setDeletingCatId(null)}
        onConfirm={() => { if (deletingCatId) deleteCategory(deletingCatId) }}
        title="Supprimer cette catégorie ?"
        message="Cette catégorie et tout son contenu seront supprimés."
        confirmLabel="Supprimer"
        danger
      />
    </div>
  )
}

function getAllDescendants(id: string, categories: Category[]): string[] {
  const children = categories.filter(c => c.parent_id === id)
  const result: string[] = []
  children.forEach(child => {
    result.push(child.id)
    result.push(...getAllDescendants(child.id, categories))
  })
  return result
}
