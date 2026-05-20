# Design System Master File — Vaketta Chat

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file. Otherwise follow the rules below.

**Project:** Vaketta Chat (hotel automation — staff dashboard + Vaketta admin panel)
**Category:** Operational SaaS / Data-Dense Dashboard
**Stack:** Next.js 16 App Router · React 19 · TypeScript 5 · Tailwind CSS v4
**Generated:** 2026-05-21 · Tailored from `ui-ux-pro-max` (Data-Dense Dashboard) + existing brand

> This is an **internal operational tool**, not a marketing site. Ignore landing-page
> patterns (hero/social-proof). The canonical shell is **Sidebar + TopBar + scrollable content**.

---

## Style

**Data-Dense Dashboard** — multiple widgets, KPI cards, data tables, grid layout,
space-efficient, maximum data visibility. Light + dark capable; ships **light only** today.

**Key effects:** hover tooltips, row highlighting on hover, smooth filter/skeleton loading,
chart hover states. No ornate decoration, no gratuitous motion.

---

## Color Palette (brand — source of truth)

Defined as CSS vars in [globals.css](../../src/app/globals.css) `:root`. Use these, not raw hex
re-typed per component. Tailwind v4: reference with `bg-[#1B52A8]` style arbitrary values or the
`--brand-*` vars; the table below is the semantic mapping.

| Semantic role | Brand token | Hex | Usage |
|---|---|---|---|
| Primary / CTA | `--brand-primary` | `#1B52A8` | Buttons, links, active nav, focus ring |
| On-primary | — | `#FFFFFF` | Text/icon on primary fills |
| Foreground | `--brand-dark` | `#0C1B33` | Body text, headings, sidebar bg |
| Accent (data) | `--brand-accent` | `#B8912E` | Revenue, prices, gold highlights |
| Brand accent | — | `#7A3F91` | Purple brand accent (charts, badges) |
| Deep purple | — | `#2B0D3E` | Dark decorative surfaces |
| Background | `--brand-light` | `#F4F2ED` | Page background |
| Surface | — | `#FFFFFF` | Cards, tables, modals |
| Border | `--brand-soft` | `#E5E0D4` | Card borders, dividers, subtle fills |
| Muted text | `--brand-muted` | `#64748B` | Secondary text, captions |
| Destructive | — | `#DC2626` | Delete, errors |
| Success | — | `emerald-600 #059669` | Confirmations, WhatsApp badge |

**Channel rules (keep):** WhatsApp = `bg-emerald-100 text-emerald-700`; Instagram = radial gradient badge.

**Contrast notes:** Gold `#B8912E` on white ≈ 3.6:1 — **large/bold text or icons only**, never small body
copy. Muted `#64748B` on cream passes AA for ≥16px. Navy on cream and white on navy both pass AAA.

---

## Typography

Body currently falls back to `Arial, Helvetica` ([globals.css](../../src/app/globals.css) `body`).
For a data tool, adopt a clean grotesque + tabular figures:

- **UI / body:** `Inter` (or keep system sans) — `font-feature-settings: "tnum" 1` for tables
- **Numeric columns (prices, counts, dates):** tabular figures to prevent column jitter
- **Type scale:** `12 · 14 · 16 · 18 · 24 · 32` (px). Body base **16px** (mobile-safe, avoids iOS zoom)
- **Weights:** headings 600–700, body 400, labels/nav 500
- **Line-height:** 1.5 body, 1.25 headings

> Skill suggested Fira Code/Fira Sans — optional. Inter is the lower-risk default; Fira is fine if you
> want a more technical feel. Whichever you pick, load via `next/font` with `display: swap`.

---

## Spacing & Radius

| Token | Value | Usage |
|---|---|---|
| xs | 4px | tight gaps |
| sm | 8px | icon gaps, inline |
| md | 16px | standard padding |
| lg | 24px | card / section padding |
| xl | 32px | large gaps |
| 2xl | 48px | section margins |

4/8px rhythm. Data-dense pages favor `md` card padding (not `lg`) to maximize visible rows.
**Radius:** cards/inputs `rounded-xl` (12px), buttons `rounded-lg` (8px), pills `rounded-full`.

## Elevation (consistent scale — no ad-hoc shadows)

| Level | Value | Usage |
|---|---|---|
| sm | `0 1px 2px rgba(0,0,0,.05)` | subtle lift |
| md | `0 4px 6px rgba(0,0,0,.1)` | cards, buttons |
| lg | `0 10px 15px rgba(0,0,0,.1)` | dropdowns, popovers |
| xl | `0 20px 25px rgba(0,0,0,.15)` | modals |

Modal scrim: `bg-black/50` + optional `backdrop-blur-sm` (blur signals dismissable background).

---

## App Shell (canonical layout)

- **Sidebar** ([Sidebar.tsx](../../src/components/Sidebar.tsx)) — navy `#0C1B33`, role-aware sections,
  active item: gold left-border + white text. Admin panel mirrors this in `admin/layout.tsx`.
- **TopBar** ([TopBar.tsx](../../src/components/TopBar.tsx)) — page title, unread badge, user menu.
- **Content** — `min-h-dvh` scroll region, `max-w-7xl` where centered, `p-6`/`p-8`.
- Navigation placement is **identical across all pages**. Don't mix nav patterns.
- One **primary CTA** per screen (blue); secondary actions subordinate (outline/ghost).

---

## Component Specs (Tailwind v4)

**Primary button** — `bg-[#1B52A8] text-white font-semibold px-5 py-2.5 rounded-lg
transition hover:bg-[#1B52A8]/90 focus:ring-2 focus:ring-[#1B52A8]/30 disabled:opacity-50
disabled:cursor-not-allowed cursor-pointer`. Show spinner + disable during async.

**Secondary button** — `border border-[#E5E0D4] text-[#0C1B33] hover:bg-[#F4F2ED] ...` same metrics.

**Destructive** — `bg-[#DC2626] text-white` (or red ghost). Visually separated from primary.

**Card** — `bg-white border border-[#E5E0D4] rounded-xl p-4 shadow-sm`. Hover (if interactive):
`hover:shadow-md transition` — **no transform that shifts layout** in dense grids.

**Input** — `border border-[#E5E0D4] rounded-lg px-3 py-2 text-sm focus:outline-none
focus:ring-2 focus:ring-[#1B52A8]/25 focus:border-[#1B52A8]`. Min height 44px on mobile.
Always a visible `<label>` (not placeholder-only). Error text below the field in red.

**Table row** — `hover:bg-[#F4F2ED] transition`. Tabular figures for numeric cells. Sortable headers
get `aria-sort`. Use `SkeletonTableRow` while loading.

**Modal** — `rounded-2xl bg-white shadow-xl p-6 max-w-lg w-[90%]`; overlay `bg-black/50`. Provide a
visible close affordance + Esc to dismiss. Confirm before discarding unsaved changes.

---

## Charts (Recharts)

- Trend → line; comparison → bar; proportion → donut (≤5 slices, else bar).
- Brand series colors: blue `#1B52A8`, gold `#B8912E`, purple `#7A3F91`, emerald `#059669`.
- Never encode meaning by color alone — add labels/legend. Gridlines low-contrast (`#E5E0D4`).
- Tooltips on hover **and** keyboard-reachable. Empty state ("No data yet") not a blank axis.
- Loading: skeleton, not an empty frame. Respect `prefers-reduced-motion` for entrance anims.

---

## Anti-Patterns (do NOT use)

- ❌ Emojis as structural icons → use SVG (Heroicons / Lucide), one consistent set
- ❌ Ornate / decorative styling that competes with data
- ❌ Data tables with no filtering/sorting
- ❌ Missing `cursor-pointer` on clickables
- ❌ Layout-shifting hover transforms in dense grids
- ❌ Gold `#B8912E` on white for small body text (fails contrast)
- ❌ Instant (0ms) state changes — always 150–300ms transitions
- ❌ Invisible focus states
- ❌ Marketing/landing patterns (this is an internal tool)

---

## Pre-Delivery Checklist

- [ ] No emojis as icons; single consistent SVG icon set
- [ ] `cursor-pointer` + visible hover (150–300ms) on all clickables
- [ ] Text contrast ≥4.5:1 (gold reserved for large/bold only)
- [ ] Visible focus rings; full keyboard nav; tab order matches visual order
- [ ] `prefers-reduced-motion` respected
- [ ] Forms: visible labels, inline error below field, loading/disabled states, 44px mobile inputs
- [ ] Tables: tabular figures, sortable headers with `aria-sort`, skeleton loading, empty state
- [ ] Responsive at 375 / 768 / 1024 / 1440; no horizontal scroll on mobile; `min-h-dvh`
- [ ] Content not hidden behind fixed Sidebar/TopBar
- [ ] One primary CTA per screen; destructive actions separated + confirmed
- [ ] Brand tokens used (no re-typed hex drift from globals.css)
