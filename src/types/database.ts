/** Supabase database types for Paperly */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id'>>
      }
      clients: {
        Row: Client
        Insert: Omit<Client, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Client, 'id'>>
      }
      projects: {
        Row: Project
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Project, 'id'>>
      }
      quotes: {
        Row: Quote
        Insert: Omit<Quote, 'id' | 'created_at'>
        Update: Partial<Omit<Quote, 'id'>>
      }
      quote_items: {
        Row: QuoteItem
        Insert: Omit<QuoteItem, 'id'>
        Update: Partial<Omit<QuoteItem, 'id'>>
      }
      payments: {
        Row: Payment
        Insert: Omit<Payment, 'id' | 'created_at'>
        Update: Partial<Omit<Payment, 'id'>>
      }
      expenses: {
        Row: Expense
        Insert: Omit<Expense, 'id' | 'created_at'>
        Update: Partial<Omit<Expense, 'id'>>
      }
      tasks: {
        Row: Task
        Insert: Omit<Task, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Task, 'id'>>
      }
      categories: {
        Row: Category
        Insert: Omit<Category, 'id'>
        Update: Partial<Omit<Category, 'id'>>
      }
      articles: {
        Row: Article
        Insert: Omit<Article, 'id'>
        Update: Partial<Omit<Article, 'id'>>
      }
      suppliers: {
        Row: Supplier
        Insert: Omit<Supplier, 'id' | 'created_at'>
        Update: Partial<Omit<Supplier, 'id'>>
      }
    }
  }
}

// Core Types

export interface Profile {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'member'
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type PipelineStage = 'lead' | 'quoted' | 'confirmed' | 'in_progress' | 'delivered' | 'paid'

export interface Project {
  id: string
  client_id: string
  name: string
  delivery_date: string | null
  event_date: string | null
  pipeline_stage: PipelineStage
  notes: string | null
  sumit_done: boolean
  created_at: string
  updated_at: string
  // Joined
  client?: Client
  quotes?: Quote[]
  payments?: Payment[]
}

export interface Quote {
  id: string
  project_id: string
  version: number
  subtotal: number
  discount_mode: 'pct' | 'fixed'
  discount_value: number
  total: number
  notes: string | null
  exported_at: string | null
  created_at: string
  // Joined
  items?: QuoteItem[]
}

export interface QuoteItem {
  id: string
  quote_id: string
  article_id: string | null
  name: string
  description: string | null
  quantity: number
  unit_price: number
  is_override: boolean
  is_offered: boolean
  hide_qty: boolean
  sort_order: number
}

export type PaymentMethod = 'wire_transfer' | 'cash' | 'bit'

export interface Payment {
  id: string
  project_id: string
  date: string
  amount: number
  method: PaymentMethod
  note: string | null
  created_at: string
}

export interface Expense {
  id: string
  date: string
  description: string
  amount: number
  category: string
  supplier_id: string | null
  project_id: string | null
  sumit_done: boolean
  created_at: string
}

export interface Task {
  id: string
  project_id: string | null
  title: string
  completed: boolean
  due_date: string | null
  priority: 'low' | 'medium' | 'high'
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  parent_id: string | null
}

export interface Article {
  id: string
  category_id: string
  name: string
  price: number
  note: string | null
}

export interface Supplier {
  id: string
  name: string
  contact: string | null
  notes: string | null
  offerings: SupplierOffering[]
  created_at: string
}

export interface SupplierOffering {
  name: string
  price: number
  note: string | null
}

// Computed types

export interface ProjectWithTotals extends Project {
  total: number
  paid: number
  remaining: number
}

export interface MonthlyFinance {
  month: string
  revenue: number
  expenses: number
  profit: number
  projects: ProjectWithTotals[]
}
