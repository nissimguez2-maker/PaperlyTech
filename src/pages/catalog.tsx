import { useState, useCallback } from 'react'
import {
  Plus, ChevronRight, ChevronDown, Trash2,
  FolderPlus, Package, Pencil, Check, X,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/toast'
import { fmtCurrency, cn, uid } from '@/lib/utils'
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

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const addTopCategory = useCallback(() => {
    const name = prompt('Category name:')
    if (!name?.trim()) return
    onUpdateCategories([...categories, { id: uid(), name: name.trim(), parent_id: null }])
    toast('Category added')
  }, [categories, onUpdateCategories, toast])

  const addSubCategory = useCallback((parentId: string) => {
    const name = prompt('Sub-category name:')
    if (!name?.trim()) return
    onUpdateCategories([...categories, { id: uid(), name: name.trim(), parent_id: parentId }])
    toast('Sub-category added')
  }, [categories, onUpdateCategories, toast])

  const addArticle = useCallback((catId: string) => {
    const name = prompt('Article name:')
    if (!name?.trim()) return
    const price = prompt('Price:')
    onUpdateArticles([...articles, { id: uid(), category_id: catId, name: name.trim(), price: parseFloat(price ?? '0') || 0, note: null }])
    toast('Article added')
  }, [articles, onUpdateArticles, toast])

  const deleteCategory = useCallback((id: string) => {
    if (!confirm('Delete this category and all its contents?')) return
    const desc = getAllDescendants(id, categories)
    onUpdateCategories(categories.filter(c => c.id !== id && !desc.includes(c.id)))
    onUpdateArticles(articles.filter(a => a.category_id !== id && !desc.includes(a.category_id)))
    toast('Category deleted')
  }, [categories, articles, onUpdateCategories, onUpdateArticles, toast])

  const deleteArticle = useCallback((id: string) => {
    onUpdateArticles(articles.filter(a => a.id !== id))
    toast('Article deleted')
  }, [articles, onUpdateArticles, toast])

  const saveCatEdit = useCallback(() => {
    if (!editingCat || !editingCat.name.trim()) return
    onUpdateCategories(categories.map(c => c.id === editingCat.id ? { ...c, name: editingCat.name.trim() } : c))
    setEditingCat(null)
    toast('Category updated')
  }, [editingCat, categories, onUpdateCategories, toast])

  const saveArtEdit = useCallback(() => {
    if (!editingArt || !editingArt.name.trim()) return
    onUpdateArticles(articles.map(a => a.id === editingArt.id ? { ...a, name: editingArt.name.trim(), price: parseFloat(editingArt.price) || 0 } : a))
    setEditingArt(null)
    toast('Article updated')
  }, [editingArt, articles, onUpdateArticles, toast])

  const topLevelCats = categories.filter(c => !c.parent_id)

  function renderCategory(cat: Category, level: number) {
    const subCats = categories.filter(c => c.parent_id === cat.id)
    const catArticles = articles.filter(a => a.category_id === cat.id)
    const isExpanded = expanded.has(cat.id)
    const hasChildren = subCats.length > 0 || catArticles.length > 0
    const isEditing = editingCat?.id === cat.id

    return (
      <div key={cat.id}>
        <div
          className={cn(
            'group flex items-center gap-2 rounded-xl px-3 py-2.5 hover:bg-cream transition-colors',
            !isEditing && 'cursor-pointer',
          )}
          style={{ paddingLeft: `${12 + level * 24}px` }}
          onClick={() => !isEditing && toggle(cat.id)}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown size={14} className="text-muted" /> : <ChevronRight size={14} className="text-muted" />
          ) : (
            <div className="w-3.5" />
          )}

          {isEditing ? (
            <div className="flex flex-1 items-center gap-2" onClick={e => e.stopPropagation()}>
              <input
                autoFocus
                value={editingCat.name}
                onChange={e => setEditingCat({ ...editingCat, name: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') saveCatEdit(); if (e.key === 'Escape') setEditingCat(null) }}
                className="flex-1 rounded border border-gold bg-white px-2 py-1 text-sm focus:border-gold-dark focus:outline-none"
              />
              <button onClick={saveCatEdit} className="rounded p-1 text-forest hover:bg-forest-bg"><Check size={14} /></button>
              <button onClick={() => setEditingCat(null)} className="rounded p-1 text-coral hover:bg-coral-bg"><X size={14} /></button>
            </div>
          ) : (
            <>
              <span className={cn('flex-1 text-sm', level === 0 ? 'font-semibold text-bark' : 'font-medium text-bark')}>
                {cat.name}
              </span>

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={e => { e.stopPropagation(); setEditingCat({ id: cat.id, name: cat.name }) }}
                  className="rounded p-1 text-sand hover:text-gold-dark"
                  title="Edit category"
                >
                  <Pencil size={14} />
                </button>
                {level < 2 && (
                  <button
                    onClick={e => { e.stopPropagation(); addSubCategory(cat.id) }}
                    className="rounded p-1 text-sand hover:text-navy"
                    title="Add sub-category"
                  >
                    <FolderPlus size={14} />
                  </button>
                )}
                <button
                  onClick={e => { e.stopPropagation(); addArticle(cat.id) }}
                  className="rounded p-1 text-sand hover:text-forest"
                  title="Add article"
                >
                  <Package size={14} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); deleteCategory(cat.id) }}
                  className="rounded p-1 text-sand hover:text-coral"
                  title="Delete category"
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
              const isArtEditing = editingArt?.id === art.id
              return (
                <div
                  key={art.id}
                  className="group flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-cream transition-colors"
                  style={{ paddingLeft: `${36 + level * 24}px` }}
                >
                  {isArtEditing ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        autoFocus
                        value={editingArt.name}
                        onChange={e => setEditingArt({ ...editingArt, name: e.target.value })}
                        onKeyDown={e => { if (e.key === 'Enter') saveArtEdit(); if (e.key === 'Escape') setEditingArt(null) }}
                        className="flex-1 rounded border border-gold bg-white px-2 py-1 text-xs focus:border-gold-dark focus:outline-none"
                        placeholder="Article name"
                      />
                      <input
                        value={editingArt.price}
                        onChange={e => setEditingArt({ ...editingArt, price: e.target.value })}
                        onKeyDown={e => { if (e.key === 'Enter') saveArtEdit(); if (e.key === 'Escape') setEditingArt(null) }}
                        className="w-20 rounded border border-gold bg-white px-2 py-1 text-xs text-right focus:border-gold-dark focus:outline-none"
                        placeholder="Price"
                        type="number"
                        step="0.01"
                      />
                      <button onClick={saveArtEdit} className="rounded p-1 text-forest hover:bg-forest-bg"><Check size={12} /></button>
                      <button onClick={() => setEditingArt(null)} className="rounded p-1 text-coral hover:bg-coral-bg"><X size={12} /></button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 text-xs text-muted">{art.name}</span>
                      <span className="text-xs font-semibold text-bark">{fmtCurrency(art.price)}</span>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => setEditingArt({ id: art.id, name: art.name, price: String(art.price) })}
                          className="rounded p-1 text-sand hover:text-gold-dark"
                          title="Edit article"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => deleteArticle(art.id)}
                          className="rounded p-1 text-sand hover:text-coral"
                          title="Delete article"
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
        title="Catalog"
        subtitle="Manage your article pricing"
        actions={
          <Button variant="primary" onClick={addTopCategory}>
            <Plus size={16} /> Add Category
          </Button>
        }
      />

      {topLevelCats.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Empty catalog"
          description="Add categories and articles to build your pricing catalog"
          action={{ label: 'Add Category', onClick: addTopCategory }}
        />
      ) : (
        <Card>
          {topLevelCats.map(cat => renderCategory(cat, 0))}
        </Card>
      )}
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
