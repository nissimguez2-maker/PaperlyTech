import { Routes, Route } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { AppLayout } from '@/components/layout/app-layout'
import { LoginPage } from '@/pages/login'
import { DashboardPage } from '@/pages/dashboard'
import { QuotesPage } from '@/pages/quotes'
import { ProjectsPage } from '@/pages/projects'
import { ProjectDetailPage } from '@/pages/project-detail'
import { FinancePage } from '@/pages/finance'
import { ExpensesPage } from '@/pages/expenses'
import { CatalogPage } from '@/pages/catalog'
import { SuppliersPage } from '@/pages/suppliers'
import { SettingsPage } from '@/pages/settings'
import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
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
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="catalog" element={
          <CatalogPage
            categories={categories}
            articles={articles}
            onUpdateCategories={(cats: Category[]) => setCategories(cats)}
            onUpdateArticles={(arts: Article[]) => setArticles(arts)}
          />
        } />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  if (!isSupabaseConfigured) return <ConfigurationRequired />
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-cream">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-gold-dark border-t-transparent" />
      </div>
    )
  }
  if (!user) return <LoginPage />
  return <ProtectedRoutes />
}

function ConfigurationRequired() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream p-6">
      <div className="max-w-lg rounded-lg border border-gold-dark/30 bg-white p-8 shadow-sm">
        <h1 className="mb-3 text-2xl font-semibold text-ink">Paperly is not configured</h1>
        <p className="mb-4 text-sm text-muted">
          The Supabase credentials are missing, so the app cannot load. The deployment is missing
          two environment variables.
        </p>
        <ul className="mb-4 list-disc pl-5 text-sm text-ink">
          <li><code>VITE_SUPABASE_URL</code></li>
          <li><code>VITE_SUPABASE_ANON_KEY</code></li>
        </ul>
        <p className="text-sm text-muted">
          Add them in Netlify under <strong>Site settings → Environment variables</strong>, then
          trigger a new deploy.
        </p>
      </div>
    </div>
  )
}
