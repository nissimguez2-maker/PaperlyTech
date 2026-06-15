# Paperly Website — Build Blueprint (v1)

> Consolidated from an 8-agent review panel (AgentsNess, run as Opus agents) against the
> locked website spec. This is the single source of truth for building the Paperly site on Wix.
> _Date: 2026-06-15._

Paperly is an event **artistic-direction studio** in Israel — **not a print shop**. It designs
coherent **visual universes** for premium events (weddings, bar/bat mitzvahs, private
celebrations). The site sells **a vision, not paper**. Sacha is the founder, artistic director,
and public face; Nessim runs strategy, finance, pricing, and tools.

---

## 1. Locked decisions

| Topic | Decision |
|---|---|
| Role | Hybrid: showcase-first portfolio + a small direct-buy section ("The Collection") |
| Primary audience | Private premium clients #1; planners/decorators secondary (referral pricing kept **private/off-site**) |
| Languages | English (default, root) + Hebrew (full RTL mirror, `/he/`) |
| Currency | ILS (₪) |
| Conversion | Exact ready-made match → buy directly; everything custom → WhatsApp/Instagram (no contact form) |
| Showcase | Case studies — one coherent "visual universe" per event |
| Direct-buy section | **"The Collection"** (renamed from "Shop") — 5–10 ready-made printed items |
| Fulfillment | Instant digital download / local courier (~₪50 flat) / studio pickup |
| Custom pricing | Show **"from" floors** (e.g. "from ₪X") — real numbers, anchored up |
| Look | Minimal & editorial; black + off-white + beige accents |
| Contact | WhatsApp `+972 58 617 0698` (`wa.me/972586170698`) · Instagram `@paper.ly_` · email `sachaguez.mt@gmail.com` (planner contact) |

---

## 2. Sitemap & navigation

```
Home
├─ Portfolio                  (case-study index → /portfolio/[universe])
├─ The Collection             (5–10 ready-made items → product pages)
├─ The Studio                 (Sacha + approach)
├─ How It Works               (process + price-as-filter)
├─ Contact                    (WhatsApp + Instagram, no form)
└─ For Planners               (discreet — footer + contextual, NOT in main header)
   Cart / Checkout            (Wix Stores system pages)
```

**Header (desktop, L→R):** `[Paperly logo]` … Portfolio · The Collection · The Studio · How It Works · Contact … `EN | עב` `[Cart]`
- 5 primary items only. "For Planners" stays out of the header (protects "private clients #1").
- Language switch = text toggle `EN | עב` (not a flag), always visible — incl. on mobile, outside the hamburger.
- Cart icon persistent with count.
- Sticky header: transparent over hero → solid off-white on scroll.

**Footer (4 cols):** Brand + one-liner · Explore (Portfolio, The Collection, The Studio, How It Works) · Connect (WhatsApp, Instagram, Contact, **For Planners**) · Practical (Shipping & Pickup, language toggle, ₪/VAT note). © Paperly.

---

## 3. Conversion system (CRO)

**Two conversion verbs only:** **Buy** (The Collection, self-serve) and **Begin your universe / Start your project** (WhatsApp). Never introduce a third.

| Page | Primary CTA | Secondary CTA |
|---|---|---|
| Home | "Start your project" → WhatsApp | "Explore the work" → Portfolio |
| Portfolio index | "Begin a project like this" → WhatsApp | "Shop ready-made" → The Collection |
| Case study | "Create your own universe" → WhatsApp (pre-filled) | "See more universes" |
| The Collection | (per card) "View" → product | "Need something custom? Let's talk" → WhatsApp |
| Product | "Add to cart" | "Ask about this piece" → WhatsApp (pre-filled) |
| The Studio | "Work with Sacha" → WhatsApp | "See the work" |
| How It Works | "Start your project" → WhatsApp | "Browse ready-made" |
| For Planners | "Become a partner" → WhatsApp (pre-filled "Planner enquiry") | "View portfolio" |
| Contact | WhatsApp (largest) | Instagram `@paper.ly_` |

**Rules**
- **Pre-filled WhatsApp** from a project: _"Hi Paperly — I saw the [Project] universe and I'd love to talk about something for my event."_ From a product: _"Hi Paperly — I'm interested in the [Product]."_
- **Sticky floating WhatsApp button** on every page **except** cart/checkout (remove competing prompts at point of purchase).
- **Never** put "Add to cart" and a "from ₪" price on the same surface — the brain reads the cheaper one as the real price. Keep The Collection (priced/transactional) and Portfolio (no price/aspirational) in separate visual languages.
- **Highest-impact change:** a Sacha authority fold in the 2nd fold of Home (face + name + one-line credential) — anxious clients won't message without a person to trust.

**Trust signals:** Sacha's face + credential high on Home and on The Studio; an embedded 3-step "How It Works" strip on Home; real (never fabricated) testimonials — if none yet, use a short signed note from Sacha; planner reliability + "we reply within one business day" line on For Planners/Contact.

---

## 4. Brand voice & messaging (Brand Guardian)

**Voice:** assured · editorial · intimate · discerning · warm-austere · visionary.

**Core message:** _Paperly designs the visual world of your event — one coherent artistic direction that turns paper, surfaces, and details into a single atmosphere. You commission a vision, not print._

**Three pillars:** (1) An artistic direction, not a product. (2) A complete world, end to end (we own production). (3) Selective by design (price is a deliberate filter).

**Tagline (recommended):** **"The vision, not the paper."**
**Footer one-liner:** _"Paperly — artistic direction for events. Designed in studio, Israel."_

**Approved words:** artistic direction, visual universe/world, the studio, designed, conceived, curated, vision, atmosphere, the eye, bespoke, commission, collection, pieces, the table, concept, coherence, craft, made in studio.

**Banned words:** printing/printer/print shop/press · cheap/affordable/budget/deal/discount/sale/save · templates/customize-yourself/builder/editor · stationery/paper goods/supplies · "order/get a quote" for custom · any competitor name (Galia) · hype (stunning, amazing, best, #1).

**Reference Sacha as:** "Sacha, founder and artistic director" (first mention), then "Sacha." Background = "interior architecture." Speak of "Sacha's direction," not "our team."

---

## 5. Visual / UI system (UI Designer)

**Fonts**
- EN: **Cormorant Garamond** (display serif, headlines + wordmark echo) + **Work Sans** (body/nav/buttons/captions).
- HE: **Frank Ruhl Libre** (display) + **Heebo** (body) — Cormorant/Work Sans lack Hebrew glyphs.
- Rule: serif for display only; Work Sans for everything functional. Never mix within one line.

**Color tokens**
| Token | Hex | Use |
|---|---|---|
| `--ink` | `#111111` | Text, headlines, primary button fill, footer bg |
| `--paper` | `#FAFAF8` | Default background; text on dark |
| `--beige-accent` | `#CBB89D` | Accents only: dividers, hover underlines, overline labels (sparingly) |
| `--beige-soft` | `#F1EBE1` | Alternating section bg, card bg, image placeholders |
| `--ink-60` | `#5C5C5C` | Captions, secondary text |
| `--hairline` | `#E4DED2` | 1px dividers/borders |

> Beige `#CBB89D` is **decorative, not a text color** on light backgrounds (fails contrast). `--ink` on `--paper` ≈ 18:1.

**Type scale (desktop):** H1 Cormorant 72/500/1.05; H2 48/500/1.1; H3 32/500/1.2; body 16–18 Work Sans/400/1.7; label 12 Work Sans/500 uppercase, 2px tracking; button 14 Work Sans/500 uppercase, 1.5px tracking. **Mobile:** H1 40, H2 30, H3 22, body 16 (min).

**Spacing:** 8px base (8/16/24/32/48/64/96/128). Max content width 1280px; text blocks capped ~680px. Section vertical padding **128px desktop / 72px mobile** (the whitespace IS the "chic"). 12-col grid, 32px gutter.

**Components:** one button shape (square / 0–2px radius). Primary = ink fill / paper text, hover → beige fill. Secondary = 1px ink border. Product cards 3:4, no shadow, hover scale 1.03. Case-study cards 4:5 or 16:9, 64px row gap, alternate L/R. Placeholders = solid `--beige-soft` blocks (never gray "image coming soon"); lock aspect ratios now so real photos swap without reflow.

**5 rules to stay chic:** protect whitespace · beige ≤ 5–10% accent · strict hierarchy (no 3rd font, no mixed radii, no drop shadows) · large calm imagery, consistent ratios, single tonal treatment · one clear action per section.

---

## 6. The Collection & pricing (Pricing Analyst)

**Direct-buy items (5–10):** real ₪ prices.
- Format: **₪185** (symbol left, no decimals) in EN; **185 ₪** in HE. One number per item. No strike-throughs / "was/now".
- Fulfillment shown as a clean choice: "Instant download — yours immediately" · "Delivery across Israel — ₪50 flat" · "Studio pickup — free, by arrangement."
- Minimums reframed as value: _"Sold in sets of 25 — ₪185 (₪7.40 each)."_
- Anchor with a deliberately premium item at the reading-entry position; tag a best-margin item "studio favourite." **No sort-by-price.** Cluster prices on round tiers (₪120 / ₪185 / ₪290 / ₪450).

**Custom = "from" floors** (decision locked):
- Service cards show a single **floor**, never a range: _"Complete event art direction — from ₪1,500"_, _"Logo & brand mark — from ₪600"._ (Confirm exact numbers with Nessim.)
- The How-It-Works page _may_ carry a soft band in narrative context: _"Most full event projects land between ₪1,000 and ₪5,000, depending on scope and the number of pieces."_
- One-off objects: **no number** — _"One-of-a-kind pieces — priced per project. Let's talk →"_

**Price-as-filter:** never lead with price (value first, price after); frame spend as investment in the event ("one art direction reused across every piece"); state what you _are_ ("a studio — we design the vision and produce it ourselves") rather than naming rivals; confidence not justification (one value line, not a paragraph).

**What NOT to show:** itemized line-item custom pricing, hourly rates, production/margin costs, discount badges/coupons/timers, competitor comparison, sort-by/filter-by-budget, "request a quote (budget first)", any "from ₪50" entry that re-anchors to template-platform pricing.

**Bundle teasing (not yet formalized):** "Completes the set" cross-sell on product pages; a soft hook on custom pages ("Most clients start with the invitation, then carry the same art direction into signage, menus, and seating — one vision, every touchpoint"); a "Full event suite — from ₪1,500, designed as one" teaser card routing to WhatsApp.

---

## 7. Instagram integration (Instagram Curator)

- **Live feed**, finite: **6 tiles desktop / 4 mobile**, square crop, placed **low-mid Home, above the final WhatsApp CTA** (closing proof, not a header gimmick).
- Heading **"Inside the Studio"**; intro _"A living look at our process, our reflections, and the worlds we build."_ Button: **"Follow @paper.ly_"**.
- **All IG links open in a new tab** (anti-leak); keep the WhatsApp CTA immediately after the feed.
- **3-tier fallback** so the section is never broken/empty: hosted static grid behind the live feed → single editorial still + follow button → collapse the section.
- **Link-in-bio hub** on Instagram with WhatsApp as button #1, then "Explore the studio" (site) and "Our universes."
- Wix: use a curated feed widget (Common Ninja / Elfsight) with fixed tiles, square crop, new-tab, **lazy-load** (below fold); render the static fallback as initial paint. Re-auth token periodically. Test RTL render.
- Content recipe for the grid: ~40% process/reflection · 30% finished worlds in context · 20% craft macro · 10% Sacha. Tight palette, first-person reflective captions, no "DM for prices."

---

## 8. SEO (SEO Specialist)

**Intent filter:** target _design / art-direction / luxury_ intent, never "printing/cheap." HE is a parallel strategy, not a translation.

**Per-page (EN) — Title / H1 / slug:**
- Home — "Paperly — Event Art Direction Studio in Israel" / "Visual universes for unforgettable events" / `/`
- Portfolio — "Portfolio — Luxury Event Design Case Studies" / "Selected works" / `/portfolio`
- The Collection — "The Collection — Luxury Wedding Invitations & Event Pieces" / "Ready-made, ready to impress" / `/collection`
- The Studio — "The Studio — Event Design Team" / "The studio behind the vision" / `/studio`
- How It Works — "How It Works — Our Event Design Process" / "From idea to a complete world" / `/how-it-works`
- For Planners — "For Planners — Design Partner for Event Pros" / "A design partner for planners" / `/for-planners`
- Contact — "Contact — Book Your Event Designer" / "Let's design your event" / `/contact`
- Case study — "[Names] — Wedding Visual Identity" / "[Names]: a wedding in full" / `/portfolio/[slug]`
- Product — "[Item] — Designer Event [Type]" / "[Item]" / `/collection/[slug]`

**Hebrew:** mirror under `/he/…`; keep slugs transliterated Latin (avoids `%D7…` in shared links). Primary HE keywords e.g. `עיצוב אמנותי לאירועים`, `הזמנות לחתונה יוקרה`, `תיק עבודות עיצוב אירועים`.

**Multilingual:** EN default at root, HE at `/he/` (Wix Multilingual sub-directory). Verify auto `hreflang` (en, he, x-default→EN), self-referential canonicals per language, translate **every** meta/alt per language, keep IP auto-redirect OFF.

**Structured data:** LocalBusiness/ProfessionalService (Home+Contact, areaServed IL, sameAs IG), Product (each Collection item, ILS), BreadcrumbList. No fake reviews.

**Open Graph:** per-case-study unique `og:image` (1200×630, that universe's hero) + editorial `og:title` + `og:locale` (en_US / he_IL) so IG/WhatsApp shares look like magazine spreads. `twitter:summary_large_image`.

**Alt text now (on placeholders):** write the _intended_ real description — `alt="Gold-foil wedding invitation suite designed by Paperly"` — and rename files (`paperly-gold-foil-menu-card.jpg`). Zero rework when real photos land.

**Local:** Google Business Profile (Event planner / Graphic designer, service-area), consistent NAP (+972), bilingual description.

---

## 9. RTL / Hebrew rules (UX Architect)

**Mirror:** reading direction, text alignment (right), header nav order (logo right, menu R→L, toggle+cart left), grids/cards/galleries, footer column order, mobile hamburger slides from the right.
**Do NOT mirror:** numbers & prices (₪ Western digits), the logo, the Instagram embed contents, `wa.me`/`@paper.ly_`/email, photographs, Latin brand names inside Hebrew text.
**Build with logical CSS spacing (start/end)**, not hardcoded left/right, so Wix mirrors padding automatically. Isolate Latin/number runs to avoid bidi reordering. Test header height in HE (longer strings wrap).

---

## 10. Page-by-page layout & final copy (UX + Storyteller)

**Home (Sacha-led):** Hero → Sacha story strip → Featured Universes (3) → "The Difference" (3 points) → The Collection teaser (3 items) → live Instagram feed → contact band → footer.

Hero (recommended copy):
> **We don't design invitations. We design the world your evening lives in.**
> _A studio for the artistic direction of unforgettable events._
> Every great evening has a feeling before it has a date. My work begins there — in the atmosphere you can already sense but can't yet name. From a single emotion I build a complete visual universe: its palette, its materials, its rhythm, its smallest printed detail. You are not choosing paper. You are commissioning a vision, made whole.

Sacha authority fold (2nd fold):
> **Every Paperly event begins with one person's eye.**
> Sacha — Artistic Director. Trained in interior architecture, she designs a complete visual universe for your event, then we produce every piece in-house.
> [ Start your project → ]

The Studio (first person, ~150 words):
> **The Studio** — I'm Sacha, and I founded Paperly to do one thing well: give an event a world of its own. I came to this from interior architecture, where I learned that beauty is never an accident — it's the result of proportion, material, and a single point of view holding everything together. I bring that same eye to celebrations. Before I design a single piece, I look for the feeling at the center of your event, and I build outward from it until every detail belongs to the same story. I keep the studio small on purpose. Each universe I take on deserves my full attention — the patience to get the texture of a paper right, the restraint to leave things out, the care to make the whole evening feel inevitable. You bring the vision, or the beginnings of one. I make it real, and I make it yours.

**Case-study template (per universe):** Universe title → The Brief → The Direction (the "vision not paper" beat) → The System (palette / materials / typography / motif) → The Pieces → The Feeling → visuals. (See "Amber Hour" example in panel notes.)

**Section transitions / CTAs:** Hero→Studio _"Behind every universe, an eye."_ · Studio→Work _"An approach is only real once you can see it."_ · Work→IG _"Every universe begins as a conversation. Here's the studio, mid-sentence."_ · IG→Contact _"When you're ready, we'll begin yours."_ Primary CTA **"Begin your universe"**; on a case study **"See the full universe"**; soft **"Tell me about your evening."** Never "Get a quote / Order now."

**Hebrew voice:** transcreate, don't translate. Keep "vision, not paper" → _חזון, לא נייר_. Lock one term for "visual universe" (_עולם ויזואלי_). Reframe selectivity as **care, not scarcity**; warm second-person singular; shorter, direct sentences. CTA: _נתחיל לבנות את העולם שלך_ ("we'll begin building your world").

---

## 11. Launch checklist (prioritized)

**MUST**
- Global header/footer, EN|עב toggle, cart, sticky WhatsApp FAB (suppressed on cart/checkout).
- Home → Portfolio index → one strong case-study template; Sacha authority fold on Home.
- The Collection index + product page + fulfillment logic (download / ₪50 courier / pickup); guest checkout, ILS, ~₪50 shown pre-checkout.
- The Studio, How It Works (two paths + price-as-filter), Contact (WhatsApp + IG).
- Two-verb CTA discipline + pre-filled WhatsApp; hard separation priced vs aspirational.
- Custom "from" floors; banned-words purge across UI/alt/SEO.
- HE full RTL pass with logical spacing — test every page both directions.
- Intent-correct metadata + slugs (both languages); Wix Multilingual EN root / `/he/`, verified hreflang.
- Per-case-study OG images/titles. Real or founder-voiced testimonials (never fabricated).

**SHOULD**
- For Planners page + footer/contextual links; mailto fallback + response-time copy.
- Editorialized IG feed widget (fixed tiles, new-tab, lazy-load) + static fallback; link-in-bio hub.
- "Ready to ship / curated" framing on The Collection; cross-sell + "full suite" teaser.
- LocalBusiness + Product structured data; Google Business Profile.

**NICE**
- "Behind the vision" note per case study; mini-cart confirmation.
- Organization schema; IG Highlights mirroring site structure.

---

## 12. Open items needed from Paperly

1. **Exact custom price floors** to publish (proposed defaults from BP: event art direction **from ₪1,500**, logo **from ₪600**, typical band ₪1,000–₪5,000).
2. **Logo file** (transparent PNG/SVG; dark + light) to load into Wix media.
3. **Real project photos** — at least one full "visual universe" to make the showcase convincing at launch.
4. **The 5–10 Collection items** — name · description · price (₪) · size · fulfillment.
5. Real **testimonials** if available (else a signed Sacha note).

---

## 13. Core differentiation — Universes vs The Collection

Two clearly separated offerings. The site must make the choice obvious from the homepage.

**A. Universes (bespoke) — the hero offering**
- _"We create a complete world for your event."_ Full artistic direction; every piece designed around one vision.
- Lives in **Portfolio** as case studies (e.g. **Chloé & Albert**).
- Sold by **conversation** → WhatsApp / Instagram. **No prices.**
- For clients who want something singular and grandiose.

**B. The Collection (templates) — the accessible path**
- _"Beautiful, ready-made pieces from our templates."_ Editorial design, no bespoke art direction.
- Lives in **The Collection**; **bought directly** with real ₪ prices.
- For clients who don't want something grandiose, or have a tighter budget.
- **Generic product names — never attributed to a specific client or event.**

**Messaging rule:** present both paths side by side on Home + How It Works — *"A world of your own"* (bespoke) vs *"From our Collection"* (templates). The bespoke universe is the aspiration; the Collection is the on-ramp that captures budget-conscious clients instead of losing them — and can upsell toward a full universe later.

**Asset rule:** bespoke work (the Chloé & Albert photos) appears ONLY in the universe/portfolio — **never** as a Collection product image.

---

## 14. Editor build playbook (manual, until the Wix API is unblocked)

> `CallWixSiteAPI` (create products / edit page content) is gated by an approval prompt that does not clear in this remote session — so the items below are paste-ready for the Wix editor. Image uploads already worked; the three assets are in the media library.

### Uploaded media (already in the Wix media library)
| Asset | Use | URL |
|---|---|---|
| Greens / pop-art | Universe + signage visuals | `static.wixstatic.com/media/678de3_77c2380e591b48778871f1505a5c64e7~mv2.jpg` |
| Chloé & Albert table + menus | Universe hero | `static.wixstatic.com/media/678de3_3c0a2e2a5dff4eabbbf622d20a312472~mv2.jpg` |
| Round place cards | Universe detail | `static.wixstatic.com/media/678de3_ab16d720401e495a91458ae8acd653b5~mv2.jpg` |

### Portfolio → Universe (bespoke): "Chloé & Albert"
- **Title:** Chloé & Albert — A wedding in deep green
- **The Brief:** A green-toned celebration with candlelight, warmth, and a quiet touch of pop-art imagination.
- **The Direction:** Deep green as the whole language of the evening — every surface chosen to sit naturally within candlelight.
- **The System:** Palette — deep green, candle-gold; Materials — warm stock; Motif — botanical; Pieces — custom menus + round place cards.
- **The Pieces:** Custom menus, personalised round place cards.
- **The Feeling:** A table that looked like it had always belonged to them.
- **CTA:** "Create your own universe →" (WhatsApp). **No price.**
- **Images:** all three uploaded assets.

### The Collection → 5 template products (generic, no client names)
| # | Name | Price | Cut / size | Fulfillment | Photo |
|---|---|---|---|---|---|
| 1 | Menu Card | ₪5 / piece | rectangle, size 2 (A3) | courier / pickup | template render (placeholder) |
| 2 | Folded Place Card | ₪4 / piece | rectangle, size 4 | courier / pickup | template render (placeholder) |
| 3 | Round Place Card | ₪4 / piece | shape, size 6 | courier / pickup | template render (placeholder) |
| 4 | Welcome Sign | *(price hidden / by request)* | — | — | template render (placeholder) |
| 5 | Save-the-Date — Digital | *(price hidden)* | — | instant download | template render (placeholder) |

Product description pattern (item 1): _"A ready-made menu card from the Paperly Collection — editorial design, printed and finished in studio. Priced per piece; minimum order applies. Want it designed bespoke, around your event's world? Begin a conversation on WhatsApp."_

---

## 15. Commerce rebalance — "fewer pictures, more e-commerce" (2nd 5-agent panel)

Owner feedback on the first generated site: **too image-heavy (reads as a lookbook), not enough e-commerce.** Unanimous agent diagnosis: *"a beautiful gallery with the shop hidden in the back room."*

### Image-density budget (UI/UX) — Must
- **1 full-bleed hero per page**, ≤ 62vh desktop / 48vh mobile. Shop & product pages: **0** full-bleed (typographic header band instead).
- **No two image sections adjacent** — every image block separated by a text/commerce/data module.
- Target **≤35% image / ≥65% content** on Home and The Collection.
- **Quarantine the lookbook in Portfolio**; cap each universe gallery at **~6 images** + a typographic story block.
- Convert decorative photo strips → typographic dividers, USP strips, shop-by-category bands.

### Homepage section order (commerce-forward) — Must
1. ONE bespoke hero (≤62vh) + dual CTA: *Explore Bespoke* / *Shop The Collection*.
2. Two-door chooser (Bespoke vs The Collection).
3. **★ Shoppable product module** — 3–4 product cards with **₪ price + Add-to-Cart**, "View all →". (The single highest-impact fix.)
4. Value/USP strip (made in Israel · ships in X days · premium stock) — no photos.
5. Contained bespoke teaser (3-image strip) → Portfolio.
6. Social proof / planners band.
7. Contact (WhatsApp + Instagram).

### Navigation & store anatomy — Must
- **"The Collection" promoted to primary nav** (slot #2) with category sub-pages; **persistent header cart** with item count on every page.
- The Collection page: slim title band (no hero) → category pills → sort → **product grid (3/2/2 cols)** with price + quick-add → what's-included → fulfillment info.
- Product page: ≤3–4 gallery images, prominent ₪ price, **pack-size variant selector**, what's-included, dimensions, fulfillment + lead time, Add-to-Cart (sticky on mobile), cross-sell, "← back to The Collection".

### Pricing presentation — set/pack, not per-piece (Pricing Analyst) — DECISION NEEDED
A ₪4–5 per-piece price looks cheap and caps AOV. Recommendation: sell **fixed sets as Wix variants** (minimum enforced by smallest variant), round premium numbers. Indicative (to be confirmed against the real Supabase grid + true costs):

| Product | Variants (pack → price) |
|---|---|
| Menu | 25 → ₪220 · 50 → ₪390 · 100 → ₪690 |
| Place Card (Folded/Round as option) | 50 → ₪260 · 100 → ₪460 (min 50) |
| Welcome / Statement sign | 1 → ₪290 |

Bundles (AOV lever, one art direction across pieces): **The Table** (50 menu + 50 place cards) ₪590 · **The Setting** (+ sign) ₪850 · **The Full Universe** ₪1,200. Present savings as "designed to go together," not a discount. Anchor the grid with the most premium item; **no sort-by-price, no discount badges, no per-piece math shown**.

> ⚠️ These set prices were modelled by the agent with margin assumptions and **deviate from the raw Supabase per-piece grid** — they must be confirmed by Nessim before publishing.

### Store depth & trust (E-commerce) — Should
- Expand to **~8–10 SKUs** grouped into **job-based categories**: *The Table* (menu, place cards, table number, napkin band), *The Welcome* (welcome/seating sign, save-the-date), *The Invitation Suite* (invitation, RSVP, thank-you). Never show a category with <3 items.
- Hero **"Complete Table Set"** bundle + "Studio favourite" badge + manual curated ordering.
- Israeli checkout: cards + **תשלומים (installments)** + **Bit**, Apple/Google Pay; **guest checkout ON**; ILS tax-inclusive display; clear shipping/pickup/download + lead times; policy pages (personalised = final sale).
- **Template → bespoke bridge:** soft upsell on product pages + post-purchase ("your full event could have its own universe"); optional "template credit toward a bespoke commission."

### Implementation reality (confirmed this session)
- **Stores V3 API works** (via token) → products, variants, pack pricing, categories, bundles, cross-sell are all doable programmatically.
- **Builder re-run with an existing job ID is a no-op** → page layout/image changes must be done in the **Wix editor** (or a fresh generate), not via the builder API.
- `CallWixSiteAPI` / doc-search remain approval-gated in the web session.
