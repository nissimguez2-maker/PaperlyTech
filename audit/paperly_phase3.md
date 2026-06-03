# Audit Paperly Studio — Phase 3 : Plan d'action (plan uniquement)

> **Suite de** `audit/paperly_phase1.md` (état des lieux) et `audit/paperly_phase2.md` (stratégie).
> **Nature de ce document : un PLAN. Aucun code n'est écrit ici.** Les migrations SQL ci-dessous sont des **propositions** à appliquer lors de l'implémentation, **non exécutées**. Objectif : donner à Nessim une feuille de route séquencée, des migrations prêtes, des critères d'acceptation testables et une recette.
> **Contexte calendaire (juin 2026) :** fin de la **haute saison** (avr.–juin). Fenêtre **« 2.0 des outils » en juil.–août**, puis **accalmie Tishri / nov.–janv.** propice aux chantiers de fond. Implémentation par Nessim (~1–2 h/jour) ; **Sacha = utilisatrice/recette** (non-technique, mobile).

---

## 1. Décisions actées (cadre du plan)

1. **Cycle de vie à 5 états** : `Devisé → Accepté → En production → Livré → Payé`.
2. **`Livré` indépendant du paiement** — on **retire** le blocage actuel « pas de passage à Livré si solde dû ». Livraison = fait logistique ; `Payé` = fait financier dérivé.
3. **Versions v1/v2 d'abord**, options A/B **différées**.
4. **`revenue_type` (`print` / `digital` / `original`) au niveau LIGNE** (`quote_items`) — **une commande peut mélanger les 3 catégories**. Le reporting « CA par activité » agrège au niveau ligne. **Bundles différés.**
5. **Migration sûre** des éventuelles lignes de pipeline héritées.
6. **IA dans l'ordre** : ICS → email/rappels → pré-remplissage ; opérée par Nessim (Edge Functions Supabase / n8n).
7. Rappels transverses : **français + ₪**, **hébreu/RTL différé**, **aucune segmentation par type de client**, **aucune** notion de commission/apporteur.

---

## 2. Séquencement en vagues

Priorité : **d'abord ce qui protège l'argent, les données et la confiance** (faible effort, fort impact), **ensuite** les chantiers de fond, **enfin** la forme et l'IA. Effort indicatif : S (≤ ½ j), M (1–3 j), L (> 3 j) pour Nessim.

| Vague | Thème | Quand | Contenu (constats) | Effort |
|---|---|---|---|---|
| **V0 — Filets de sécurité** | Anti-crash · anti-perte · anti-faux-chiffres | **Immédiat** (faible risque, même en saison) | Fallback badge + Error Boundary + enum aligné *(C4)* ; réparer polices PDF + smoke-test *(C1)* ; formateur ₪/2 décimales unique *(C2, M1)* ; bornage des remises *(E4)* ; confirmation suppression d'item + protection paiements *(C5)* ; réintégrer Bit *(M7)* ; franciser nav + stages + `ConfirmDialog` *(E2)* ; câbler/retirer boutons morts *(M3)* ; `prompt()` → modales *(M2)* | M (cumulé) |
| **V1 — Le devis & la stabilité du prix** | Cœur premium | **Juil.–août** | Refonte devis « vision avant prix » *(Ch.1)* ; acceptation/verrou + versionnement + lecture « version acceptée » partout *(Ch.2)* ; migration états + `quotes` *(§3)* | L |
| **V2 — Pilotage & visibilité** | Chiffres justes + temps lisible | **Juil.–août** | KPI réconciliés Signé/Encaissé/Restant dû *(E5, M11, M13)* ; échéances `event_date`/à-risque *(E3)* ; saison *(M15)* ; fiche/historique client *(E9)* ; `revenue_type` + reporting par activité | L |
| **V3 — Forme premium & coque** | Crédibilité visuelle | **Juil.–sept.** (interleavable) | Design tokens + voix serif + états partagés + signature unique *(Ch.5)* ; **coque responsive/mobile** *(C6)* ; brouillon vs envoi + feedback de sauvegarde *(E6, E7)* | L |
| **V4 — IA & open-source** | Multiplicateur d'ops | **Tishri / nov.–janv.** | ICS *(IA‑5)* → email + rappels n8n/Resend *(IA‑4)* → pré-remplissage devis borné catalogue *(IA‑1)* ; puis copy « vision » *(IA‑2)*, rappel sémantique pgvector *(IA‑3)* | M→L |
| **V5 — Dette & qualité** | Pérennité | **Continu** | Types Supabase générés + suppression table fantôme `profiles` *(M4)* ; FK manquantes + CHECK montants *(M5)* ; hook `useStageChange` unifié *(M10)* ; retirer `xlsx` mort + **CI minimal** `tsc`+`eslint` *(F1)* ; contrastes AA + skeletons *(F4, F5)* | M |

> **Garde-fou temps de Sacha :** V0 ne change quasiment pas ses habitudes (corrections invisibles + français). Les changements de parcours (V1–V3) sont introduits **progressivement**, chaque vague livrable seule, testée par Sacha sur 1–2 vrais devis avant la suivante.

---

## 3. Plan données — migrations proposées (NON exécutées)

> À découper en fichiers `supabase/migrations/002_…`, `003_…`. **Toujours** tester sur une **branche Supabase** (ou un projet de staging) avec une **sauvegarde** avant d'appliquer en production. Le schéma actuel utilise des colonnes `text` + `CHECK` (pas d'`enum` natif) : une migration d'états = *drop constraint → update data → add constraint*.

### 3.1 — `002_lifecycle_5_etats.sql` (corrige C4)
```sql
-- Aligner pipeline_stage sur les 5 états réels + migrer l'existant
alter table public.projects drop constraint if exists projects_pipeline_stage_check;

update public.projects set pipeline_stage = 'quoted'   where pipeline_stage = 'lead';
update public.projects set pipeline_stage = 'accepted'  where pipeline_stage = 'confirmed';
-- 'quoted','in_progress','delivered','paid' restent inchangés

alter table public.projects
  add constraint projects_pipeline_stage_check
  check (pipeline_stage in ('quoted','accepted','in_progress','delivered','paid'));

alter table public.projects alter column pipeline_stage set default 'quoted';
```
*Recette : aucune ligne ne reste en `lead`/`confirmed` ; l'app (enum TS + `PIPELINE_STAGES`) doit être étendue aux 5 valeurs **avant** déploiement.*

### 3.2 — `003_quote_stabilite.sql` (corrige C3)
```sql
-- État d'acceptation, validité, verrou, chaînage des versions
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

-- Verrou : interdire la modification des montants d'un devis verrouillé
create or replace function public.prevent_locked_quote_update()
returns trigger as $$
begin
  if old.locked and (
       new.subtotal is distinct from old.subtotal
    or new.total is distinct from old.total
    or new.discount_mode is distinct from old.discount_mode
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

-- (Optionnel) protéger aussi quote_items d'un devis verrouillé via trigger analogue.
```
*Recette : passer un devis en `locked=true` puis tenter un UPDATE du total ⇒ exception ; créer une v2 reste possible (nouvelle ligne `quotes`).*

### 3.3 — `004_protection_paiements_integrite.sql` (corrige C5, M5)
```sql
-- Ne plus détruire les paiements encaissés avec le projet
alter table public.payments drop constraint if exists payments_project_id_fkey;
alter table public.payments
  add constraint payments_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete restrict;

-- (Alternative douce : soft-delete projets)
alter table public.projects add column if not exists deleted_at timestamptz;

-- FK manquantes (pointeurs orphelins aujourd'hui)
alter table public.quote_items
  add constraint quote_items_article_id_fkey
  foreign key (article_id) references public.articles(id) on delete set null;
alter table public.expenses
  add constraint expenses_supplier_id_fkey
  foreign key (supplier_id) references public.suppliers(id) on delete set null;

-- Bornes de montants (aucune aujourd'hui)
alter table public.payments    add constraint payments_amount_nonneg    check (amount >= 0);
alter table public.expenses    add constraint expenses_amount_nonneg    check (amount >= 0);
alter table public.quote_items add constraint quote_items_qty_pos       check (quantity > 0);
alter table public.quote_items add constraint quote_items_price_nonneg  check (unit_price >= 0);
alter table public.quotes      add constraint quotes_total_nonneg       check (total >= 0 and subtotal >= 0);
```
*Note : si des données existantes violent une borne, les corriger avant `add constraint` (sinon échec). Pré-vérifier par `select` avant migration.*

### 3.4 — `005_revenue_type.sql` (lignes mixtes — décision §1.4)
```sql
-- Catégorie au niveau ARTICLE (défaut) ET LIGNE (instantané, éditable)
alter table public.articles
  add column if not exists revenue_type text
  check (revenue_type in ('print','digital','original'));

alter table public.quote_items
  add column if not exists revenue_type text
  check (revenue_type in ('print','digital','original'));

-- À l'ajout d'une ligne : copier articles.revenue_type dans quote_items.revenue_type
-- (snapshot), modifiable ensuite. Une même proposition peut donc mélanger print/digital/original.
```
**Reporting « CA par activité » (mixte) :** agréger au niveau ligne de la **version acceptée**, p. ex.
```sql
select qi.revenue_type, sum(qi.quantity * qi.unit_price) as ca
from quote_items qi
join quotes q on q.id = qi.quote_id and q.status = 'accepted'
group by qi.revenue_type;
```
→ un même devis contribue simultanément à `print`, `digital` et `original` selon ses lignes.

### 3.5 — Notes hors-SQL (app)
- **Méthodes de paiement** : `bit` est **déjà** autorisé en base ; le correctif est applicatif (`PAYMENT_METHODS` + type) — pas de migration *(M7)*.
- **Table `profiles` fantôme** : retirer le type TS (mono-compte) **ou** créer la table liée à `auth.users` si multi-utilisateur. Recommandation : **générer les types** (`supabase gen types typescript`) et supprimer la dérive *(M4)*.
- **RLS** : conserver « authenticated full access » mono-compte mais **le documenter** ; policies par rôle si un 2ᵉ compte arrive *(M14)*.

---

## 4. Plan par chantier (objectif · fichiers · critères d'acceptation)

> Les critères d'acceptation sont **testables** (recette manuelle ou test auto). Fichiers = points d'entrée principaux.

### V0 — Filets de sécurité
| Item | Fichiers | Critères d'acceptation |
|---|---|---|
| **Anti-écran-blanc** *(C4)* | `src/components/ui/badge.tsx`, `src/lib/utils.ts`, `src/main.tsx` (Error Boundary), migration 002 | Un projet dans un stage inconnu affiche un badge neutre (pas d'exception) ; une erreur de rendu affiche un écran soigné, pas un blanc ; les 5 stages s'affichent. |
| **Polices PDF** *(C1)* | `src/lib/pdf-fonts.ts`, `src/lib/pdf-quote.ts`, script de build | Le PDF rend Inter (pas Helvetica) ; le **smoke-test** échoue le build si une police n'a pas l'en-tête `00 01 00 00`/`OTTO` ; testé sur un PDF réel avec accents + décimales. |
| **Totaux ₪ cohérents** *(C2, M1)* | `src/lib/utils.ts` (formateur unique), `src/lib/pdf-quote.ts`, `src/pages/quotes.tsx` | Pour un devis donné, total écran = total base = total PDF au centime ; somme des lignes PDF = sous-total ; affichage « 1 490,50 ₪ » ; dates FR. |
| **Bornage remises** *(E4)* | `src/pages/quotes.tsx` | Remise `fixed` > sous-total ⇒ plafonnée + alerte (pas de devis 0 ₪ silencieux) ; remise négative refusée. |
| **Anti-perte** *(C5)* | `src/pages/project-detail.tsx`, `src/pages/projects.tsx`, migration 004 | Suppression d'item ⇒ confirmation ; suppression d'un projet avec paiements ⇒ bloquée/archivée (paiements préservés). |
| **Bit + français** *(M7, E2, M2, M3)* | `src/lib/utils.ts`, `src/components/layout/sidebar.tsx`, `src/pages/*` | « Bit » sélectionnable et libellé ; nav + stages + `ConfirmDialog` en FR ; aucun `prompt()` natif ; aucun bouton sans effet. |

### V1 — Devis & stabilité du prix
| Item | Fichiers | Critères d'acceptation |
|---|---|---|
| **Refonte devis « vision »** *(Ch.1)* | `src/lib/pdf-quote.ts`, `src/pages/quotes.tsx` | Ordre : vision (serif) → systèmes groupés → total discret → validation → footer signé ; libellé « Proposition » ; total = écran. |
| **Acceptation / verrou** *(C3)* | `src/pages/project-detail.tsx`, migration 003 | `[Marquer accepté]` → `accepted_at` + `locked=true` ; édition d'un devis accepté refusée (ou crée v2) ; badge « Prix verrouillé ». |
| **Versionnement** *(C3)* | `src/pages/quotes.tsx`, `src/pages/project-detail.tsx`, `src/pages/finance.tsx` | Un nouvel envoi crée v(n+1) ; finance/fiche lisent la **version acceptée** (pas « la dernière ») ; remise jamais écrasée à l'édition. |

### V2 — Pilotage & visibilité
| Item | Fichiers | Critères d'acceptation |
|---|---|---|
| **KPI réconciliés** *(E5, M11, M13)* | `src/pages/finance.tsx`, `src/pages/dashboard.tsx`, `src/lib/utils.ts` | Affiche Signé / Encaissé / Restant dû ; un acompte n'est jamais compté 2× ; trop-perçu visible ; attribution mensuelle en heure locale. |
| **Échéances** *(E3)* | `src/pages/dashboard.tsx`, nouvelle vue, `src/pages/projects.tsx` | `event_date` **et** `delivery_date` affichés ; statut « à risque »/« en retard » dérivé ; jalons. |
| **Saison** *(M15)* | `src/pages/finance.tsx` | Comparatif mois-1/N‑1 ; bandes Tishri/nov.–janv. |
| **Fiche client** *(E9)* | nouvelles routes, `src/App.tsx` | Annuaire + fiche (email/phone/notes exploités) + historique 360° ; `[Email]`/`[Appeler]` actifs. |
| **Revenue type** *(M8, §3.4)* | migration 005, `src/pages/catalog.tsx`, `src/pages/quotes.tsx`, `src/pages/finance.tsx` | Chaque ligne porte une catégorie (défaut hérité de l'article, éditable) ; une commande peut **mélanger** print/digital/original ; reporting CA par activité agrège au niveau ligne. |

### V3 — Forme & coque
| Item | Fichiers | Critères d'acceptation |
|---|---|---|
| **Design system** *(Ch.5)* | `src/index.css` (tokens), `src/components/ui/*` | Un seul jeu rayons/ombres/typo (plancher 12px) ; `Button loading` ; `Spinner`/`Skeleton` ; focus unique ; `ConfirmDialog` FR ; signature unique login/sidebar/PDF. |
| **Coque responsive** *(C6)* | `src/components/layout/app-layout.tsx`, `sidebar.tsx` | Sur mobile : drawer + onglets bas, colonne unique, aucun débordement, cibles ≥ 44px ; desktop inchangé. |
| **Brouillon vs envoi** *(E6, E7)* | `src/pages/quotes.tsx`, `src/pages/project-detail.tsx` | Actions « Enregistrer » / « Aperçu & Envoyer » séparées ; transaction atomique (pas de projet fantôme) ; indicateur « Enregistré 14:02 ». |

### V4 — IA & open-source
| Item | Où | Critères d'acceptation |
|---|---|---|
| **ICS** *(IA‑5)* | Edge Function `make-ics` ou n8n | `.ics` event/livraison généré ; dates en heure locale ; aucune clé externe. |
| **Email + rappels** *(IA‑4)* | n8n + Resend, webhook Supabase | Envoi de la proposition + relances d'échéances ; gabarits FR pré-validés ; clés côté serveur. |
| **Pré-remplissage devis** *(IA‑1)* | Edge Function `draft-quote` (Claude Haiku) | Brief court → lignes **issues du catalogue réel** ; aucun prix inventé ; brouillon toujours révisé par Sacha. |

---

## 5. Checklist de recette (QA)

> **Aujourd'hui : aucun test, aucun CI** *(F1)*. Recommandation : ajouter **Vitest** + quelques tests unitaires sur la logique d'argent, et un **CI** `tsc -b && eslint`. À défaut, exécuter cette recette manuelle à chaque vague.

**Argent & devis**
- [ ] Total écran = total PDF = total stocké, au centime (décimales, remise %, remise fixe).
- [ ] Somme des lignes du PDF = sous-total affiché.
- [ ] Remise fixe > sous-total ⇒ refus/plafond + alerte ; remise négative refusée.
- [ ] Article « offert » exclu du total ; bascule retour facturé = confirmée.
- [ ] Saisie polluée (`12abc`, qty 0/négative) rejetée.

**Cycle de vie & verrou**
- [ ] `Devisé→Accepté` fige prix/remise/lignes ; édition refusée ou crée v2.
- [ ] Finance/fiche lisent la **version acceptée**, pas la dernière.
- [ ] `Livré` possible avec solde dû (plus de blocage) ; `Payé` dérivé quand `Σ paiements ≥ total accepté`.
- [ ] Migration 002 : aucune ligne `lead`/`confirmed` restante ; aucun crash de badge.

**KPI & dates**
- [ ] Signé / Encaissé / Restant dû cohérents ; acompte non compté 2× ; trop-perçu visible.
- [ ] Paiement saisi le soir (heure Israël) attribué au bon mois.
- [ ] Comparatif N‑1 + repères Tishri/nov.–janv. présents.

**Données & robustesse**
- [ ] Supprimer un projet avec paiements : bloqué/archivé, paiements préservés.
- [ ] Migration testée sur branche Supabase + sauvegarde ; rollback documenté.
- [ ] Stage inconnu / erreur de rendu : pas d'écran blanc (Error Boundary).

**Forme & mobile**
- [ ] iPhone : nav par onglets, aucun débordement horizontal, actions au pouce.
- [ ] Devise « ₪ », dates FR, UI FR de bout en bout ; aucun `prompt()` natif.
- [ ] PDF : Inter rendu (pas Helvetica), vision avant prix, footer signé Sacha.

**Reporting mixte**
- [ ] Un devis mélangeant print + digital + original ventile correctement le CA par catégorie (agrégation ligne).

---

## 6. Risques & rollback

- **Migrations** : toujours **branche Supabase + sauvegarde** ; pré-vérifier les violations de CHECK par `select` avant `add constraint` ; chaque migration a son `down` (drop constraint / drop column). Déployer l'**app compatible 5 états** *avant* la migration 002 pour éviter tout écart base↔app.
- **Polices PDF** : risque = un TTF encore invalide ⇒ le **smoke-test au build** est la barrière ; valider sur PDF réel avant diffusion à un client.
- **Verrou de devis** : risque de bloquer une correction légitime ⇒ le chemin `[Créer une révision (v2)]` doit être évident.
- **Responsive** : risque de régression desktop ⇒ tester les deux tailles ; livrer derrière la même base de composants.
- **IA** : clés **jamais** en `VITE_*` ; commencer en mode « brouillon à valider » avant tout envoi automatique.

---

## 7. Definition of Done (par vague) & hors-périmètre

**DoD :** critères d'acceptation du chantier verts · recette QA de la section concernée passée · testé par Sacha sur 1–2 vrais devis (mobile) · migration appliquée sur branche puis prod avec sauvegarde · aucune régression desktop.

**Hors-périmètre / différé (assumé) :** hébreu / RTL ; options A/B parallèles ; bundles/packs ; rôles multi-utilisateur ; toute notion de commission/apporteur ; tout portail client à compte.

---

*Fin de la Phase 3. Le plan est prêt à exécuter, vague par vague. **Aucun code n'a été écrit** (décision « plan only »). Si vous le souhaitez, je peux démarrer l'implémentation de la **Vague 0 (filets de sécurité)** sur la branche `claude/great-mccarthy-9M9O3` — sur votre feu vert explicite.*
