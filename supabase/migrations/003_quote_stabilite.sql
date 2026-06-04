-- 003_quote_stabilite.sql
-- Verrou d'acceptation + versionnement réel + chaînage des versions (cf. audit C3).
--
-- ⚠️ Ne pas appliquer avant que le code applicatif lise/écrive correctement
-- `status`, `locked`, `accepted_at` et `parent_quote_id`. Les triggers ci-dessous
-- font échouer toute modification d'un devis verrouillé : la voie pour modifier
-- un devis accepté est de créer une NOUVELLE version (nouvelle ligne quotes).

alter table public.quotes
  add column if not exists status text not null default 'draft'
    check (status in ('draft','sent','accepted','rejected','expired')),
  add column if not exists accepted_at timestamptz,
  add column if not exists valid_until date,
  add column if not exists locked boolean not null default false,
  add column if not exists parent_quote_id uuid references public.quotes(id) on delete set null;

-- Un seul numéro de version par projet
create unique index if not exists uniq_quote_project_version
  on public.quotes(project_id, version);

-- Verrou devis : interdire la modification des montants d'un devis verrouillé
create or replace function public.prevent_locked_quote_update()
returns trigger as $$
begin
  if old.locked and (
       new.subtotal       is distinct from old.subtotal
    or new.total          is distinct from old.total
    or new.discount_mode  is distinct from old.discount_mode
    or new.discount_value is distinct from old.discount_value
  ) then
    raise exception 'Devis verrouillé : créez une nouvelle version pour modifier le prix.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_lock_quote on public.quotes;
create trigger trg_lock_quote before update on public.quotes
  for each row execute function public.prevent_locked_quote_update();

-- Verrou lignes : aucune insertion / modification / suppression de ligne sur un devis verrouillé
create or replace function public.prevent_locked_quote_item_change()
returns trigger as $$
declare q_locked boolean;
begin
  select locked into q_locked from public.quotes
   where id = coalesce(new.quote_id, old.quote_id);
  if q_locked then
    raise exception 'Lignes verrouillées : créez une nouvelle version du devis pour modifier.';
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql;

drop trigger if exists trg_lock_quote_items on public.quote_items;
create trigger trg_lock_quote_items before insert or update or delete on public.quote_items
  for each row execute function public.prevent_locked_quote_item_change();
