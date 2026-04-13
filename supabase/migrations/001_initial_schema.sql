-- Paperly Studio Database Schema
-- Run this in your Supabase SQL Editor

-- ═══════════════════════════════════
-- TABLES
-- ═══════════════════════════════════

-- Clients
create table if not exists public.clients (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Projects
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.clients(id) on delete set null,
  name text not null,
  delivery_date date,
  event_date date,
  pipeline_stage text not null default 'lead'
    check (pipeline_stage in ('lead', 'quoted', 'confirmed', 'in_progress', 'delivered', 'paid')),
  notes text,
  sumit_done boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Quotes
create table if not exists public.quotes (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  version integer not null default 1,
  subtotal numeric(12,2) not null default 0,
  discount_mode text not null default 'pct' check (discount_mode in ('pct', 'fixed')),
  discount_value numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  notes text,
  exported_at timestamptz,
  created_at timestamptz default now() not null
);

-- Quote line items
create table if not exists public.quote_items (
  id uuid default gen_random_uuid() primary key,
  quote_id uuid references public.quotes(id) on delete cascade not null,
  article_id uuid,
  name text not null,
  description text,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  is_override boolean default false not null,
  is_offered boolean default false not null,
  hide_qty boolean default false not null,
  sort_order integer not null default 0
);

-- Payments
create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  date date not null,
  amount numeric(12,2) not null,
  method text not null default 'wire_transfer'
    check (method in ('wire_transfer', 'cash', 'bit')),
  note text,
  created_at timestamptz default now() not null
);

-- Expenses
create table if not exists public.expenses (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  description text not null,
  amount numeric(12,2) not null,
  category text not null default 'other',
  supplier_id uuid,
  project_id uuid references public.projects(id) on delete set null,
  sumit_done boolean default false not null,
  created_at timestamptz default now() not null
);

-- Tasks
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  completed boolean default false not null,
  due_date date,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Article categories (hierarchical)
create table if not exists public.categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  parent_id uuid references public.categories(id) on delete cascade
);

-- Articles (pricing catalog)
create table if not exists public.articles (
  id uuid default gen_random_uuid() primary key,
  category_id uuid references public.categories(id) on delete cascade not null,
  name text not null,
  price numeric(12,2) not null default 0,
  note text
);

-- Suppliers
create table if not exists public.suppliers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  contact text,
  notes text,
  offerings jsonb default '[]'::jsonb not null,
  created_at timestamptz default now() not null
);

-- ═══════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════

create index if not exists idx_projects_client on public.projects(client_id);
create index if not exists idx_projects_stage on public.projects(pipeline_stage);
create index if not exists idx_quotes_project on public.quotes(project_id);
create index if not exists idx_quote_items_quote on public.quote_items(quote_id);
create index if not exists idx_payments_project on public.payments(project_id);
create index if not exists idx_payments_date on public.payments(date);
create index if not exists idx_expenses_date on public.expenses(date);
create index if not exists idx_tasks_project on public.tasks(project_id);
create index if not exists idx_tasks_completed on public.tasks(completed);
create index if not exists idx_articles_category on public.articles(category_id);
create index if not exists idx_categories_parent on public.categories(parent_id);

-- ═══════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════

alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.tasks enable row level security;
alter table public.categories enable row level security;
alter table public.articles enable row level security;
alter table public.suppliers enable row level security;

-- Allow authenticated users full access (small team, no multi-tenancy needed yet)
create policy "Authenticated users have full access" on public.clients
  for all using (auth.role() = 'authenticated');
create policy "Authenticated users have full access" on public.projects
  for all using (auth.role() = 'authenticated');
create policy "Authenticated users have full access" on public.quotes
  for all using (auth.role() = 'authenticated');
create policy "Authenticated users have full access" on public.quote_items
  for all using (auth.role() = 'authenticated');
create policy "Authenticated users have full access" on public.payments
  for all using (auth.role() = 'authenticated');
create policy "Authenticated users have full access" on public.expenses
  for all using (auth.role() = 'authenticated');
create policy "Authenticated users have full access" on public.tasks
  for all using (auth.role() = 'authenticated');
create policy "Authenticated users have full access" on public.categories
  for all using (auth.role() = 'authenticated');
create policy "Authenticated users have full access" on public.articles
  for all using (auth.role() = 'authenticated');
create policy "Authenticated users have full access" on public.suppliers
  for all using (auth.role() = 'authenticated');

-- ═══════════════════════════════════
-- AUTO-UPDATE TIMESTAMPS
-- ═══════════════════════════════════

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.clients
  for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.projects
  for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.tasks
  for each row execute function public.update_updated_at();
