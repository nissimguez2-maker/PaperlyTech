# Paperly Studio — Design Pass (White / Cream / Coffee) + Calculateur

> **What this is:** a single, ready-to-build design brief consolidating **8 agency agents** (Brand Guardian · Visual Storyteller · UX Architect · UI Designer · Whimsy Injector · Inclusive Visuals · Product Manager · Frontend Developer). It defines the new **white/cream/coffee** identity, fresh **fonts**, tokenized **spacing/layout**, **component** specs, **motion**, **accessibility** rules, and the **Calculateur · pièces uniques** feature.
> **Status:** SPEC ONLY — no app code was changed in this pass. Implementation is a separate task; the sequenced plan is in §10.
> **Locked direction:** palette = white + cream + coffee (move off navy/forest/gold/coral as dominant); replace Cormorant/DM Sans; generous, tokenized spacing; premium by restraint; UI = French, ₪; mobile matters (Sacha on her phone).

---

## 1. The keystone implementation strategy (agreed by Brand + Frontend agents)

**Remap token *values*, keep token *names*.** The codebase has **335 color-class usages across 24 files** (`muted` 105, `bark` 72, `sand` 68, `gold` 68, `gold-dark` 62, `forest` 51, `cream` 44, `coral` 43, `navy` 29 …). Renaming tokens = ~335 edits + regex-collision risk. **Remapping the hex inside `src/index.css` `@theme` re-themes the whole app from ONE file, ~17 lines, zero call-site edits.**

So: the old names (`gold-dark`, `navy`, `forest`, `coral`, `cream`, `bark`, …) live on as **aliases** pointing at the new coffee palette. `bg-navy` etc. instantly render warm. A later optional pass can rename to semantic tokens file-by-file with no visual regression.

The single biggest move: **`gold-dark` → mocha `#7A5A41`** becomes the one brand action color (it was `#9E8468`, which *failed* AA on white buttons — mocha fixes accessibility and delivers the brand color at once).

---

## 2. Ready-to-paste `@theme` (drop-in replacement for `src/index.css` lines 4–23)

```css
@theme {
  /* ── New semantic surfaces / text (for the optional rename pass) ── */
  --color-canvas:       #FAF7F2;  /* app background (warm foam-white) */
  --color-surface:      #FFFFFF;  /* cards */
  --color-raised:       #F3EDE4;  /* hover / inset */
  --color-sunken:       #EBE3D7;  /* tracks, wells */
  --color-hairline:     #E4DBCE;  /* default border */
  --color-ink:          #2A211A;  /* primary text  (12–13:1) */
  --color-ink-soft:     #5C4F43;  /* secondary     (7.6:1)  */
  --color-on-coffee:    #FBF8F3;  /* text on coffee buttons */

  /* ── Coffee scale (foam → espresso) ── */
  --color-coffee-50:  #F3EDE4;  --color-coffee-100: #E4D5C3;
  --color-coffee-200: #C9B59C;  --color-coffee-300: #A8856A;
  --color-coffee-400: #7A5A41;  /* primary */
  --color-coffee-500: #5A3F2C;  /* hover/active */  --color-coffee-600: #3D2C1F;

  /* ── Brand action + quiet state accents ── */
  --color-primary:      #7A5A41;  --color-primary-hover: #6A4D37;  --color-primary-active: #5A3F2C;
  --color-success:      #5E7355;  --color-success-bg:   #E7EAE0;   /* muted sage */
  --color-danger:       #9C5B4A;  --color-danger-bg:    #F4E7E2;   /* muted clay */

  /* ── Compatibility ALIASES (old name → warm hex): instant reskin ── */
  --color-cream:       #FAF7F2;   /* canvas */
  --color-cream-dark:  #EBE3D7;   /* sunken */
  --color-sand:        #D8CDBC;   /* borders / neutral chip */
  --color-gold:        #C9B59C;   /* coffee-200 accent */
  --color-gold-dark:   #7A5A41;   /* ★ PRIMARY mocha (was #9E8468) */
  --color-bark:        #2A211A;   /* ink */
  --color-muted:       #6E6256;   /* ★ darkened per a11y (was #9A918A — failed AA) */
  --color-navy:        #6A4D37;   /* warm coffee mid (info/in-progress text) */
  --color-navy-bg:     #EADBC8;   /* warm tint (was blue) */
  --color-navy-dot:    #A8856A;   /* caramel */
  --color-forest:      #5E7355;   /* success sage */
  --color-forest-bg:   #E7EAE0;
  --color-forest-dot:  #8CA081;
  --color-coral:       #9C5B4A;   /* danger clay */
  --color-coral-bg:    #F4E7E2;

  /* ── Fonts (see §4) ── */
  --font-display: "Fraunces", Georgia, "Times New Roman", serif;
  --font-body:    "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;

  /* ── Radii ── */
  --radius-sm: 0.5rem;  --radius-md: 0.75rem;  --radius-lg: 1rem;  --radius-xl: 1.25rem;  --radius-pill: 9999px;

  /* ── Warm-tinted shadows (bark alpha, not black) ── */
  --shadow-xs: 0 1px 2px 0 rgba(61,53,48,.04);
  --shadow-sm: 0 1px 3px 0 rgba(61,53,48,.06), 0 1px 2px -1px rgba(61,53,48,.05);
  --shadow-md: 0 4px 12px -2px rgba(61,53,48,.08), 0 2px 6px -2px rgba(61,53,48,.05);
  --shadow-lg: 0 12px 28px -6px rgba(61,53,48,.12), 0 6px 12px -6px rgba(61,53,48,.06);

  /* ── Spacing scale (4px base) ── */
  --spacing-1:.25rem; --spacing-2:.5rem; --spacing-3:.75rem; --spacing-4:1rem;
  --spacing-5:1.25rem; --spacing-6:1.5rem; --spacing-8:2rem; --spacing-10:2.5rem;
  --spacing-12:3rem; --spacing-16:4rem; --spacing-20:5rem;
}
```
Also update the non-`@theme` lines in `index.css`: `body { background: var(--color-canvas) }`, scrollbar-thumb → `var(--color-coffee-200)`, and the focus ring (see §8).

---

## 3. Color system & state expression (Brand Guardian)

**Philosophy:** premium by restraint — three hue families (coffee · muted sage · muted clay) carry *every* semantic; color is information, not decoration. The pipeline reads as a **coffee "temperature" journey** (cool latte → rich espresso).

| Pipeline stage | bg | text/dot | AA |
|---|---|---|---|
| Devisé (`quoted`) | `#F3EDE4` | `#6E6256` | ✓ |
| Accepté (`accepted`) | `#EFE3D2` | `#8A5E3C` caramel | ✓ 5.1 |
| En production (`in_progress`) | `#EADBC8` | `#6A4D37` mocha | ✓ 6.2 |
| Livré (`delivered`) | `#E7EAE0` | `#5E7355` sage | ✓ 4.6 |
| Payé (`paid`) | `#E8DFD0` | `#5A3F2C` espresso | ✓ 8.3 |

**Success** (revenue, net+, payé) = sage `#5E7355` / bg `#E7EAE0`. **Danger** (overdue, delete, net−) = clay `#9C5B4A` / bg `#F4E7E2`. **Revenue-type chips:** Imprimés = mocha, Numériques = sage, Pièces originales = clay, Non classé = `#C9B59C` (always paired with an icon/label — never color-only, see §8).

---

## 4. Typography (Visual Storyteller)

**Pairing: Fraunces (display serif) + Inter (body).** Fraunces brings warm editorial character (with a beautiful display italic for the "vision" voice) where Cormorant was fragile; Inter is more legible for dense French/₪ data than DM Sans. *Alternate: Newsreader + Inter (calmer).*

Replace `index.html` line 10 with:
```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
```

Type scale (add to `@theme` as `--text-*`): display 44 / h1 30 / h2 22 / h3 17 / lead 17 / body 14 / sm 13 / **label 12 (hard floor)** — with line-heights 1.05→1.55 and tightening letter-spacing on display. **Serif = the voice** (titles, KPI numbers, "vision", empty-state italics); **Inter = everything functional**; **tabular-nums on all money**. Body gets `font-feature-settings: "cv05","ss01"` and headings `font-optical-sizing: auto` + `text-wrap: balance`.

---

## 5. Spacing, layout, radii, shadows (UX Architect)

**The rule (put atop `index.css`):** *no arbitrary padding/margin/gap in pages — compose from tokens (`p-card`, `gap-stack`…). If a value doesn't exist, add it to the scale first.* This kills the current five-different-paddings problem (cards `p-5`, rows `px-5 py-4`/`px-4 py-3`/`px-1 py-1.5`).

Semantic spacing aliases: page-gutter mobile 16 / desktop 40 · section 48 · **card 24** · stack 24 · list-row 12×20 · field 12×16 · KPI-gap 16. Radii: inputs/buttons = `md`, cards/rows/modals = `lg`, badges/dots = `pill`. Shadows: cards rest at `--shadow-sm`, hover `--shadow-md`, modals `--shadow-lg`.

**Responsive** (app is desktop-only today — `fixed w-60` sidebar, `ml-60`, `grid-cols-5/3`): sidebar → **off-canvas drawer + a bottom tab bar** (4 primary destinations) below `lg`; KPI grids `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`; two-col content `grid-cols-1 lg:grid-cols-3`; the quote 7-col line grid → stacked card per line below `md`. Row min-height 56px (≥44px touch).

**Nav placement for the calculator:** **Principal group, right after "Devis"**, label **« Pièces uniques »** / icon `Sparkles` (or `Calculator`), route `/calculator`.

---

## 6. Components (UI Designer)

One elevation language (3 warm steps), one focus ring, tokenized 44px control height so Button/Input/Select align in filter rows. Highlights:
- **Button:** `--radius-md`, generous padding (`px-6` md / `px-4` sm), variants primary(mocha)/secondary(cream-dark)/ghost(borderless)/danger(clay tonal)/success(sage tonal); **add `loading` state** (spinner overlay, width-stable, `aria-busy`).
- **Card:** white surface, `--radius-lg`, **24px padding**, `--shadow-sm`; interactive cards lift to `--shadow-md` + `border-gold/60` + keyboard affordance.
- **Input/Select:** 44px, `--radius-md`, `px-4`, placeholder `muted` (not faint sand); unified focus ring; matching heights.
- **Modal** `--radius-xl` + 32px padding + `--shadow-lg`; **ConfirmDialog** right-aligned actions + loading on confirm.
- **PipelineBadge** (5 stages per §3) + **new `RevenueTypeChip`** (icon + tonal fill, `short` label for dense cells).
- **Extract `Spinner` + `Skeleton`** (currently inlined twice) and a **`ListRow`** primitive (the project/finance rows are the most ad-hoc surface today; also consolidate the hand-rolled delete modal in `projects.tsx` onto `ConfirmDialog`).

---

## 7. Motion (Whimsy Injector)

New `src/lib/motion.ts`: durations `{instant 120, fast 180, base 260}` ms, ease-out `[0.22,0.61,0.36,1]`, soft springs (no bounce), rise ≤8px, 40ms stagger. Variants (`fadeRise`, `listItem`, `modalPanel`, `overlay`) + a `<Reveal>` wrapper + a `<CountUp>` (formats via `fmtCurrency`, paired with `tabular-nums`). Interactions: gentle page fade+rise on route change, card hover lift, list stagger on load, modal/toast spring, button `whileTap` 0.97, **money count-up on the calculator grand total + dashboard KPIs**, progress-bar fill. **All gated by `useReducedMotion()`** (transforms drop to instant opacity). Nothing exceeds 280ms.

---

## 8. Accessibility — hard constraints (Inclusive Visuals)

These **override** any aesthetic choice:
1. **`muted` darkened** to `#6E6256` (old `#9A918A` failed AA on every surface). Body text defaults to `bark`/`ink`.
2. **`gold-dark`/coffee mid = UI/large text only**, never small body (fix `badge.tsx:6` accepté label → `bark`).
3. **12px type floor** — 29 `text-[10px]/[11px]` sites listed by the agent must rise to `text-xs` (incl. error text).
4. **One `:focus-visible` ring everywhere:** `bark`, 2px, 2px offset (remove the divergent `ring-1`/`ring-2` in button/input/select). `bark` clears 3:1 on every surface incl. `sand`.
5. **State never color-only:** revenue bars + deadline urgency need an icon/label too.
6. **Touch targets ≥44px** (sm buttons, modal/toast close, inline edits, inputs on mobile).
7. **`prefers-reduced-motion`** honored (CSS guard + framer-motion).
8. Every input/select has an explicit stable `id` + `<label htmlFor>`; placeholder never the sole label.

---

## 9. Feature — Calculateur · pièces uniques (Product Manager)

Prices bespoke one-offs (revenue line `original`). **Per element:** `name`, `hours`, `rate` (₪/h), `materials[]` (each `{label, qty, unitCost}`), `factor` (default **1.3**, editable). **Formula:**
```
laborCost     = hours × rate
materialsCost = Σ (qty × unitCost)            // raw
elementTotal  = laborCost + materialsCost × factor
grandTotal    = Σ elementTotal
```
- **Flexible exactly as asked:** rate & factor editable **per element** (seeded from page-level defaults), add/remove **materials**, add/remove **elements**, live grand total. `factor < 1` allowed (material discount) with a subtle hint; negatives floored at 0; 2-decimal ₪ via `fmtCurrency` (round once at the end).
- **Per-element breakdown shown:** Main d'œuvre · Matériaux (HT) · Marge matériaux (×factor) · Total de la pièce.
- **Screen:** standalone page (two-col with sticky summary on desktop; single column + sticky bottom total bar on mobile, `inputMode="decimal"`). Full FR microcopy in the PM spec (titles, labels, buttons, toasts, reset confirm).
- **Integration:** `Copier le total` (clipboard) **+ `Ajouter au devis`** → one quote line per element, `quantity 1`, `unitPrice = elementTotal`, **`revenue_type='original'`**, via a `localStorage` handoff (`paperly:quote-prefill`) the quotes page reads on mount. Requires adding optional `revenueType?: RevenueType` to `QuoteItemLocal` and using `it.revenueType ?? art?.revenue_type ?? null` in the insert (small, in-scope).
- **Persistence:** MVP = `localStorage` autosave (draft + defaults: rate **250 ₪/h** placeholder, factor **1.3**); optional later `custom_calculations` Supabase table for saved/named calcs.
- **Architecture:** new `src/pages/calculator.tsx` (mirrors `quotes.tsx` local-state pattern), pure `calcUniquePiece()` helper + `round2` in `utils.ts`, route in `App.tsx`, nav in `sidebar.tsx`. Acceptance criteria (21 testable cases) are in the PM spec; the headline check: element(4h, 250₪/h, material 2×40, ×1.3) → **1 104,00 ₪**; two elements sum live.

---

## 10. Sequenced build plan (Frontend Developer) — for the implementation discussion

Run `npm run build` after each step (it runs `prebuild` font-check + `tsc -b` + `vite build`); commit between steps. **Do NOT touch `src/lib/pdf-fonts.ts`** (the `prebuild` check validates those base64 TTFs — currently green; the web-font swap is independent).

1. **Baseline** build (green now).
2. **Colors** — remap the `@theme` aliases (§2). Whole app reskins; verify contrast in-browser.
3. **Radii/shadows/spacing** tokens (additive).
4. **Fonts** — `index.html` link + `--font-*` (§4).
5. **Surface decision** — keep white cards on cream canvas (recommended) or shift; ~3 files if changed.
6. **Components** — retrofit `Card/Button/Input/Modal/Badge` to tokens + a11y (focus ring, 12px floor, `loading`, `RevenueTypeChip`, extract `Spinner/Skeleton/ListRow`).
7. **Responsive shell** — drawer + bottom-nav; collapse grids.
8. **Motion** — add `motion.ts`, page transition, `<CountUp>`, reduced-motion.
9. **Calculator** — helper + types → page → route + nav → (optional) persistence.
10. **Final** — `npm run build` + lint + full click-through; verify calculator math by hand.

**Risks:** token remap is global (one bad hex hits 24 files — verify visually, not just build); keep all class names literal (Tailwind v4 won't generate computed `bg-${x}`); the on-screen re-theme does **not** change the PDF (separate pipeline — a follow-up if the devis PDF should match).

---

## 11. Open decisions for the build session
1. **Surfaces:** white cards on cream canvas (recommended, "paper" feel) — confirm vs all-cream.
2. **Exact `muted` hex:** `#6E6256` proposed for AA; fine-tune with a contrast checker against tinted surfaces.
3. **Default hourly rate** for the calculator (PM used 250 ₪/h placeholder) — Sacha's real rate.
4. **Calculator persistence:** localStorage-only (MVP) vs add the `custom_calculations` table now.
5. **PDF devis:** re-theme its fonts/colors to match (separate task) or leave as-is for now.
6. **Fonts:** Fraunces+Inter (recommended) vs the Newsreader+Inter alternate.

---

*Eight agency agents, one coherent system. This brief is implementation-ready; nothing here has been applied to the app yet.*
