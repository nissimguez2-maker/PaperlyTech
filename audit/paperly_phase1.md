# Audit Paperly Studio — Phase 1 : État des lieux

> **Outil audité :** l'application interne de gestion Paperly Studio (devis, pipeline, paiements, finance) — React 19 + TypeScript + Tailwind v4 + Supabase + Vite, déployée sur Netlify.
> **Objet de ce round :** UI/UX, parcours opérateur et utilité de l'outil — pour que **Sacha** serve mieux **Sarah** (cliente indécise), **Eden** (cliente décidée) et **Claire** (wedding planner).
> **Date :** juin 2026 · **Branche :** `claude/great-mccarthy-9M9O3`
> **Méthode :** audit **statique** du code par 6 agents spécialisés en parallèle (UX, architecture front, schéma/données, UI/marque, exactitude/QA, intelligence culturelle/localisation). Chaque constat est sourcé en `fichier:ligne`. L'app n'a **pas** été exécutée (pas de `node_modules`) — les comportements purement runtime (rendu PDF réel, taille de bundle) sont signalés comme à confirmer par un build.

---

## Comment lire ce document

- **Gravité :** 🔴 Bloquant/Critique · 🟠 Élevée · 🟡 Moyenne · ⚪ Faible.
- **Corroboré ×N :** constat trouvé indépendamment par N agents — fiabilité renforcée.
- Les recommandations sont **premium-safe** (jamais low-cost / volume / spam) et tiennent compte du temps limité et du profil non-technique de Sacha. Elles **alimentent la Phase 2** (priorisation fine) ; rien n'est encore implémenté.

---

## Résumé exécutif

L'outil est **techniquement sain dans ses fondations** (UUID, montants en `numeric(12,2)`, palette tokenisée, deux belles polices chargées, composants UI corrects) mais, en l'état, c'est **un CRM d'administration anglophone, desktop-only**, posé sur un studio **premium franco-israélien**. Trois familles de problèmes sapent directement le positionnement et la confiance des clients :

1. **L'artefact qui « vend la vision » est cassé.** Les polices Inter du devis PDF sont en réalité des pages HTML encodées (pas des TTF) → le PDF retombe en Helvetica (corroboré ×3). Pire, **le total du PDF ne correspond pas au total à l'écran** (arrondi entier vs 2 décimales), et le devis se lit comme **une facture/liste de prix**, pas comme une proposition de direction artistique.
2. **Le prix n'est pas stable.** Aucun verrou d'acceptation ni vrai versionnement (le champ `version` est figé à 1), et toute édition ultérieure **efface silencieusement la remise** (`subtotal = total`) → le prix qu'Eden a accepté « remonte » tout seul (corroboré ×3). C'est exactement la rupture de confiance redoutée par Eden et Claire.
3. **L'outil ne parle pas à ses personas.** L'UI est **100 % en anglais** pour une clientèle francophone ; **Claire (planner) n'a aucune visibilité** dans l'outil (`event_date` jamais affiché, aucune vue d'échéances) alors que c'est le canal d'acquisition n°1 ; et **rien n'est responsive** alors que Sacha travaille au téléphone.

S'y ajoute un **risque de fiabilité** : une simple ligne en base dans un état de pipeline « inconnu » (le schéma en autorise 6, l'app n'en connaît que 3, défaut `'lead'`) fait **planter** le badge sans filet (aucune Error Boundary) → écran blanc pour une utilisatrice non-technique. Et des **suppressions destructrices** (cascade sur paiements encaissés, suppression d'item sans confirmation) menacent la preuve comptable.

**Trois priorités structurantes pour la Phase 2 :** (1) réparer + repenser le **devis/PDF** (polices, cohérence des totaux, « vision avant prix », FR/₪) ; (2) **stabiliser le prix** (acceptation, verrou, versions, remise) ; (3) **rendre l'outil franco-israélien, responsive et conscient du canal planner** (échéances, visibilité, fiche client, saisonnalité).

---

## 1. Constats 🔴 Critiques (à traiter en priorité)

| # | Constat | Preuve (`fichier:ligne`) | Persona(s) | Recommandation premium-safe |
|---|---------|--------------------------|------------|------------------------------|
| C1 | **Polices PDF corrompues → devis premium en Helvetica.** Le base64 de `InterRegular/Bold/SemiBold` décode en page HTML GitHub, pas en TTF ; tous les `setFont('Inter')` échouent silencieusement. Seul Cormorant est une vraie police. *(Corroboré ×3)* | `src/lib/pdf-fonts.ts:3` ; usages `src/lib/pdf-quote.ts:48-53,84,104-113,192-199,299-318` | Tous | Réembarquer de **vrais TTF Inter** (vérifier l'octet 0 = `00 01 00 00`/`OTTO`) **+ une police compatible hébreu** (Heebo/Assistant/Rubik). Ajouter un **test de fumée au build** qui vérifie l'en-tête de chaque police. À **tester sur un PDF réel**. |
| C2 | **Le total du PDF ≠ total écran/base.** Le PDF arrondit tout à l'entier (`maximumFractionDigits: 0`), l'écran affiche 2 décimales ; en plus chaque ligne du PDF est ré-arrondie → la somme des lignes ne fait plus le sous-total. Le document contractuel diffère du prix validé. | `src/lib/pdf-quote.ts:42-43,247-249,305` vs `src/lib/utils.ts:29-30` | Eden, Claire | **Un seul format/arrondi** (2 décimales) ; le PDF reçoit exactement les valeurs affichées/stockées. Arrondir au niveau ligne **puis** sommer. |
| C3 | **Prix instable : remise effacée + versionnement mort + aucun verrou.** Toute édition d'item ré-écrit `subtotal = total` en **ignorant la remise** ; `version` est figé à 1 ; aucun état d'acceptation/lock. Le prix accepté change en silence. *(Corroboré ×3)* | `src/pages/project-detail.tsx:101-106,108-127` ; `src/pages/quotes.tsx:214-215` ; schéma `001_initial_schema.sql:35-46` | Eden, Sarah, Sacha | Introduire un **état d'acceptation + verrou** (devis accepté immuable) et un **vrai versionnement** (v1/v2). Relire `discount_mode/value` à chaque recalcul. |
| C4 | **Dérive d'enum pipeline → projets invisibles + crash écran blanc.** Le schéma autorise 6 stages (`lead,quoted,confirmed,in_progress,delivered,paid`, défaut `'lead'`), l'app n'en connaît que 3. Un stage inconnu n'est ni groupé ni compté, **et fait planter `PipelineBadge`** (`stageStyles[stage]` → `undefined` → exception), sans Error Boundary. *(Corroboré ×3)* | `001_initial_schema.sql:26-27` ; `src/lib/utils.ts:57-61` ; `src/components/ui/badge.tsx:4-8,22,29` ; `src/main.tsx` | Sacha | Aligner le `CHECK` sur les **3 états réels** + défaut `'quoted'` (migration des données existantes). Ajouter un **fallback** au badge (`?? quoted`) et une **Error Boundary** premium autour de l'app. |
| C5 | **Suppressions destructrices.** `on delete cascade` efface les **paiements encaissés** d'un projet supprimé (preuve comptable / Sumit), sans soft-delete ; la **suppression d'item** dans le détail projet est immédiate, sans confirmation (alors que la suppression de projet, elle, est confirmée — incohérent). | `001_initial_schema.sql:37,51,66,91` ; `src/pages/projects.tsx:127-146` ; `src/pages/project-detail.tsx:156-161` | Sacha, compta | Passer `payments.project_id` en `on delete restrict` **ou** soft-delete (`deleted_at`). **Confirmation** avant toute suppression d'item ; interdire la suppression d'un projet avec paiements. |
| C6 | **Aucune adaptation mobile (desktop-only).** Sidebar `fixed w-60`, contenu `ml-60`, grilles figées (`grid-cols-5/3`), **zéro** classe responsive. Sur le téléphone de Sacha, la sidebar mange l'écran et les tableaux débordent. | `src/components/layout/app-layout.tsx:7-8` ; `src/components/layout/sidebar.tsx:27` ; `src/pages/dashboard.tsx:137,202` ; `src/pages/quotes.tsx:293-296` | Sacha | Rendre la coque **responsive** : sidebar en drawer + burger sous un point de rupture, grilles `grid-cols-1 md:grid-cols-3`. Prérequis d'un outil « utilisable depuis la maison/le téléphone ». |

---

## 2. Constats 🟠 Élevés

| # | Constat | Preuve (`fichier:ligne`) | Persona(s) | Recommandation premium-safe |
|---|---------|--------------------------|------------|------------------------------|
| E1 | **Le devis se lit comme une liste de prix, pas comme une vision.** Écran et PDF = tableau `Description/Qté/Prix/Total`, libellé « QUOTE », aucune intention créative ni notion de « système visuel ». *(Corroboré ×2)* | `src/lib/pdf-quote.ts:120-124,186-253,292-318` ; `src/pages/quotes.tsx:338-441` | Sarah, Eden | Bloc **« Direction créative / La vision »** (1 paragraphe Cormorant) **avant** le tableau ; renommer « QUOTE » → **« Proposition »** ; regrouper par **système** (papeterie / signalétique / scénographie) ; total présent mais discret. |
| E2 | **UI 100 % anglaise + PDF FR/EN incohérent** (« Offert » isolé dans un document anglais) pour une communauté francophone. *(Corroboré ×4)* | `src/components/layout/sidebar.tsx:10-21` ; `src/lib/utils.ts:57-61` ; `src/lib/pdf-quote.ts:124,233,330` | Tous | Passer l'UI en **français** (couche i18n, FR par défaut, **HE optionnel**) ; PDF **entièrement FR**. |
| E3 | **Aucune visibilité « planner » pour Claire.** `event_date` existe en base mais **jamais affiché** (seul `delivery_date` l'est) ; aucune vue d'échéances/jalons ni « à risque » ; le changement de stage se fait à l'aveugle. | `src/types/database.ts:93` ; `src/pages/dashboard.tsx:95-101` ; `src/pages/projects.tsx:394-428` | Claire | **Exposer `event_date` vs `delivery_date`**, ajouter **relances/échéances** et une vue « à risque ». La fiabilité perçue (délais tenus, visibilité) est le produit pour un planner. |
| E4 | **Remises non bornées.** En mode `fixed`, une remise > sous-total → **devis à 0 ₪** exporté sans alerte (le garde-fou « max 100 % » n'existe qu'en `%`) ; une remise **négative** = majoration **invisible** (total > sous-total sans ligne). | `src/pages/quotes.tsx:104-108,494-496,506` ; `src/lib/pdf-quote.ts:275` | Eden, Sacha | Borner la remise à **`[0, sous-total]`** et **avertir** quand elle approche/atteint le sous-total. |
| E5 | **KPIs non réconciliés.** « In My Pocket » somme **tous** les paiements, alors que « Quoted »/« In the Works » comptent par stage → un acompte sur projet `quoted` est **compté deux fois** ; aucune vue « restant dû » global. | `src/pages/finance.tsx:46-50,59-60` | Sacha, Claire | Distinguer clairement **CA signé / encaissé / restant dû** ; éviter le double-comptage acompte+devis. |
| E6 | **Devis « tout-ou-rien ».** Un seul bouton « Export PDF » fait tout d'un coup (upsert client → projet → devis → items → PDF → vide le formulaire), sans brouillon ni rollback → **projets fantômes** en cas d'échec partiel. | `src/pages/quotes.tsx:153-273,267,521-524` | Eden, Sacha | Dissocier **« Enregistrer »** et **« Exporter »** ; récap/confirmation ; transaction ou suppression du projet créé en cas d'erreur. |
| E7 | **Auto-sauvegarde silencieuse, sans filet.** Le détail projet écrit en base **à chaque frappe** (rafale réseau, écritures concurrentes) sans feedback, sans « Enregistré », sans undo. *(Corroboré ×3)* | `src/pages/project-detail.tsx:108-127` | Sacha, Eden | Vrai **mode édition** (Enregistrer/Annuler) **ou** debounce ~500 ms + indicateur « Enregistré ». |
| E8 | **Voix éditoriale serif absente de l'UI.** Cormorant Italic est chargé mais **0 usage** à l'écran ; look DM Sans par défaut, indistinct d'un CRM générique. | `index.html:10` ; `src/index.css:46-49` ; aucune occurrence `italic` dans `pages/`+`components/` | Eden, Sarah | Faire du **serif/italique** une signature : accroches, sous-titres, états vides. Qu'une capture d'écran soit immédiatement « Paperly ». |
| E9 | **Pas de fiche client ni d'historique.** Aucune page client ; `email`/`phone` existent en base mais ne sont ni saisis ni affichés ; la seule recherche est un filtre texte sur Projects. | `src/App.tsx:48-66` ; `src/pages/projects.tsx:176-183` ; `src/types/database.ts:79-85` | Sacha, Claire | **Vue client** (coordonnées + historique devis/projets/paiements) — clé pour la relation premium et la relance en période creuse. |

---

## 3. Constats 🟡 Moyens

| # | Constat | Preuve (`fichier:ligne`) | Recommandation |
|---|---------|--------------------------|----------------|
| M1 | **Devise « NIS » (texte) au lieu du glyphe ₪**, dates en mois anglais (`en-IL`/`en-GB`/`en-US`). *(Corroboré ×4)* | `src/lib/utils.ts:30,9-26` ; `src/lib/pdf-quote.ts:42,109,167` ; `src/pages/quotes.tsx:187` | `Intl.NumberFormat('fr-IL'/'he-IL', {style:'currency',currency:'ILS'})` → **₪** ; `date-fns/locale/fr` (+`he`). |
| M2 | **`prompt()`/`confirm()` natifs** pour la saisie catalogue/fournisseurs (hors charte, non i18n, pauvres sur mobile). *(Corroboré ×3)* | `src/pages/catalog.tsx:38,47,56,58,66` ; `src/pages/suppliers.tsx:55` | Remplacer par les **modales maison** (`Modal`/`Input`) déjà présentes. |
| M3 | **Réglages & exports non câblés** (boutons « Save Changes », « Export to Excel/All Data » sans handler) → fausse impression de sauvegarde. | `src/pages/settings.tsx:23-24,39,49-52` | Câbler ces actions **ou** les retirer/marquer « bientôt ». |
| M4 | **Dérive de types** : table **`profiles` fantôme** (typée mais absente du SQL), types Supabase maintenus à la main, **6 casts `as unknown`**. | `src/types/database.ts:6-10,67-74` ; `src/pages/projects.tsx:49-64` ; `src/pages/dashboard.tsx:222-223` | `supabase gen types typescript` (commit) + typer les jointures. |
| M5 | **Intégrité données** : FK manquantes (`article_id`, `supplier_id`), **aucun `CHECK (amount >= 0)`**, calculs float JS insérés dans `numeric(12,2)` sans arrondi. | `001_initial_schema.sql:52,82,68,78` ; `src/pages/quotes.tsx:98-108` | FK `on delete set null` ; `CHECK` montants/quantités ; `Math.round(x*100)/100` avant insertion. |
| M6 | **Fiabilité front** : course/closure non gardée (`load()` sur `[id]`), optimistic update **sans rollback** (incohérent avec `projects.tsx`), **spinner infini** possible si le fetch catalogue échoue. | `src/pages/project-detail.tsx:41-94,172-173` ; `src/App.tsx:24-34` | Garde `active`/`AbortController` ; gérer `{ error }` + rollback ; `try/catch/finally`. |
| M7 | **`bit` retiré de l'app mais autorisé en base** (Bit = paiement courant en Israël) → libellé brut à l'affichage. | `001_initial_schema.sql:69-70` ; `src/lib/utils.ts:51-54` | **Réintégrer `bit`** dans `PAYMENT_METHODS` + type. |
| M8 | **Pas de typologie des 3 lignes de revenu** (imprimés/digitaux/originaux) ni de bundles → impossible de ventiler le CA par activité. | `001_initial_schema.sql:49-61,109-115` | `revenue_type` sur `articles`/`quote_items` ; `group_label`/`bundle_id`. |
| M9 | **Dérive design-system** : inputs ad-hoc qui contournent `<Input>`, 4 échelles de rayons concurrentes, modale de suppression dupliquée à la main, **pas d'état `loading`** au bouton, focus défini en double. | `src/pages/quotes.tsx:300-306,368-404` ; `button.tsx:31` vs `card.tsx:16` ; `projects.tsx:307-327` ; `index.css:40-44`+`button.tsx:34` | Tout via `ui/*` ; tokeniser les rayons ; `ConfirmDialog` unique ; prop `loading` ; focus unique. |
| M10 | **Logique « changement de stage + génération de tâches » dupliquée** entre 2 pages, comportements divergents. | `src/pages/project-detail.tsx:163-197` vs `src/pages/projects.tsx:73-125` | Extraire un hook partagé `useStageChange(projectId)`. |
| M11 | **Over-paiement non géré** : tout montant accepté, « Remaining » tronqué à 0, barre plafonnée à 100 % → trop-perçu invisible. | `src/pages/project-detail.tsx:199-221,99,383` | Avertir si `amount > restant dû` ; afficher un solde négatif. |
| M12 | **Saisie permissive** : `safeFloat('12abc')→12`, quantité 0/négative acceptée (min HTML non imposé en logique). | `src/lib/utils.ts:34-38` ; `src/pages/quotes.tsx:391` | Validation stricte (rejeter NaN/négatif, qty ≥ 1). |
| M13 | **Fuseau horaire** : `toISOString()` (UTC) → un paiement saisi tard le soir en Israël peut basculer au **mauvais mois** (ventilation faussée). | `src/pages/project-detail.tsx:38` ; `src/pages/finance.tsx:67-79` | Gérer les dates en **local** pour l'attribution mensuelle / « overdue ». |
| M14 | **RLS « authenticated full access »** (OK en mono-compte mais à documenter ; le rôle `admin/member` typé n'est **pas** appliqué). | `001_initial_schema.sql:158-178` | Documenter ; policies par rôle dès un 2ᵉ compte. |
| M15 | **Aucune conscience de la saisonnalité** : KPIs « ce mois » uniquement, pas de tendance/N-1, aucun repère des creux (Tishri, nov.–janv.). | `src/pages/dashboard.tsx:34,103-111` ; `src/pages/finance.tsx:60-61` | Vue tendance/mois précédent + repères de périodes creuses (pilotage trésorerie). |

---

## 4. Constats ⚪ Faibles (polish / dette)

| # | Constat | Preuve (`fichier:ligne`) | Recommandation |
|---|---------|--------------------------|----------------|
| F1 | Dépendance **`xlsx` morte** (jamais importée) ; **aucun CI ni test**. | `package.json:21` ; `.github/` absent | Retirer `xlsx` ; CI minimal (`tsc -b` + `eslint`). |
| F2 | **Tagline incohérente** sur 3 surfaces (« Studio » / « Creative direction studio » / « CREATIVE DIRECTION FOR PREMIUM EVENTS »). | `sidebar.tsx:31-32` ; `login.tsx:44-45` ; `pdf-quote.ts:100` | Une **signature unique** (FR), déclinée à l'identique. |
| F3 | **Footer PDF générique** (`paperly.com`, sans contact, sans Sacha, sans prochaine étape). | `src/lib/pdf-quote.ts:320-335` | Footer **éditorialisé** : signature de Sacha, coordonnées réelles, prochaine étape. |
| F4 | **Contrastes sous WCAG AA** (placeholder `text-sand`, micro-textes `text-[10px]`). | `input.tsx:28` ; `dashboard.tsx:244-247` | Placeholder ≥ `text-muted` ; plancher typo 12px ; vérifier les ratios. |
| F5 | **Spinners/états vides incohérents**, pas de skeleton premium. | `dashboard.tsx:113-118` ; `projects.tsx:194-199` | `Spinner`/`Skeleton`/`EmptyState` partagés. |
| F6 | **Catégories de dépenses** en anglais codées en dur. | `src/pages/expenses.tsx:16-22` | FR + enum/table. |
| F7 | **`localeCompare` sans locale** (tri FR/HE non déterministe). | `finance.tsx:82` ; `dashboard.tsx:99` | Locale explicite (`'fr'`/`'he'`). |
| F8 | **Libellés de stage dupliqués** (`badge.tsx` + `utils.ts`) + faible différenciation `quoted`/`in_progress` (même fond). | `badge.tsx:10-14` + `utils.ts:57-61` | Source unique + teinte distincte. |

---

## 5. Cartographie par persona

> Ce que l'outil **doit permettre** à Sacha pour servir chaque persona — et où il échoue aujourd'hui.

### 👩‍🎨 Sacha — l'opératrice (DA, non-technique, mobile)
Elle a besoin d'un outil **rapide, en français, sans piège**. Aujourd'hui : **non responsive** (C6), **UI anglaise** (E2), saisie via **pop-ups natifs** (M2), **boutons morts** (M3), **suppressions sans filet** (C5, E7), **écran blanc possible** (C4), **pas de fiche client** (E9), **aucun pilotage saisonnier** (M15).

### 💍 Sarah — la cliente indécise
Elle paie **une vision, pas du papier**, et change souvent d'avis. L'outil doit projeter une **autorité créative** et **cadrer ses hésitations**. Aujourd'hui : le devis est une **liste de prix** (E1), **pas de versions** pour comparer « option A vs B » (C3), et le **PDF est cassé/Helvetica** (C1) — l'inverse de l'effet premium.

### 👰 Eden — la cliente décidée (qualité + réactivité)
Elle veut **un prix stable, un rendu impeccable, de la vitesse**. Aujourd'hui : **total PDF ≠ écran** (C2), **prix qui bouge** (C3, E4), **flux export tout-ou-rien** (E6), **races à la navigation** (M6), **look générique** (E8).

### 📋 Claire — la wedding planner (canal n°1)
Elle veut **fiabilité, stabilité prix/délai, visibilité, autonomie**. Aujourd'hui : **aucune visibilité d'échéances** (E3) — `event_date` jamais montré, pas de vue jalons/à-risque —, **prix instable** (C3), **KPIs faux** (E5), crédibilité minée par l'**UI anglaise** et les **contrastes faibles** (E2, F4).

---

## 6. Recommandations priorisées (entrée Phase 2)

> Matrice indicative effort × impact. La priorisation **définitive** (séquencée sur les heures de Sacha et le calendrier de saison) sera produite en Phase 3.

### ⚡ Quick wins — faible effort, fort impact
- **Empêcher l'écran blanc** : fallback `PipelineBadge` + Error Boundary + alignement de l'enum pipeline (C4).
- **Borner les remises** + avertissements (E4).
- **Confirmation** avant suppression d'item ; `on delete restrict`/soft-delete des paiements (C5).
- **Cohérence des totaux** PDF↔écran + glyphe **₪** (C2, M1).
- **Câbler ou retirer** les boutons morts (M3) ; remplacer les `prompt()` par des modales (M2).
- **Réintégrer `bit`** (M7) ; retirer `xlsx`, ajouter un CI minimal (F1).

### 🏗️ Chantiers structurants — effort moyen/fort, fort impact
- **Réparer + repenser le devis/PDF** en « proposition de vision » (C1, E1, F3) — l'objet de marque central.
- **Stabiliser le prix** : acceptation + verrou + versionnement + remise relue (C3).
- **Localisation FR (+ ₪)** de l'UI et du PDF — hébreu/RTL différé (E2, M1).
- **Responsive** complet (C6).
- **Visibilité planner** : `event_date` + échéances/relances + vue « à risque » (E3).
- **Fiche/historique client** (E9) ; **réconciliation KPIs + saisonnalité** (E5, M15).
- **Discipline design-system** + voix serif (E8, M9) ; **sécurisation données** (types générés, FK, CHECK — M4, M5).

---

## 7. Questions ouvertes / hypothèses à valider

1. **Audit statique uniquement** : confirmer par un build le **rendu PDF réel** (polices) et la **taille du bundle** (les 3,5 Mo de `pdf-fonts.ts` importés statiquement — `src/lib/pdf-quote.ts:2`).
2. **Données existantes** : y a-t-il déjà en base des projets dans un stage hérité (`lead`/`confirmed`/`paid`) ? (impact migration C4).
3. **Multi-utilisateur** : Sacha seule, ou + Nessim/assistant ? (table `profiles` fantôme, RLS — M4, M14).
4. **Bit** : à réintégrer comme moyen de paiement (M7) ?

> **Décisions validées (post-Phase 1) :** cycle de vie projet à **5 états** — Quoted → Accepted → In Progress → Delivered → Paid ; **français d'abord** (UI + PDF + ₪), hébreu/RTL différé ; **Phase 3 = plan uniquement** (aucun code écrit).

---

*Fin de la Phase 1. Prochaine étape — Phase 2 : stratégie & recommandations persona-driven (incl. un volet **IA & open-source**), après votre validation.*
