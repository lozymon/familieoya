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

### Spacing scale

We use Tailwind's default 4px base unit. Only use values from this list — never arbitrary values like `mt-[13px]`.

| Token | px  | Usage                                    |
| ----- | --- | ---------------------------------------- |
| `1`   | 4   | Icon gap, tight inline spacing           |
| `1.5` | 6   | Label-to-input gap, badge inner padding  |
| `2`   | 8   | Button icon gap, small component gap     |
| `3`   | 12  | Input padding, list row gap              |
| `4`   | 16  | Card compact padding, table cell padding |
| `5`   | 20  | Form field gap                           |
| `6`   | 24  | Card standard padding, section inner gap |
| `8`   | 32  | Between major page sections              |
| `12`  | 48  | Sidebar horizontal padding               |

### Page structure — every page must follow this pattern

```
<div className="flex flex-col gap-8">         ← outer wrapper, gap-8 between all sections

  {/* 1. Page header — always first */}
  <div>
    <h1 ...>Page title</h1>                    ← text-2xl font-semibold
    <p ...>Subtitle or context</p>             ← text-sm text-zinc-500, mt-1
  </div>

  {/* 2. Primary action / filter bar — if needed */}
  <div className="flex items-center gap-3">
    ...inputs, selects, buttons...
  </div>

  {/* 3. Content — cards, tables, lists */}
  <Card>...</Card>
  <Card>...</Card>

</div>
```

**Rules:**

- Always `gap-8` between the page header and the first content block
- Always `gap-6` between sibling cards
- Never put content directly under `<h1>` — always wrap in the `<div>` block above
- Always include a subtitle (`<p>`) under every page title — even one sentence

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

### Card internal structure

Every card follows this internal layout:

```
<Card>
  <CardHeader>                  ← pb-3 or pb-4, never default pb-6 for data cards
    <CardTitle>Section name</CardTitle>          ← text-base font-semibold
    [optional: right-aligned link or action]
  </CardHeader>
  <CardContent>
    ...content...
  </CardContent>
</Card>
```

- `CardTitle` is always `text-base font-semibold` — never `text-2xl` inside a card
- If a card has a table or list, use `CardContent className="p-0"` and let rows handle their own `px-6 py-3`
- If a card has a form, use `CardContent` with default padding

### List rows (inside cards)

All list rows use the same pattern:

```
<li className="flex items-center gap-3 px-6 py-3">
  [optional: avatar or icon — h-8 w-8 shrink-0]
  <div className="min-w-0 flex-1">
    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">Primary text</p>
    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">Secondary text</p>
  </div>
  [optional: badge, actions — shrink-0]
</li>
```

- Always `px-6 py-3` — never `px-4` in list rows (that's for table cells)
- Dividers: `divide-y divide-zinc-100 dark:divide-zinc-800` on the `<ul>`
- Last row has no bottom border (handled by `divide-y` automatically)

### Table cells

| Element         | Padding     | Notes                                                         |
| --------------- | ----------- | ------------------------------------------------------------- |
| `<th>`          | `px-4 py-3` | `text-xs uppercase tracking-wide font-semibold text-zinc-500` |
| `<td>`          | `px-4 py-3` | `text-sm`                                                     |
| Amount `<td>`   | `px-4 py-3` | `text-right tabular-nums font-medium`                         |
| Checkbox `<td>` | `px-4 py-3` | `w-10 shrink-0`                                               |
| Action `<td>`   | `px-4 py-3` | `text-right w-16`                                             |

### Forms

| Element         | Class                                                  |
| --------------- | ------------------------------------------------------ |
| Field wrapper   | `flex flex-col gap-1.5`                                |
| Label           | `text-sm font-medium text-zinc-700 dark:text-zinc-300` |
| Helper text     | `text-xs text-zinc-500 dark:text-zinc-400`             |
| Error text      | `text-xs text-rose-600 dark:text-rose-400`             |
| Field group gap | `gap-5` between form fields                            |
| Section gap     | `gap-8` between the page header and the form           |

- Labels always above the input — never beside or floating
- Error text always below the input — never in a toast or modal
- A form `<section>` label (e.g. "Add custom category") is `text-sm font-medium text-zinc-700 dark:text-zinc-300`, placed above the input row

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

## Loading States

Every async operation must show a loading state. Never leave the user looking at a blank area or stale data.

### Which pattern to use

| Situation                                   | Pattern                                                     |
| ------------------------------------------- | ----------------------------------------------------------- |
| Full page first load                        | Skeleton rows/cards                                         |
| Card/list reload (e.g. after filter change) | Keep stale data visible, show subtle spinner in card header |
| Button action (submit, delete)              | Disable button + replace label with `…` suffix              |
| Inline data (e.g. a single value)           | Replace with `—` (em dash)                                  |

### Skeleton pattern

Use for initial page loads where no data exists yet. Fake rows/cards with a pulse animation:

```tsx
// Table skeleton — 5 rows
{
  isLoading &&
    Array.from({ length: 5 }).map((_, i) => (
      <tr key={i} className="animate-pulse">
        <td className="px-4 py-3">
          <div className="h-4 w-4 rounded bg-zinc-200 dark:bg-zinc-700" />
        </td>
        <td className="px-4 py-3">
          <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
        </td>
        <td className="px-4 py-3">
          <div className="h-4 w-40 rounded bg-zinc-200 dark:bg-zinc-700" />
        </td>
        <td className="px-4 py-3">
          <div className="h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-700" />
        </td>
        <td className="px-4 py-3 text-right">
          <div className="ml-auto h-4 w-16 rounded bg-zinc-200 dark:bg-zinc-700" />
        </td>
      </tr>
    ));
}
```

### Button loading pattern

```tsx
<Button type="submit" disabled={isSubmitting}>
  {isSubmitting ? 'Saving…' : 'Save'}
</Button>
```

- Always disable the button during submission
- Always append `…` to the label — never use a spinner inside a button
- Never show two buttons (one to submit, one to cancel) while submitting

### Inline value loading

```tsx
<p className="tabular-nums text-2xl font-bold">
  {isLoading ? '—' : formatCurrency(amount)}
</p>
```

- Use `—` (em dash) not `...` or `Loading`
- Keep the same font/size so layout does not shift when data arrives

---

## Feedback & Success States

How the app responds after a user action completes.

### Success feedback

Always inline, never a toast or modal. Green text below the action, auto-clears after 3 seconds.

```tsx
const [success, setSuccess] = useState(false);

// In mutation onSuccess:
setSuccess(true);
setTimeout(() => setSuccess(false), 3000);

// In JSX, directly below the submit button:
{
  success && (
    <p className="text-xs text-emerald-600 dark:text-emerald-400">
      Saved successfully.
    </p>
  );
}
```

- Text is always `text-xs` — not a big banner
- Always placed below the form/button, not at the top of the page
- Auto-clears — never requires a dismiss action from the user

### Error feedback

Inline below the specific field that failed. For server errors (root errors), below the submit button.

```tsx
{
  errors.root && (
    <p className="text-xs text-rose-600 dark:text-rose-400">
      {errors.root.message}
    </p>
  );
}
```

- Never `alert()`, never a modal, never a toast
- Field errors: below the input they relate to
- Server/root errors: below the submit button

### Destructive confirmations

For irreversible actions (delete, remove member, delete account): replace the action button with an inline confirm step — not a modal.

```
[Delete]  →  [Are you sure?]  [Yes, delete]  [Cancel]
```

This keeps the user in context and avoids modal z-index and focus trap complexity.

---

## Page Header Variants

Every page uses exactly one of these three header patterns. Choose based on whether the page has a primary action.

### Variant A — Title + subtitle (read-only pages, reports, settings sections)

```tsx
<div>
  <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
    Page Title
  </h1>
  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
    One sentence describing what this page shows.
  </p>
</div>
```

### Variant B — Title + subtitle + primary action (pages with a main CTA)

```tsx
<div className="flex items-start justify-between gap-4">
  <div>
    <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
      Page Title
    </h1>
    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
      One sentence describing what this page shows.
    </p>
  </div>
  <Button asChild>
    <Link to="/path/new">
      <Plus className="h-4 w-4" />
      Add item
    </Link>
  </Button>
</div>
```

### Variant C — Title only (simple pages, sub-settings pages)

Only acceptable when the page content itself makes context immediately obvious (e.g. a form page with a clear heading inside).

```tsx
<h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
  Page Title
</h1>
```

**Which pages use which:**

| Page             | Variant                         |
| ---------------- | ------------------------------- |
| Dashboard        | B (+ Add transaction)           |
| Transactions     | B (+ Add transaction)           |
| Categories       | B (+ Add category)              |
| Budgets          | B (+ Add budget)                |
| Reports          | A                               |
| Household        | B (+ Invite member, admin only) |
| Settings         | A                               |
| Login / Register | C (form is self-explanatory)    |

---

## Icon Mapping

Always use the same icon for the same concept across all pages and all MFEs.

| Concept                    | Icon              | Import       |
| -------------------------- | ----------------- | ------------ |
| Dashboard / overview       | `LayoutDashboard` | lucide-react |
| Transaction / payment      | `CreditCard`      | lucide-react |
| Category / tag             | `Tag`             | lucide-react |
| Budget / target            | `Target`          | lucide-react |
| Household / home           | `Home`            | lucide-react |
| Reports / chart            | `BarChart2`       | lucide-react |
| Settings / gear            | `Settings`        | lucide-react |
| Income / up                | `TrendingUp`      | lucide-react |
| Expense / down             | `TrendingDown`    | lucide-react |
| Net / wallet               | `Wallet`          | lucide-react |
| Savings                    | `PiggyBank`       | lucide-react |
| Add / new                  | `Plus`            | lucide-react |
| Edit / pencil              | `Pencil`          | lucide-react |
| Delete / trash             | `Trash2`          | lucide-react |
| Confirm / check            | `Check`           | lucide-react |
| Cancel / close             | `X`               | lucide-react |
| Member / user              | `User`            | lucide-react |
| Invite / add user          | `UserPlus`        | lucide-react |
| Admin / crown              | `Crown`           | lucide-react |
| Notification / bell        | `Bell`            | lucide-react |
| Receipt / transaction item | `ReceiptText`     | lucide-react |
| Logout                     | `LogOut`          | lucide-react |
| Theme / sun                | `Sun`             | lucide-react |
| Theme / moon               | `Moon`            | lucide-react |

**Rules:**

- Never use two different icons for the same concept in different parts of the app
- Always `h-4 w-4` for icons inside buttons and list rows
- Always `h-5 w-5` for icons in the topbar
- Always `h-8 w-8` or `h-10 w-10` for empty state icons (use `h-10 w-10` for primary empty states, `h-8 w-8` for inline/compact ones)
- Never use emoji as icons

---

## Responsive Rules

The app is primarily a desktop app (authenticated dashboard), but must be usable on tablet. Mobile is a nice-to-have — the Flutter app covers mobile users.

### Breakpoints in use

| Breakpoint | Width  | Notes                        |
| ---------- | ------ | ---------------------------- |
| `sm`       | 640px  | Minimum functional width     |
| `md`       | 768px  | Tablet — sidebar may overlap |
| `lg`       | 1024px | Full desktop layout          |

### Grid behaviour

| Component     | Desktop (`lg`) | Tablet (`md`)     | Mobile (`sm`)     |
| ------------- | -------------- | ----------------- | ----------------- |
| KPI stat row  | 4 columns      | 2 columns         | 1 column          |
| Filter bar    | Single row     | Single row, wraps | Stacks vertically |
| Settings tabs | Sidebar left   | Sidebar left      | Horizontal scroll |
| Auth pages    | Centered card  | Centered card     | Full width card   |

```tsx
// KPI grid — correct responsive pattern
<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
```

### What collapses vs what stays

- **Sidebar**: always visible at `lg+`. At `md` and below it is hidden (mobile users use the Flutter app)
- **Cards**: always full width — never side-by-side cards
- **Tables**: horizontally scrollable at `sm` — wrap in `overflow-x-auto`
- **Forms**: always full width within their container — never multi-column form layouts
- **TopBar**: always full width, always visible

---

## Tailwind Build Setup — CRITICAL

**Every MFE must have `@tailwindcss/vite` in its vite config.** Without it, Tailwind classes written in page components are never compiled. Only classes in `libs/ui` components are compiled (by the shell's build). This means `gap-8`, `grid-cols-4`, `flex-col`, etc. written directly in page files will have no effect at runtime.

### Required vite.config.ts pattern for all MFEs

```ts
export default defineConfig(async () => {
  const { default: tailwindcss } = await import('@tailwindcss/vite');
  return {
    plugins: [react(), tailwindcss(), federation({ ... })],
    ...
  };
});
```

### Required styles.css in every MFE

Each MFE must have `src/styles.css` with at minimum:

```css
@import 'tailwindcss';
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
```

And every page component must import it: `import '../styles.css';`

**The authoritative fix — shell `@source` scanning:** The shell's `apps/shell/src/styles.css` uses `@source` directives to scan every MFE's source files. This means all Tailwind classes in any page component are compiled into the shell's global CSS (always loaded). The MFE's own CSS file does NOT need to load correctly.

When adding a new MFE, add a `@source` line to `apps/shell/src/styles.css` and rebuild the shell.

---

## Do / Don't

Explicit rules derived from mistakes made during Phase 7c. Read this before writing any frontend code.

### Colors

| ❌ Don't                                   | ✅ Do                              |
| ------------------------------------------ | ---------------------------------- |
| `bg-indigo-600`                            | `bg-emerald-600`                   |
| `text-slate-500`                           | `text-zinc-500`                    |
| `text-red-500`                             | `text-rose-600`                    |
| `border-slate-200`                         | `border-zinc-200`                  |
| Hardcoded hex `#6366f1` in JSX             | Use Tailwind class or CSS variable |
| `style={{ color: '#059669' }}` in app code | Use `className="text-emerald-600"` |
| Inline styles for layout and spacing       | Use Tailwind classes               |

**Exception:** Inline styles are acceptable only in `mfe-auth` pages where Tailwind v4 JIT scanning is unreliable in preview builds. Everywhere else use Tailwind classes.

### Spacing

| ❌ Don't                                 | ✅ Do                          |
| ---------------------------------------- | ------------------------------ |
| `gap-3` between major page sections      | `gap-8` between major sections |
| `gap-6` between the title and first card | `gap-8`                        |
| `px-4 py-3` in list rows                 | `px-6 py-3` in list rows       |
| `px-6 py-3` in table cells               | `px-4 py-3` in table cells     |
| Arbitrary values: `mt-[13px]`            | Use scale values only          |
| Missing subtitle under page title        | Always add a subtitle          |

### Components

| ❌ Don't                             | ✅ Do                                  |
| ------------------------------------ | -------------------------------------- |
| Plain `<button>` element             | `<Button>` from `@familieoya/ui`       |
| Plain `<input>` element              | `<Input>` from `@familieoya/ui`        |
| `<p>No results.</p>` for empty lists | `<EmptyState>` from `@familieoya/ui`   |
| "Loading…" text string               | Skeleton rows or `—` for inline values |
| `CardTitle` with `text-2xl`          | `CardTitle` is always `text-base`      |
| Different icons for the same concept | Follow the icon mapping table          |
| `toast()` for success/error feedback | Inline text below the form             |
| Modal for destructive confirmations  | Inline confirm step                    |

### Structure

| ❌ Don't                                      | ✅ Do                                                   |
| --------------------------------------------- | ------------------------------------------------------- |
| Content directly under `<h1>` with no wrapper | Wrap in `<div className="flex flex-col gap-8">`         |
| Page without a subtitle                       | Always add `<p className="mt-1 text-sm text-zinc-500">` |
| Mix of `gap-6` and `gap-8` at top level       | Always `gap-8` at page level                            |
| Horizontal tab bar for settings               | Left sidebar tab pattern                                |
| Split-panel layout for auth pages             | Centered card on zinc-50 background                     |

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
