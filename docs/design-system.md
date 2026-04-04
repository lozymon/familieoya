# Design System — "Clean Ledger"

Visual design direction for the Familieøya web app. The goal is a professional, data-focused finance dashboard that feels trustworthy and calm — not flashy.

**Inspiration:** Monarch Money, Copilot Money, Linear.

---

## Design Principles

1. **Data first.** Numbers are the product. Typography and layout must make amounts, trends, and categories scannable at a glance.
2. **Calm, not playful.** Finance is serious. No gradients, no illustrations, no bright hero colors.
3. **Consistent density.** Enough breathing room to avoid feeling cramped, but not so much whitespace that you have to scroll to see your data.
4. **Dark mode is a first-class citizen.** Both themes must look intentional, not like an afterthought.

---

## Color Palette

All colors should be defined as CSS custom properties in `libs/ui/src/styles/tokens.css` and consumed via Tailwind's theme config. No hardcoded hex values in component files.

### Semantic tokens

| Token                    | Light                 | Dark                  | Usage                                   |
| ------------------------ | --------------------- | --------------------- | --------------------------------------- |
| `--color-bg`             | zinc-50 `#fafafa`     | zinc-950 `#09090b`    | Page background                         |
| `--color-surface`        | white `#ffffff`       | zinc-900 `#18181b`    | Cards, panels                           |
| `--color-surface-raised` | zinc-50 `#fafafa`     | zinc-800 `#27272a`    | Hover rows, nested surfaces             |
| `--color-border`         | zinc-200 `#e4e4e7`    | zinc-800 `#27272a`    | Borders, dividers                       |
| `--color-border-subtle`  | zinc-100 `#f4f4f5`    | zinc-900 `#18181b`    | Subtle separators                       |
| `--color-text`           | zinc-900 `#18181b`    | zinc-50 `#fafafa`     | Primary text                            |
| `--color-text-muted`     | zinc-500 `#71717a`    | zinc-400 `#a1a1aa`    | Labels, secondary info                  |
| `--color-text-subtle`    | zinc-400 `#a1a1aa`    | zinc-600 `#52525b`    | Placeholders, disabled                  |
| `--color-primary`        | emerald-600 `#059669` | emerald-500 `#10b981` | Primary action, CTA                     |
| `--color-primary-hover`  | emerald-700 `#047857` | emerald-400 `#34d399` | Hover state                             |
| `--color-primary-subtle` | emerald-50 `#ecfdf5`  | emerald-950 `#022c22` | Badge bg, highlight bg                  |
| `--color-income`         | emerald-600 `#059669` | emerald-400 `#34d399` | Income amounts                          |
| `--color-expense`        | rose-600 `#e11d48`    | rose-400 `#fb7185`    | Expense amounts                         |
| `--color-warning`        | amber-500 `#f59e0b`   | amber-400 `#fbbf24`   | Budget warning (80%)                    |
| `--color-danger`         | rose-600 `#e11d48`    | rose-400 `#fb7185`    | Budget exceeded (100%)                  |
| `--color-sidebar-bg`     | zinc-100 `#f4f4f5`    | zinc-900 `#18181b`    | Sidebar background (distinct from page) |
| `--color-sidebar-active` | white `#ffffff`       | zinc-800 `#27272a`    | Active nav item bg                      |

### Why emerald, not indigo?

Indigo is a generic "tech app" color. Emerald reads as money/growth and is visually distinct from income/expense indicators while still harmonizing with them. It also differentiates the app from the default shadcn/ui look.

### Chart color sequence

Used in the same order for all charts across the app:

```css
--chart-1: #059669; /* emerald-600 — primary */
--chart-2: #6366f1; /* indigo-500 */
--chart-3: #f59e0b; /* amber-500 */
--chart-4: #e11d48; /* rose-600 */
--chart-5: #8b5cf6; /* violet-500 */
--chart-6: #06b6d4; /* cyan-500 */
--chart-7: #f97316; /* orange-500 */
--chart-8: #84cc16; /* lime-500 */
```

---

## Typography

### Scale

| Name            | Size             | Weight        | Usage                         |
| --------------- | ---------------- | ------------- | ----------------------------- |
| `page-title`    | text-2xl (24px)  | font-semibold | Page heading                  |
| `section-title` | text-base (16px) | font-semibold | Card titles, section headings |
| `label`         | text-sm (14px)   | font-medium   | Form labels, table headers    |
| `body`          | text-sm (14px)   | font-normal   | Body copy, table rows         |
| `caption`       | text-xs (12px)   | font-normal   | Timestamps, helper text       |
| `amount-lg`     | text-2xl (24px)  | font-bold     | KPI card amounts              |
| `amount-sm`     | text-sm (14px)   | font-medium   | Table amounts                 |

### Numeric formatting

All monetary amounts and percentages must use `font-variant-numeric: tabular-nums` so columns align correctly. Apply via the `tabular-nums` Tailwind class.

```tsx
// ✅
<span className="tabular-nums font-semibold text-[--color-income]">
  {formatCurrency(amount, locale, currency)}
</span>

// ❌ columns misalign when amounts have different digit counts
<span className="font-semibold">{formatCurrency(amount, locale, currency)}</span>
```

---

## Spacing & Layout

### Page layout

```
┌─────────────────────────────────────────────────────────────┐
│  Sidebar (240px fixed)  │  Content area (flex-1)            │
│                         │  ┌─────────────────────────────┐  │
│  [logo]                 │  │ TopBar (h-14)               │  │
│                         │  ├─────────────────────────────┤  │
│  Overview               │  │                             │  │
│  ● Dashboard            │  │  Page content               │  │
│  ● Transactions         │  │  max-w-5xl mx-auto px-6     │  │
│                         │  │  py-8                       │  │
│  Money                  │  │                             │  │
│  ● Budgets              │  │                             │  │
│  ● Reports              │  └─────────────────────────────┘  │
│                         │                                   │
│  Household              │                                   │
│  ● Members              │                                   │
│  ● Settings             │                                   │
└─────────────────────────────────────────────────────────────┘
```

- Sidebar: 240px, `var(--color-sidebar-bg)`, always visible on desktop
- Content area: `flex-1`, `var(--color-bg)`
- Page content: `max-w-5xl mx-auto px-6 py-8` — not full-bleed
- TopBar: `h-14`, `var(--color-surface)`, bottom border

### Sidebar nav groups

Nav items are grouped into sections with a small section label above each group. No individual icons without labels.

```
Overview
  Dashboard
  Transactions

Money
  Budgets
  Reports

Household
  Members
  Settings
```

Active state: left border `border-l-2 border-[--color-primary]` + `bg-[--color-sidebar-active]`. Not a full background fill of the primary color.

### Card padding

| Context                | Padding                                       |
| ---------------------- | --------------------------------------------- |
| Standard card          | `p-6`                                         |
| Compact card (KPI row) | `p-4`                                         |
| Table card             | `px-0 py-0` (table has its own inner padding) |

---

## Components

### KPI Cards (Dashboard stat row)

```
┌──────────────────────────────┐
│  Total Income         ↑ 12%  │
│  kr 42 500                   │
│  vs last month: kr 37 900    │
└──────────────────────────────┘
```

- Icon top-left (optional)
- Trend badge top-right: green arrow up / red arrow down + percentage
- Large tabular-nums amount
- Muted comparison line below
- 4 cards in a row on desktop, 2×2 on tablet, 1 column on mobile

### Tables

- Sticky `<thead>` with `text-xs uppercase tracking-wide text-[--color-text-muted]`
- Zebra striping: odd rows `bg-[--color-surface]`, even rows `bg-[--color-surface-raised]`
- Amount column: right-aligned, `tabular-nums`
- Category column: colored dot + name
- Hover row: `bg-[--color-surface-raised]` with smooth transition
- Checkbox column for bulk select: 40px fixed width, leftmost

### Badges

| Variant | Color                                                                      |
| ------- | -------------------------------------------------------------------------- |
| Income  | `bg-emerald-50 text-emerald-700` / dark: `bg-emerald-950 text-emerald-400` |
| Expense | `bg-rose-50 text-rose-700` / dark: `bg-rose-950 text-rose-400`             |
| Admin   | `bg-amber-50 text-amber-700` / dark: `bg-amber-950 text-amber-400`         |
| Member  | `bg-zinc-100 text-zinc-700` / dark: `bg-zinc-800 text-zinc-300`            |
| Warning | `bg-amber-50 text-amber-700`                                               |
| Danger  | `bg-rose-50 text-rose-700`                                                 |

### Forms

- Labels always above inputs, never floating
- `text-sm font-medium text-[--color-text]` for labels
- `text-xs text-[--color-text-muted] mt-1` for helper text
- `text-xs text-[--color-expense] mt-1` for error messages
- Input focus ring: `ring-2 ring-[--color-primary]`
- All inputs full-width within their container

### Budget progress bars

```
Food                          kr 3 200 / kr 5 000   64%
████████████████░░░░░░░░░░░    [ok — emerald]

Transport                     kr 4 100 / kr 4 500   91%
█████████████████████████░░░   [warning — amber]

Dining out                    kr 2 800 / kr 2 500   112%
████████████████████████████   [exceeded — rose]
```

- Bar height: `h-2`, rounded-full
- Color transitions: emerald (< 80%) → amber (80–100%) → rose (> 100%)
- Amount shown right-aligned with `tabular-nums`
- Percentage shown as badge to the right of the bar

### Empty states

Every list/table must have an empty state — not a blank page.

```
[Icon]
No transactions yet
Add your first transaction to get started.
[+ Add transaction]  ← primary CTA button
```

- Icon: Lucide, `h-10 w-10 text-[--color-text-muted]`
- Title: `text-base font-semibold`
- Description: `text-sm text-[--color-text-muted]`
- CTA: primary button

---

## Implementation Plan

Work in this order — each step is independently visible and reviewable:

### Step 1 — Design tokens

- Create `libs/ui/src/styles/tokens.css` with all CSS custom properties
- Wire into Tailwind config as `theme.extend.colors` aliases
- Replace hardcoded hex values in existing components

### Step 2 — Sidebar + TopBar redesign

- Add nav group section labels
- Implement new active state (left border, not full fill)
- Sidebar background distinct from page background
- TopBar: add household name/switcher dropdown, clean up spacing

### Step 3 — `libs/ui` component upgrades

- Button: swap indigo → emerald for default variant
- Badge: add income/expense/warning/danger variants
- New: `Stat` card component (KPI card with trend indicator)
- New: `ProgressBar` component (for budget status)
- New: `EmptyState` component

### Step 4 — Dashboard redesign

- KPI stat row at top (Income, Expenses, Net, Savings rate)
- Trend indicators on each stat
- Chart below stats (spending by category bar chart)
- Recent transactions list at bottom (last 5, link to full list)

### Step 5 — Transactions page

- Table with zebra striping + sticky header
- Filters in a clean filter bar above the table (not inline)
- Bulk delete in a contextual action bar that appears on row selection
- Empty state when no transactions match filters

### Step 6 — All remaining pages

- Apply consistent page structure (page title + action button top-right)
- Budget page: progress bars per category
- Household page: member list card redesign
- Settings page: tab sidebar pattern (not tab bar)
- Login/Register: center card layout, remove inline styles

---

## Playwright Visual Workflow

Use the Playwright MCP during the facelift to take before/after screenshots. This is **not** a test suite — it is a visual feedback loop during development.

**Workflow:**

1. Start the frontend (`npm run frontend:dev`)
2. Use Playwright MCP to navigate to each page and take a screenshot
3. Implement the change
4. Take another screenshot and compare

This replaces the need to manually open a browser and click around after every change.

**Pages to screenshot before starting:**

- `/login`
- `/dashboard`
- `/transactions`
- `/budgets`
- `/households`
- `/reports`
- `/settings`
