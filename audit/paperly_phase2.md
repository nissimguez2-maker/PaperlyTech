# Audit Paperly Studio — Phase 2 : Stratégie & recommandations

> **Suite de** `audit/paperly_phase1.md` (état des lieux). Ce document traduit les constats en **stratégie produit** et en **recommandations concrètes**, prêtes à devenir un plan en Phase 3.
> **Méthode :** 6 spécialistes en parallèle (exigences produit & modèle KPI · benchmark premium · refonte du devis · parcours cibles · direction UI/design-system · IA & open-source), tous ancrés dans le code (`fichier:ligne`) et dans la Phase 1.
> **Décisions validées (cadre de ce round) :**
> - Cycle de vie projet à **5 états** : `Devisé → Accepté → En production → Livré → Payé`.
> - **Français d'abord** (UI + devis/PDF), devise en **₪** ; hébreu/RTL **différé**.
> - **Phase 3 = plan uniquement** (aucun code écrit) → ici on produit des specs et des critères d'acceptation.
> - **Aucune segmentation par type de client** dans l'outil : les améliorations sont des **capacités universelles** (elles valent pour *tout* client / projet).

---

## 1. Résumé exécutif — la thèse produit

L'outil doit cesser d'être un **facturier d'administration anglophone** pour devenir l'**atelier numérique d'une direction artistique premium** : un outil qui, à chaque écran, fait *« vendre la vision, pas le support »*, protège le prix une fois convenu, donne des chiffres justes, et se laisse piloter d'une main depuis un téléphone — en français.

Cinq chantiers structurants en découlent :

1. **La proposition « vision avant prix ».** Réparer le devis/PDF (polices cassées, total PDF ≠ écran) et le **réordonner** : la vision créative d'abord, les systèmes visuels ensuite, le chiffre en dernier — l'objet de marque que le client garde. *(C1, C2, E1, E8, F2, F3, M1, M8)*
2. **Le cycle de vie & la stabilité du prix.** Donner une **sémantique stricte** aux 5 états ; l'**acceptation verrouille** le prix ; toute reprise crée une **version**. Le prix ne « remonte » plus jamais en silence. *(C3, E4, dérive d'enum C4 côté données)*
3. **Le pilotage juste.** Des KPIs **réconciliés** (Signé / Encaissé / Restant dû, sans double-comptage), des **échéances lisibles** (date d'événement vs livraison, « à risque »), et une **lecture de saison**. *(E5, M11, M13, M15, E3)*
4. **La robustesse & la confiance de l'opératrice.** Rendre l'outil **responsive/mobile**, anti-écran-blanc, anti-perte de données, séparer **brouillon vs envoi**, exploiter enfin la **fiche client**, le tout en **FR + ₪**. *(C4, C5, C6, E6, E7, E9, E2, M1, M2, M3, M7)*
5. **La direction visuelle & le design system.** Activer la **voix serif**, **tokeniser** (un seul jeu de rayons/ombres/typo, plancher 12px AA), des **états partagés** (loading, skeleton, confirm FR), une **signature de marque unique**. *(E8, M9, F2, F4, F5, F8)*

Le tout enrichi d'un **volet IA & open-source** (multiplicateur d'ops/texte, jamais de la création) et balisé par un **benchmark premium** (en prendre l'intention, pas la surface).

---

## 2. Sept principes de parcours (la règle du jeu)

1. **Séparer écrire / vérifier / envoyer.** Un brouillon n'est jamais un envoi ; export et acceptation sont des gestes engageants, horodatés, confirmés — fin du « tout-ou-rien » et des projets fantômes *(E6)*.
2. **Toujours montrer l'état de sauvegarde, jamais écrire en silence.** `Brouillon non enregistré → Enregistré 14:02` *(E7)*.
3. **Le prix accepté est immuable.** L'acceptation verrouille le montant ; modifier = créer une version datée *(C3)*.
4. **Rendre le temps lisible.** Afficher le couple *événement vs livraison*, dériver « à risque »/« en retard », exposer des jalons *(E3)*.
5. **Des chiffres qui se réconcilient.** Signé / Encaissé / Restant dû, sans double-comptage, en ₪, avec repères de saison *(E5, M15)*.
6. **Le client est une entité, pas une étiquette.** Coordonnées exploitées + historique 360°, au service d'une relation longue *(E9)*.
7. **Pensé pour le pouce, en français, sobre.** Colonne unique + onglets bas sur mobile ; voix serif pour « la vision », les noms, les états vides — qu'une capture soit immédiatement « Paperly » *(C6, E1/E8, E2/M1)*.

---

## 3. Chantier 1 — La proposition « vision avant prix »

**Problème (Phase 1).** `pdf-quote.ts` produit une **facture anglophone en Helvetica** (« QUOTE », tableau Description/Qty/Price, footer `paperly.com`) dont **le total diffère de l'écran** — confirmé : `1 490,5` à l'écran vs `1 491` au PDF. On vend le prix avant la valeur.

### 3.1 Structure cible du document (narration, pas tableur)

| Section | Rôle | Police | Constat |
|---|---|---|---|
| **Couverture signée** — « Proposition », nom du client en grand, **date d'événement**, référence | Poser la marque + l'événement *du client*, zéro chiffre | Cormorant | E1, F2 |
| **« La vision / Direction créative »** — 1–2 paragraphes d'intention | **Vendre la vision avant tout chiffre** | Cormorant italic | E1, E8 |
| **Systèmes visuels** — prestations **groupées par système** (Papeterie · Signalétique · Scénographie · Pièces originales…) | Faire penser en « systèmes cohérents », pas en articles | Cormorant (titres) + DM Sans (lignes) | E1, M8 |
| **Récapitulatif chiffré discret** — Sous-total / Remise / Total, en bas | Le chiffre est l'aboutissement, pas l'argument | DM Sans | C2, E4, M1 |
| **Validation / Acceptation** — validité + zone « bon pour accord » (ou bandeau « Acceptée ») | Matérialiser l'état `Accepté` | DM Sans + Cormorant | C3 |
| **Footer éditorialisé signé Sacha** — remerciement + **coordonnées réelles** + **prochaine étape** | Humaniser, donner le prochain geste | Cormorant italic + DM Sans | F3, F2 |

**Non négociable :** la **vision** (serif) est structurellement **au-dessus** du tableau de prix. C'est le cœur du repositionnement.

### 3.2 Blueprint de copie FR (extraits)
« **PROPOSITION** » (remplace « QUOTE ») · « **Préparé pour** » · « **Date de l'événement** » vs « **Date de livraison** » · « **La vision** » · noms de systèmes (Papeterie/Signalétique/Scénographie/Pièces originales) · « **Sous-total / Remise / Total** » · « **Cette proposition est valable {30} jours** » · « **Bon pour accord — {client}** » · « **Merci de votre confiance.** » · « **Prochaine étape : répondez pour valider, nous réservons votre date.** ». Tagline unique : **« Direction créative d'événements d'exception »**.

### 3.3 Réparations techniques (specs Phase 3)
- **Polices (C1).** Embarquer de **vrais TTF** (Inter Regular/Medium/Bold + Cormorant déjà valide). **Garde-fou : test de fumée au build** qui décode chaque police et vérifie l'en-tête (`00 01 00 00`/`OTTO`) — échoue le build sinon. Charger `pdf-fonts` en **import dynamique** (3,5 Mo hors du bundle principal). Structurer pour accueillir une police hébreu **plus tard** (différé).
- **Montants (C2/M1).** **Un seul formateur** dans `src/lib/utils.ts` : `Intl.NumberFormat('fr-FR', { style:'currency', currency:'ILS' })` → **« 1 490,50 ₪ »**, 2 décimales. Les montants sont **calculés une seule fois en amont** (arrondi à la ligne `Math.round(x*100)/100` **puis** somme), **stockés**, et **passés tels quels** au PDF — le PDF ne recalcule rien. Vérifier `subtotal − remise === total` avant export. Dates via `date-fns/locale/fr` (« 13 avril 2026 »).
- **Acceptation sur le document.** État `Accepté` → libellé « Total » devient **« Montant convenu »** (figé), bandeau sobre « Proposition acceptée le {date} », référence + version affichées. Le PDF **reflète** l'état, ne le crée pas.

---

## 4. Chantier 2 — Cycle de vie & stabilité du prix

**Problème (Phase 1).** Aucun verrou : éditer une ligne réécrit `subtotal = total` (la remise saute, C3), `version` est figé à 1, et l'enum diverge (6 en base / 3 dans l'app → projets invisibles + crash badge, C4).

### 4.1 Sémantique des 5 états

| État (libellé FR / enum) | Signification | Entrée | Effet sur le devis / données |
|---|---|---|---|
| **Devisé** (`quoted`) | Proposition envoyée, en attente | Envoi d'une proposition (client + ≥1 ligne + v1). Défaut d'enum corrigé en `quoted` | Devis **éditable** ; chaque envoi incrémente `version` |
| **Accepté** (`accepted`) | **Devis verrouillé** — prix contractuel | Action explicite « Marquer accepté » sur une version | **VERROU (corrige C3)** : lignes/remise/total/`delivery_date` **figés** ; toute modif = **nouvelle version** ; on enregistre la version acceptée + `accepted_at` |
| **En production** (`in_progress`) | Production en cours | Depuis `Accepté` ; génère les tâches **une seule fois** (logique unifiée, M10) | Devis accepté toujours verrouillé |
| **Livré** (`delivered`) | Livrables remis | Depuis `En production`. *Décision à acter : livraison indépendante du paiement* (ne pas mélanger les axes) | `event_date`/`delivery_date` exposés |
| **Payé** (`paid`) | Dossier **soldé** | **Dérivé, non déclaratif** : `Σ paiements ≥ total accepté` | Ancre du KPI « encaissé complet ». `sumit_done` reste un drapeau opérationnel distinct |

**Conséquences à plan-ifier :** la finance et la fiche projet doivent lire **la version acceptée** comme référence prix (aujourd'hui elles lisent « la dernière version », `finance.tsx:28`, `project-detail.tsx:59-64`). `Payé` dérivant des paiements, il faut **protéger les paiements** (C5 : `on delete restrict`/soft-delete) sinon l'état devient incohérent.

### 4.2 Acceptation = point de bascule (verrou)
Un seul geste `[Marquer comme acceptée]` → feuille de confirmation (montant verrouillé, dates) → état `Accepté` + **cadenas**. Pour modifier après coup : **`[Créer une révision (v2)]`** qui clone et déverrouille la copie, en conservant l'original signé daté. Badge « 🔒 Prix verrouillé · 2 250 ₪ · accepté le 3 juin » visible en fiche, liste et PDF.

### 4.3 Versions & options (un même besoin, deux mécaniques)
- **Versions v1/v2** = historique daté d'une proposition qui évolue (capitalise `quotes.version`, aujourd'hui mort). Une version envoyée est **immuable** ; toute reprise crée une v+1.
- **Options A/B** = variantes **parallèles** présentées pour un même choix (« Élégance » vs « Signature ») ; le client en retient une (`[Retenir cette option]`), l'autre est archivée (jamais perdue). Recalcul qui **relit toujours la remise** (`discount_mode/value`) — fin de l'écrasement C3.

```
┌─────────────────────────────────────┐
│ ‹ Accepté ›   🔒 Prix verrouillé     │
│ 2 250 ₪ · accepté le 3 juin          │
│ [ Créer une révision (v2) ]          │  ← seule façon de modifier un devis accepté
└─────────────────────────────────────┘
```

---

## 5. Chantier 3 — Pilotage juste (KPI, échéances, saison)

**Problème (Phase 1).** « In My Pocket » somme **tous** les paiements pendant que « Quoted » compte par stage → **double-comptage** d'un acompte ; aucun « restant dû » global (E5). `event_date` jamais affiché (E3). Aucune tendance/saison (M15).

### 5.1 Modèle KPI réconcilié (trois grandeurs orthogonales)

| Indicateur | Définition | Source |
|---|---|---|
| **CA signé** | Valeur contractuelle des affaires **acceptées** | Σ `total` de la **version acceptée** (Accepté + En production + Livré ; + Payé pour le cumul) |
| **Encaissé** | Argent **réellement reçu** | Σ `payments.amount` (attribution mensuelle en **heure locale Israël**, corrige M13) |
| **Restant dû** | Reste à encaisser sur le signé | Σ max(0, `total accepté − Σ paiements`), par projet puis sommé |

> **Indicateurs complémentaires :** **Pipeline proposé** = Σ devis au stade `Devisé` (≠ CA signé, ne **jamais** additionner avec l'encaissé). **Trop-perçu** = Σ max(0, paiements − total accepté), **visible** au lieu d'être tronqué à 0 (corrige M11).

**Qui alimente quoi (anti double-comptage) :**

```
                 Devisé      Accepté   En prod.   Livré     Payé
Pipeline proposé   ✔ (devis)   –         –          –         –
CA signé           –           ✔         ✔          ✔        (cumul opt.)
Encaissé           ✔ acomptes  ✔         ✔          ✔         ✔
Restant dû         –           ✔         ✔          ✔         0
```
Règles d'or : (1) un devis alimente *Pipeline proposé* **ou** *CA signé*, jamais les deux ; (2) les paiements alimentent *Encaissé* seul ; (3) *Restant dû* est **toujours dérivé**, jamais stocké.

### 5.2 Échéances & « à risque » (corrige E3)
Vue **Échéances** : projets actifs triés par date, avec **double date** (« Livraison 29 août · Événement 12 sept. »), jours restants, jalons cochables, et statut **dérivé** : `À risque` (ambre) si `delivery_date ≤ J+7` et pas encore en production ; `En retard` (corail) si `delivery_date < aujourd'hui` et non livré ; `OK` (forêt) sinon.

```
┌─────────────────────────────────────┐
│ Échéances           [À risque][Sem.] │
│ ▸ Période chargée : mai–juillet      │  ← repère saisonnalité (M15)
│ ‹À risque› Levy — Mariage            │
│ Livraison 29 août · Événement 12 sept│  ← event_date ENFIN exposé (E3)
│ J‑6 · ‹Accepté›   Jalons ▰▰▱▱ 2/4    │
│ ‹En retard› Azoulay — Brit  [ Voir ] │
└─────────────────────────────────────┘
```

### 5.3 Saison (corrige M15)
Bandes « accalmie » sur la courbe mensuelle (**Tishri**, **nov.–janv.**), comparatif **vs mois précédent / N‑1**, et passerelle vers la fiche client pour **relancer d'anciens clients** en période creuse (réutilisation premium, jamais du spam). Aucune tactique low-cost/volume.

---

## 6. Chantier 4 — Robustesse & confiance opératrice

| Sujet | Cible | Critère d'acceptation | Constat |
|---|---|---|---|
| **Coque responsive/mobile** | Sidebar → **drawer + barre d'onglets basse** (Accueil · Propositions · Projets · Échéances · Finance) ; grilles `grid-cols-1 md:grid-cols-…` ; tableaux → cartes empilées ; cibles ≥ 44px | Sur mobile, rien ne déborde, la sidebar ne mange pas l'écran, actions clés au pouce ; desktop inchangé | C6 |
| **Anti-écran-blanc** | Fallback `PipelineBadge` (`?? quoted`) + **Error Boundary** premium + enum aligné sur 5 états | Un stage inattendu affiche un badge neutre (pas de crash) ; une exception affiche un écran soigné | C4 |
| **Anti-perte de données** | **Confirmation** avant suppression d'item ; paiements en `on delete restrict`/soft-delete ; projet avec paiements non supprimable | Supprimer un item demande confirmation ; un projet payé ne perd jamais ses paiements | C5 |
| **Brouillon vs envoi** | Deux actions séparées (`Enregistrer` / `Aperçu & Envoyer`) ; transaction atomique à l'envoi | Échec partiel ⇒ **aucun** projet/devis orphelin ; le brouillon reste intact | E6, M6 |
| **Feedback de sauvegarde** | Indicateur `Enregistré 14:02` ; debounce visible, plus d'écriture à chaque frappe | Après édition, un état confirme l'enregistrement ; pas de rafale réseau | E7 |
| **Fiche client & historique** | Annuaire + fiche (email/phone/notes **exploités**) + historique 360° (propositions/projets/paiements) + `[Email]`/`[Appeler]` | Depuis un client : coordonnées éditables + historique complet en une vue | E9 |
| **FR + ₪ de surface** | Navigation, libellés de stage, méthodes de paiement (**Bit réintégré**, M7), `prompt()`→modales, boutons morts câblés/retirés | Aucune chaîne anglaise orientée client ; ₪ partout ; aucun `prompt()` natif ni bouton sans effet | E2, M1, M2, M3, M7 |

```
┌─────────────────────────────────────┐        ┌─────────────────────────────────────┐
│ ☰  Paperly · Échéances        ⌕  ⚙ │        │ ‹ Retour   Nouvelle proposition     │
├─────────────────────────────────────┤        │ ● Brouillon · Enregistré 14:02   ⤓  │
│  (contenu colonne unique, cartes)   │        │ CLIENT (Noa Levy ▾) ‹fiche ↗›       │
│                                     │        │ Événement (12 sept.) Livraison (29/8)│
├─────────────────────────────────────┤        │ LA VISION (serif)  ( … )            │
│ ⌂     ⎙      ▤      ⏱     ₪          │        │ ▾ PAPETERIE … ▾ SCÉNOGRAPHIE …       │
│Accueil Prop. Projets Éch. Finance    │        │ TOTAL 2 250 ₪                       │
└─────────────────────────────────────┘        │ [ Enregistrer ]  [ Aperçu & Envoyer ]│
   ☰ : Clients · Catalogue · Fournisseurs       └─────────────────────────────────────┘
```

---

## 7. Chantier 5 — Direction visuelle & design system

**Règle d'or mémorisable : *le serif parle, le sans-serif compte.*** Cormorant (dont l'**italique**) porte titres, accroches, sous-titres, états vides et le mot *« vision »* ; DM Sans porte **tout** le chiffré et tout contrôle (un prix, une date, un statut, un bouton n'est **jamais** en serif).

- **Tokens uniques (corrige M9, F4).** Rayons `--radius-sm 6 / md 10 / lg 16 / pill` (emploi unique : Input=sm, Button=md, Card/Modal=lg, Badge=pill) ; espacement base‑4 ; ombres **chaudes** (teintées `bark`) en 4 crans ; échelle typo à **plancher 12px** (les 18× `text-[10px]` remontent) ; **contrastes AA** (placeholder `text-muted`, jamais `text-sand`). **Règle anti-dérive : tout passe par `ui/*`, aucune valeur arbitraire dans les pages.**
- **États partagés & premium (corrige F5).** Ajouter `loading` au **Button** ; créer **Spinner** + **Skeleton** (remplacent 8 spinners recopiés) ; **un seul** `ConfirmDialog` (à **franciser** : Annuler/Confirmer) ; **un seul** anneau de focus (retirer les `focus-visible:ring` locaux au profit du focus global). *Bonne nouvelle : `ConfirmDialog`/`EmptyState`/`Toast` existent déjà.*
- **Signature de marque unique (corrige F2).** Même lockup (monogramme « P » + « Paperly » Cormorant + tagline) et **même tagline Cormorant italic** — *« Direction créative d'événements d'exception »* — sur **login, sidebar et PDF** ; couleur de signature `gold-dark`, `navy` réservé au fonctionnel.

---

## 8. Volet IA & open-source

**Principe non négociable :** l'IA est un **multiplicateur d'ops / texte / structure**, **jamais** un substitut à la direction artistique de Sacha, jamais un outil de standardisation du rendu. **Architecture commune :** une **famille d'Edge Functions Supabase** héberge tous les appels ; **toutes les clés** vivent côté serveur (Supabase secrets / n8n), **jamais** en `VITE_*` ; et **l'IA produit un brouillon que Sacha valide**.

| # | Proposition (problème + constat) | API / lib (OSS/free-tier) | Clés | Effort | Garde-fou premium |
|---|---|---|---|---|---|
| **IA‑1** | **Pré-remplissage du devis** depuis un brief court (lenteur du devis, E6/E7) | **Claude** (Haiku) en *function-calling* **borné au catalogue réel** | Edge Function (secret) | M | L'IA **ne fixe aucun prix** (catalogue), ne valide rien : brouillon **toujours** revu |
| **IA‑2** | **Copie FR premium** du bloc « La vision » (E1, E2, E8) | Claude / Mistral (free-tier) + **prompt de marque** versionné | Edge Function (secret) | S→M | Sacha **maîtresse du fond** : 2–3 variantes proposées, jamais auto-insérées |
| **IA‑3** | **Rappel sémantique** de projets passés — réutiliser un système (E9, M15) | **Supabase `pgvector`** + embeddings **locaux** (Transformers.js, données ne sortent pas) | Aucune clé externe | M→L | Outil de **rappel**, pas de génération ; aucune copie auto d'un ancien rendu |
| **IA‑4** | **Email premium + rappels d'échéances** (E3, E9, M15) | **Resend** (free-tier) orchestré par **n8n** (déjà dispo) sur webhook Supabase | n8n / secret | M | Gabarits FR **pré-validés** ; option « brouillon Gmail à valider » |
| **IA‑5** | **ICS / calendrier** pour `event_date`/`delivery_date` (E3, M13) | lib `ics` (Edge) ou n8n → Google Calendar | Aucune/serveur | **S** | Purement opérationnel ; dates en **local Israël** |
| **IA‑6** | **Option modèle local** (confidentialité données clients) (E9, M14) | **Ollama** / embeddings locaux | Aucune clé externe | L | Renforce le premium (discrétion) ; reste **optionnel** |

**Quick wins IA prioritaires :** **IA‑5** (ICS, effort S, 0 ₪, 0 risque) → **IA‑4** (email + rappels, s'appuie sur n8n) → **IA‑1** (pré-remplissage borné au catalogue). À séquencer ensuite : **IA‑2** (une fois le bloc « vision » en place) puis **IA‑3** (chantier hors-saison).

---

## 9. Benchmark premium — à adopter / à éviter

> On prend l'**intention** d'outils grand public (Qwilr, Proposify, Programa, Dubsado/HoneyBook…), **pas leur surface** : Paperly reste un outil interne minimal.

**À adopter :** proposition réordonnée *vision → systèmes → prix* et renommée « Proposition » ; **acceptation explicite qui fige un instantané de prix** + date de validité ; **versionner au lieu d'écraser** ; **options dans une seule proposition** ; **vue d'échéances en lecture** (dates, « à risque ») ; **signature serif + whitespace** (« faire cher » par la retenue).

**À éviter (anti-premium) :** le **devis-facture** (tableau de prix brut) ; les **boutons morts** (« fait gratuit ») ; le **portail lourd à compte obligatoire** (préférer, si un jour besoin, un **lien privé sans login**) ; la **sur-configuration** façon Dubsado pour 2 personnes ; le **feature-creep** ; l'**auto-save silencieuse**.

---

## 10. Recommandations priorisées → entrée Phase 3

> Matrice indicative effort × impact. La séquence définitive (sur les heures de Sacha et la fenêtre « 2.0 des outils » de juil.–août) sera arrêtée en Phase 3.

### ⚡ Quick wins — effort faible, impact fort
- **Anti-écran-blanc** : fallback badge + Error Boundary + alignement enum 5 états *(C4)*.
- **Réparer les polices PDF** + **smoke-test au build** *(C1)*.
- **Un seul formateur ₪/2 décimales** partagé écran↔PDF *(C2, M1)*.
- **Borner les remises** (`[0, sous-total]`, alerte) *(E4)*.
- **Confirmation** avant suppression d'item ; **protéger les paiements** *(C5)*.
- **Câbler/retirer** les boutons morts ; **`prompt()` → modales** ; **réintégrer Bit** *(M3, M2, M7)*.
- **Franciser** la nav + `ConfirmDialog` + libellés de stage *(E2)*.

### 🏗️ Chantiers structurants — effort moyen/fort, impact fort
- **Refonte du devis en « proposition de vision »** *(Chantier 1)*.
- **Acceptation/verrou + versions/options** + lecture « version acceptée » partout *(Chantier 2)*.
- **Modèle KPI réconcilié + échéances + saison** *(Chantier 3)*.
- **Coque responsive** + **brouillon vs envoi** + **feedback de sauvegarde** *(Chantier 4)*.
- **Fiche/historique client** *(E9)*.
- **Design system tokenisé + voix serif + signature unique** *(Chantier 5)*.
- **Quick wins IA** (ICS → email/rappels → pré-remplissage) *(Volet IA)*.

---

## 11. Traçabilité — constats Phase 1 → traitement Phase 2

| Constat | Traité dans |
|---|---|
| C1 polices PDF | Ch.1 §3.3 (TTF + smoke-test) |
| C2 total PDF≠écran | Ch.1 §3.3 (formateur unique, calcul amont) |
| C3 prix instable / versions | Ch.2 (verrou, versions/options, lecture version acceptée) |
| C4 enum / écran blanc | Ch.2 §4.1 + Ch.4 (fallback + Error Boundary) |
| C5 suppressions destructrices | Ch.4 (confirmation + protection paiements) |
| C6 desktop-only | Ch.4 (coque responsive) |
| E1/E8 devis liste de prix / serif | Ch.1 + Ch.7 (voix serif) |
| E2/M1 anglais / ₪ | Ch.4 + Ch.7 §FR/₪ |
| E3 visibilité échéances | Ch.3 §5.2 (event_date, « à risque ») |
| E4 remises non bornées | Ch.1 §3.1 + roadmap quick wins |
| E5/M11/M13 KPI | Ch.3 §5.1 |
| E6/E7 export/auto-save | Ch.4 (brouillon vs envoi, feedback) |
| E9 fiche client | Ch.4 (annuaire + historique) |
| M2/M3/M7 polish/paiement | Ch.4 + roadmap quick wins |
| M8 lignes de revenu | Ch.1 (groupement par système) — `revenue_type` à plan-ifier |
| M9/F4/F5/F2/F8 design system | Ch.7 |
| M15 saisonnalité | Ch.3 §5.3 |

---

## 12. Questions ouvertes pour la Phase 3 (plan)

1. **`Livré` vs `Payé` :** confirmer que la livraison est **indépendante** du paiement (recommandé), ou conserver le « gate » actuel (blocage si solde dû) ?
2. **Migration des données** : des projets existent-ils dans un stage hérité (`lead`/`confirmed`/`paid`) à migrer vers les 5 états ?
3. **Options A/B** : besoin réel à court terme, ou versions v1/v2 suffisent dans un premier temps ? (impacte le modèle « propositions groupées par projet »)
4. **`revenue_type`** (imprimés/digitaux/originaux) et **bundles** : à intégrer dès cette vague (reporting par activité) ou plus tard ?
5. **IA** : quels quick wins activer en premier (ICS, email/rappels, pré-remplissage) et qui opère les Edge Functions / n8n (Nessim) ?

---

*Fin de la Phase 2. Prochaine étape — Phase 3 : **plan d'action priorisé** (séquence, migrations proposées, critères d'acceptation, checklist de tests), **sans écrire de code**, après votre validation.*
