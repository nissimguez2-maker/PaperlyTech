-- 004_protection_paiements_integrite.sql
-- Protéger les paiements encaissés (preuve comptable) et renforcer l'intégrité des données.
--
-- ⚠️ Après cette migration, supprimer un projet ayant des paiements échoue (on delete
-- restrict) : le code applicatif doit bloquer/archiver ce cas (cf. audit C5).
-- Pré-vérifier qu'aucune donnée existante ne viole les CHECK ci-dessous, et tester sur
-- une branche Supabase + sauvegarde avant la production.
-- (003_quote_stabilite.sql — verrou d'acceptation / versionnement — relève de la Vague 1.)

-- 1) Ne plus détruire les paiements avec le projet
alter table public.payments drop constraint if exists payments_project_id_fkey;
alter table public.payments
  add constraint payments_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete restrict;

-- 2) FK manquantes (pointeurs orphelins aujourd'hui)
alter table public.quote_items
  add constraint quote_items_article_id_fkey
  foreign key (article_id) references public.articles(id) on delete set null;
alter table public.expenses
  add constraint expenses_supplier_id_fkey
  foreign key (supplier_id) references public.suppliers(id) on delete set null;

-- 3) Bornes de montants (aucune aujourd'hui)
alter table public.payments    add constraint payments_amount_nonneg   check (amount >= 0);
alter table public.expenses    add constraint expenses_amount_nonneg   check (amount >= 0);
alter table public.quote_items add constraint quote_items_qty_pos      check (quantity > 0);
alter table public.quote_items add constraint quote_items_price_nonneg check (unit_price >= 0);
alter table public.quotes      add constraint quotes_amounts_nonneg    check (total >= 0 and subtotal >= 0);
