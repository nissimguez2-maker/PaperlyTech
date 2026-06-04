-- 005_revenue_type_mixed_orders.sql
-- Typologie des 3 lignes de revenu (imprimés / digitaux / pièces originales).
-- Au niveau ARTICLE = défaut hérité. Au niveau LIGNE de devis = snapshot, éditable.
-- Un même devis peut donc mélanger print + digital + original. Le reporting
-- « CA par activité » agrège au niveau ligne.

alter table public.articles
  add column if not exists revenue_type text
  check (revenue_type in ('print','digital','original'));

alter table public.quote_items
  add column if not exists revenue_type text
  check (revenue_type in ('print','digital','original'));

create index if not exists idx_quote_items_revenue_type on public.quote_items(revenue_type);
create index if not exists idx_articles_revenue_type    on public.articles(revenue_type);
