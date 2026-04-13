import { Routes, Route } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { AppLayout } from '@/components/layout/app-layout'
import { LoginPage } from '@/pages/login'
import { DashboardPage } from '@/pages/dashboard'
import { QuotesPage } from '@/pages/quotes'
import { ProjectsPage } from '@/pages/projects'
import { ProjectDetailPage } from '@/pages/project-detail'
import { FinancePage } from '@/pages/finance'
import { TasksPage } from '@/pages/tasks'
import { ExpensesPage } from '@/pages/expenses'
import { CatalogPage } from '@/pages/catalog'
import { SuppliersPage } from '@/pages/suppliers'
import { SettingsPage } from '@/pages/settings'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Category, Article } from '@/types/database'

function ProtectedRoutes() {
  const [categories, setCategories] = useState<Category[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCatalog() {
      const [catRes, artRes] = await Promise.all([
        supabase.from('categories').select('*'),
        supabase.from('articles').select('*'),
      ])
      setCategories(catRes.data ?? [])
      setArticles(artRes.data ?? [])
      setLoading(false)
    }
    loadCatalog()
  }, [])

  const updateCategories = async (cats: Category[]) => {
    setCategories(cats)
  }

  const updateArticles = async (arts: Article[]) => {
    setArticles(arts)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-cream">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-gold-dark border-t-transparent" />
          <p className="text-sm text-muted">Loading Paperly...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="quotes" element={<QuotesPage categories={categories} articles={articles} />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="catalog" element={
          <CatalogPage
            categories={categories}
            articles={articles}
            onUpdateCategories={updateCategories}
            onUpdateArticles={updateArticles}
          />
        } />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-cream">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-gold-dark border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return <ProtectedRoutes />
}
