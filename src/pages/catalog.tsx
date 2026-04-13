import { useState, useCallback } from 'react'
import {
  Plus, ChevronRight, ChevronDown, Trash2,
  FolderPlus, Package,
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
  const [_editing, _setEditing] = useState<{ id: string; type: 'cat' | 'art'; name: string; price?: string } | null>(null)

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

  const topLevelCats = categories.filter(c => !c.parent_id)

  function renderCategory(cat: Category, level: number) {
    const subCats = categories.filter(c => c.parent_id === cat.id)
    const catArticles = articles.filter(a => a.category_id === cat.id)
    const isExpanded = expanded.has(cat.id)
    const hasChildren = subCats.length > 0 || catArticles.length > 0

    return (
      <div key={cat.id}>
        <div
          className={cn(
            'group flex items-center gap-2 rounded-xl px-3 py-2.5 hover:bg-cream transition-colors cursor-pointer',
          )}
          style={{ paddingLeft: `${12 + level * 24}px` }}
          onClick={() => toggle(cat.id)}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown size={14} className="text-muted" /> : <ChevronRight size={14} className="text-muted" />
          ) : (
            <div className="w-3.5" />
          )}

          <span className={cn('flex-1 text-sm', level === 0 ? 'font-semibold text-bark' : 'font-medium text-bark')}>
            {cat.name}
          </span>

          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
        </div>

        {isExpanded && (
          <>
            {subCats.map(sub => renderCategory(sub, level + 1))}
            {catArticles.map(art => (
              <div
                key={art.id}
                className="group flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-cream transition-colors"
                style={{ paddingLeft: `${36 + level * 24}px` }}
              >
                <span className="flex-1 text-xs text-muted">{art.name}</span>
                <span className="text-xs font-semibold text-bark">{fmtCurrency(art.price)}</span>
                <button
                  onClick={() => deleteArticle(art.id)}
                  className="opacity-0 group-hover:opacity-100 rounded p-1 text-sand hover:text-coral transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
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
