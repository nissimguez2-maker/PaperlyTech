# Paperly Pricing Tool — Full Audit Report

**Date:** April 13, 2026  
**Audited by:** Claude (for Nessim & Sacha)  
**Source:** `index.html` (2,277 lines, ~371K characters, single-file React JSX)  
**Live URL:** https://paperlytool.netlify.app  
**Deployment:** Manual upload to Netlify (no CI/CD, no Git integration)

---

## Executive Summary

The Paperly Pricing Tool is a functional internal business tool that handles quotes, project pipeline management, payments, expenses, tasks, and supplier tracking — all in a single HTML file. It works, and that's commendable for something built iteratively in 1-2 hour sessions.

However, it has significant issues across **security, architecture, performance, UI/UX, and maintainability** that prevent it from being the premium, reliable tool a studio like Paperly deserves. Below is the complete audit.

**Overall Score: 4.5/10**

| Category | Score | Priority |
|----------|-------|----------|
| Security | 2/10 | CRITICAL |
| Architecture | 3/10 | HIGH |
| Performance | 4/10 | HIGH |
| Code Quality | 4/10 | MEDIUM |
| UI/UX Design | 5/10 | HIGH |
| Aesthetics/Brand | 5/10 | MEDIUM |
| Mobile/Responsive | 2/10 | HIGH |
| Accessibility | 2/10 | LOW |
| Deployment/DevOps | 1/10 | HIGH |

---

## 1. SECURITY — Score: 2/10 (CRITICAL)

### 1.1 Supabase Anon Key Exposed in Source Code
The Supabase URL and anon key are hardcoded on **line 37-38**:
```
SUPABASE_URL = "https://ivghdpgcddjpijsfddus.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIs..."
```
Anyone viewing source can read/write your `paperly_store` table. The anon key grants access to any table without RLS enabled.

**Risk:** Any visitor to paperlytool.netlify.app can steal or destroy all your business data.

**Fix:** Move to environment variables + server-side API, or enable strict Row Level Security (RLS) with user authentication.

### 1.2 Supabase Project Not on Your Connected Account
The Supabase project `ivghdpgcddjpijsfddus` is **not** linked to your current Supabase account (which only has "PolyGuez Project" at `rapmxqnxsobvxqtfnwqh`). This means:
- You may not have full admin access to this project
- You can't manage RLS policies, backups, or monitoring through Supabase Dashboard
- The project could be on a free tier that gets paused

### 1.3 No Authentication
There's no login, no user sessions, no access control. Anyone with the URL has full access to the tool and all client data (names, payments, phone numbers).

### 1.4 Personal Information in Source Code
Hardcoded on lines 517-518: Sacha's personal email (`Sachaguez.mt@gmail.com`) and phone (`+972 58 617 0698`) are baked into the PDF export function. Anyone viewing source sees this.

### 1.5 Unverified CDN Script Loading
jsPDF and XLSX libraries are loaded dynamically from CDN (`unpkg.com`, `cdn.sheetjs.com`) without integrity hashes. A CDN compromise would inject malicious code.

---

## 2. ARCHITECTURE — Score: 3/10 (HIGH)

### 2.1 Single-File Monolith (2,277 lines)
Everything — components, styles, business logic, PDF generation, data persistence, utilities — lives in one HTML file. This makes:
- Collaboration impossible (merge conflicts on every change)
- Testing impossible (no modules to unit test)
- Debugging painful (no source maps, browser-compiled Babel)
- Performance poor (entire app re-parses on every load)

### 2.2 Browser-Side Babel Transpilation
The app uses `<script type="text/babel">` with `@babel/standalone` loaded from CDN. This means:
- **Every page load** parses and transpiles 2,277 lines of JSX in the browser
- Adds ~1MB to initial load (Babel standalone is huge)
- No tree-shaking, no dead code elimination, no minification
- Development-only pattern shipped to production

### 2.3 No Build System
No Vite, no Webpack, no bundler. React 18 loaded via CDN UMD bundles (not ESM). No code splitting, no lazy loading.

### 2.4 Data Persistence: Simple Key-Value Store
All data is stored as JSON blobs in a single Supabase table (`paperly_store`) via `dbGet(key)` / `dbSet(key, value)`. This means:
- No relational data model — everything is denormalized JSON
- No server-side validation
- No concurrent edit handling (last write wins)
- No audit trail / history
- No backup strategy visible

### 2.5 No Routing
Single-page app with tab state managed via `useState("quote")`. No URL routing means:
- Can't bookmark or share a specific tab/project
- Browser back button doesn't work
- No deep linking

---

## 3. PERFORMANCE — Score: 4/10 (HIGH)

### 3.1 Initial Load
The app loads **4 CDN scripts** sequentially before anything renders:
1. React (~140KB)
2. React-DOM (~42KB)
3. Babel Standalone (~1MB)
4. Google Fonts (3 families)

Estimated time-to-interactive: **3-5 seconds** on fast connection, **8-12 seconds** on 3G.

### 3.2 No Memoization
No `useMemo` or `useCallback` usage detected. Functions like `buildGroups()`, `buildDefaultCategories()`, and all `filter`/`map` chains re-execute on every render.

### 3.3 All Inline Styles
Every style object is recreated on every render. With ~500+ inline style objects across components, this creates significant garbage collection pressure.

### 3.4 Dynamic Library Loading for Export
PDF and Excel exports load libraries on-demand from CDN. First export takes 2-3 seconds; subsequent exports are cached. No loading indicator during library fetch.

### 3.5 No Virtualization
Project lists, article catalogs, and payment logs render all items at once. With 100+ projects, the DOM becomes heavy.

---

## 4. CODE QUALITY — Score: 4/10 (MEDIUM)

### 4.1 Duplicate Function Definitions
`drawFooter()` is defined **twice** within `exportPdf()` (lines 503-519 and 525-539) with different implementations. Only the second definition executes.

### 4.2 Silent Error Swallowing
Multiple `catch(e){}` blocks with no logging (lines 41-48, 50-63, 875). Errors disappear silently — you'd never know if data failed to save.

### 4.3 No TypeScript
Zero type safety across 2,277 lines. Props are passed through 3-4 component layers without any interface definitions. A typo in a prop name would cause a silent `undefined`.

### 4.4 Stale Closure Risk
The memory.md notes this was a known issue — `mutateProjects` functional update pattern was adopted. However, `handleArticleChange()` (line 761) still captures the `articles` array in a closure, which can go stale.

### 4.5 Inconsistent Null Handling
Some places use optional chaining (`lastQ?.items`), others use explicit checks (`proj.quotes && proj.quotes.length`). No consistent defensive coding pattern.

### 4.6 Magic Numbers Everywhere
PDF dimensions (`PW=210, PH=297, ML=25`), column positions (`CX_Q=112, CX_U=150`), font sizes (19, 9, 9.5, 8.5), and spacing values are all hardcoded without named constants.

### 4.7 window.confirm() for Destructive Actions
Uses blocking `window.confirm()` (lines 653, 853, 933) for delete confirmations. This freezes the UI thread and looks unprofessional.

---

## 5. UI/UX DESIGN — Score: 5/10 (HIGH)

### 5.1 What Works
- **Tab navigation** is clean and understandable (7 tabs: Quote, Projects, Finance, Tasks, Expenses, Catalog, Externalisation)
- **Color system** is defined centrally via the `C` object — warm, neutral palette that fits a premium brand
- **Typography** uses Cormorant (serif, for headings/amounts) + DM Sans (sans-serif, for UI) — good pairing
- **Toast notifications** provide feedback on actions
- **Drag-and-drop** on quote items is a nice touch

### 5.2 What Doesn't Work
- **7 top-level tabs is too many** — cognitive overload. Finance, Tasks, Expenses could be grouped. Catalog and Externalisation are rarely used and should be secondary.
- **No dashboard/overview** — opening the app drops you into Quote creation. There's no "home" showing key metrics, overdue payments, upcoming deliveries.
- **No search** — finding a specific project or client requires scrolling through the Projects tab.
- **No client management** — clients exist only as text strings on projects. No client directory, no contact info, no project history per client.
- **Modals for everything** — payment entry, quote editing, project editing all happen in modals. For complex edits, this feels cramped.
- **No confirmation after save** — `dbSet()` calls are fire-and-forget with no success confirmation.
- **No undo** — accidental deletes are permanent. No history or rollback.

### 5.3 Quote Flow Issues
- Adding items requires selecting from a deeply nested category tree (Paper > Rectangle > Size 1, etc.)
- No quick-add or search-as-you-type for common items
- Offered items (freebies) use a green checkbox with no label — just a title tooltip
- Discount toggle between ₪ and % is small and easy to miss

### 5.4 Project Pipeline
- Pipeline stages are hardcoded: Not started → In progress → Ready
- No kanban board view — just grouped lists
- No drag-and-drop between stages
- Progress bar based on item readiness is good, but the bar itself is only 3px tall — nearly invisible

---

## 6. AESTHETICS & BRAND — Score: 5/10 (MEDIUM)

### 6.1 Color Palette
The palette (`#F9F8F6` bg, `#EFE9E3` secondary, `#C9B59C` accent, `#9E8468` dark accent) is warm and premium. This is well-chosen for an event studio brand.

### 6.2 Typography
Cormorant for headings and financial figures gives an elegant feel. DM Sans for body text is clean and readable. Raleway is loaded but barely used — wasted bandwidth.

### 6.3 Visual Issues
- **No logo** — the app shows "Paperly Pricing Tool" in plain text
- **No visual hierarchy on the Projects page** — every project card looks identical regardless of urgency
- **Cards are text-heavy** — walls of small 11-12px text with minimal visual breathing room
- **Status badges** use colored dots + text, which is good, but the dots are tiny (8px)
- **The donut chart** in Finance is the only data visualization — everything else is tables and lists
- **No icons** — the entire UI uses text-only buttons and Unicode characters (✎, ×, ▶) instead of an icon library
- **No animations/transitions** — the app feels static. Tab switches are instant with no transition.

### 6.4 Brand Alignment
For a "creative direction studio for premium events," the tool should feel luxurious and polished. Currently it feels more like a functional spreadsheet with nice fonts. The warm color palette is a strong foundation, but the execution doesn't match premium positioning.

---

## 7. MOBILE & RESPONSIVE — Score: 2/10 (HIGH)

### 7.1 Minimal Media Queries
Only one `@media(max-width:600px)` block (lines 22-30) with 6 rules. This covers:
- Tab bar button sizing
- Main padding
- Project card header stacking
- Project card action buttons

### 7.2 Major Responsive Failures
- **Quote tab**: 3-column grid (`1fr 1fr 1fr`) doesn't collapse on mobile
- **Item table**: 7-column table with percentage widths (25%, 35%, 10%, 13%, 12%) — unusable below 768px
- **Finance tab**: Fixed `360px` sidebar overflows on tablets
- **Payment log grid**: `gridTemplateColumns:"110px 90px 110px 1fr 60px"` = 370px minimum — overflows on phones
- **Category nesting**: Indentation (`16+level*20}px`) pushes deep items off-screen on mobile

### 7.3 No Touch Optimization
- Buttons are 8px padding — too small for touch targets (minimum 44px recommended)
- Drag-and-drop on quote items doesn't work on touch devices
- No swipe gestures, no mobile-friendly navigation

---

## 8. ACCESSIBILITY — Score: 2/10 (LOW priority for internal tool)

- No `aria-label` attributes on icon buttons (✎, ×, ▶)
- No `htmlFor` on `<label>` elements — labels not connected to inputs
- No focus indicators (`:focus` styles)
- Color used as sole indicator (green = ready, red = overdue) without text alternatives
- No keyboard navigation support beyond browser defaults
- Modals lack focus trapping
- No skip-to-content links

---

## 9. DEPLOYMENT & DEVOPS — Score: 1/10 (HIGH)

### 9.1 Current State
- **No Git repo** (GitHub repo exists but is empty)
- **No CI/CD** — manual file upload to Netlify
- **No environment separation** (dev/staging/prod)
- **No version control** — versions tracked by filename (`paperly-pricing-v16.jsx`)
- **No automated testing**
- **No monitoring or error tracking**
- **Single deploy artifact** — one HTML file, no build step

### 9.2 Netlify Findings
- Manual deploy (no git-connected builds)
- Deploy time: 2 seconds (just 1 HTML file)
- No redirect rules, no header rules
- No serverless functions, no edge functions
- No forms enabled
- SSL works (https://paperlytool.netlify.app)

---

## 10. WHAT'S MISSING (for a premium event studio tool)

1. **Authentication & multi-user support** — Sacha and Nessim should have separate logins
2. **Client directory** — contact info, project history, communication log
3. **Dashboard** — KPIs at a glance (revenue this month, overdue payments, upcoming deliveries)
4. **Search & filters** — find projects by client, date, status, amount
5. **Calendar view** — delivery dates on a calendar
6. **Document management** — attach photos, mood boards, reference files to projects
7. **Email/notification integration** — send quotes to clients, payment reminders
8. **Proper database** — relational model instead of JSON blobs
9. **Offline support** — the tool breaks without internet
10. **Data export/backup** — no way to export all data for safekeeping
11. **Activity log** — who changed what, when
12. **RTL support** — you're in Israel; Hebrew text should be supported

---

## RECOMMENDED REBUILD PLAN

### Phase 1: Foundation (make it professional)
- Set up proper GitHub repo with Vite + React + TypeScript
- Component-based architecture (split into 20-30 files)
- Tailwind CSS for styling (replaces 500+ inline style objects)
- Supabase with proper schema, RLS, and authentication
- Deploy via Netlify with Git integration (auto-deploy on push)

### Phase 2: Core Features (make it better)
- Dashboard tab with KPIs
- Client directory
- Search & filters across all data
- Proper routing (React Router)
- Mobile-responsive design
- Professional icon library (Lucide)

### Phase 3: Premium Polish (make it 20x better)
- Animations and transitions (Framer Motion)
- Calendar view for deliveries
- PDF export with branded templates
- File attachments on projects
- Activity log
- Keyboard shortcuts for power users
- Dark mode option

---

*This audit was generated from a complete read of the 2,277-line index.html source, Netlify deployment data, and Supabase project analysis.*
