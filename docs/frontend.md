# Frontend — Microfrontend Architecture

The frontend mirrors the backend's distributed structure using **Module Federation** (Vite plugin).
Each microfrontend (MFE) is owned by the same logical team as its backend service.

---

## Architecture

```
Browser
  │
  ▼
┌─────────────────────────────────────────────────────────────┐
│                      shell (host app)                        │
│  - React Router v6 (routes load remote MFEs lazily)         │
│  - Auth state (JWT in memory + refresh token in httpOnly)    │
│  - Shared design system (Tailwind + shadcn/ui)               │
│  - Global notification bell                                  │
└────┬──────────┬──────────┬──────────┬────────────────────────┘
     │ lazy     │ lazy     │ lazy     │ lazy
     ▼          ▼          ▼          ▼
┌─────────┐ ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐
│  auth   │ │household │ │transaction │ │  budget  │ │ reports │ │settings  │
│   MFE   │ │   MFE    │ │    MFE     │ │   MFE    │ │   MFE   │ │   MFE    │
└─────────┘ └──────────┘ └────────────┘ └──────────┘ └─────────┘ └──────────┘
```

Each MFE is a **separately built and deployed** Vite app that exposes React components via Module Federation.
The shell loads them at runtime — no rebuild needed when a single MFE changes.

---

## MFE Breakdown

### `shell` (host)

The orchestrator. Never contains business logic.

**Responsibilities:**

- App layout (sidebar, top bar, notification bell)
- React Router routes — each route lazy-loads the correct remote MFE
- Auth context provider (JWT state, expiry, refresh logic)
- Shared `libs/ui` components available to all remotes
- Error boundary + loading fallback for each remote
- WebSocket connection to `wss://api.familieoya.furevikstrand.cloud/notifications` — receives real-time notification events and updates the bell badge + notification list without polling

**Routes:**

```
/               → redirect to /dashboard
/login          → auth MFE
/register       → auth MFE
/dashboard      → transactions MFE (summary view)
/transactions   → transactions MFE
/budgets        → budget MFE
/households     → household MFE
/reports        → reports MFE
/reports/*      → reports MFE
/settings       → settings MFE
/settings/*     → settings MFE
```

**WebSocket (real-time notifications):**

```typescript
// shell: libs/api-client/src/notifications.ws.ts
import { io } from 'socket.io-client'

export function connectNotificationSocket(token: string, onNotification: (n: Notification) => void) {
  const socket = io('wss://api.familieoya.furevikstrand.cloud/notifications', {
    query: { token },
    transports: ['websocket'],
  })
  socket.on('notification', onNotification)
  return socket
}
```

Shell calls this on login, passes a callback that updates the TanStack Query cache for `GET /notifications` — the bell badge updates instantly without a separate polling mechanism.

---

### `auth` MFE (remote)

**Exposes:** `LoginPage`, `RegisterPage`, `TwoFactorPage`, `ProfilePage`

**Pages:**

- Login form (email + password + optional 2FA code)
- Register form (name, email, password)
- Profile/settings (update name, email, password, delete account)

**API calls:** `POST /auth/login`, `POST /auth/register`, `GET /auth/me`, `PATCH /auth/me`

---

### `household` MFE (remote)

**Exposes:** `HouseholdPage`, `MembersPage`, `InvitationsPage`

**Pages:**

- Household overview (name, member list, roles)
- Invite member by email
- Accept invitation (deep link: `/invitations/:token`)
  - If not logged in: store token in `sessionStorage`, redirect to `/login?next=/invitations/:token`
  - If registering via invite: pre-fill email as read-only
  - If logged in with wrong email: show 403 message
  - If token expired or already used: show 410 message with "ask admin to resend"
- Remove member / change role

**API calls:** `GET/POST/PATCH /households`, `POST /households/:id/invitations`, etc.

---

### `transaction` MFE (remote)

**Exposes:** `DashboardPage`, `TransactionListPage`, `TransactionFormPage`, `CategoriesPage`

**Pages:**

- Dashboard: monthly summary cards + spending by category (chart)
- Transaction list: filterable table, bulk delete
- Add/edit transaction form
- Category management

**API calls:** `GET/POST/PATCH/DELETE /transactions`, `GET /transactions/summary`, `GET/POST /categories`

**Charts:** Recharts (lightweight, tree-shakeable)

---

### `budget` MFE (remote)

**Exposes:** `BudgetPage`, `BudgetStatusPage`

**Pages:**

- Budget limits list (per category per month) + edit form
- Budget status view: progress bars showing spent vs limit, colour-coded (ok/warning/exceeded)

**API calls:** `GET/POST/PATCH/DELETE /budgets`, `GET /budgets/status`

---

### `reports` MFE (remote)

**Exposes:** `ReportsIndexPage`, `MonthlyReportPage`, `YearlyReportPage`, `MemberReportPage`

**Pages:**

- Reports index: choose report type
- Monthly report: totals + category breakdown + comparison to previous month (charts)
- Yearly report: monthly breakdown over the year (bar chart)
- Per-member report: spending per household member
- CSV export button on each report + export history list

**API calls:** `GET /reports/monthly`, `GET /reports/yearly`, `GET /reports/member`, `GET /reports/export/csv`, `GET /reports/export/history`

---

### `settings` MFE (remote)

**Exposes:** `SettingsLayout` with nested pages

**Pages:**

| Page            | Description                                                   |
| --------------- | ------------------------------------------------------------- |
| Profile         | Update name, email                                            |
| Password        | Change password                                               |
| Two-factor auth | Enable/disable TOTP 2FA                                       |
| Appearance      | Dark / light / system theme toggle (stored in `localStorage`) |
| Notifications   | Toggle budget alerts + household update emails (GDPR opt-out) |
| Activity log    | Household activity feed from audit-service                    |
| Export history  | List of past CSV/PDF exports                                  |
| Privacy         | GDPR data export (JSON download) + delete account             |

**API calls:** auth-service (`/auth/me`, `/auth/2fa/*`, `/auth/me/data-export`, `/auth/me/notification-preferences`), `GET /audit/activity`, `GET /reports/export/history`

**Note:** Appearance is purely frontend — Tailwind `dark:` class toggle + `localStorage`. No API call.

---

## Tech Stack

| Layer         | Choice                             | Reason                                              |
| ------------- | ---------------------------------- | --------------------------------------------------- |
| Framework     | React 19 + TypeScript              | Latest stable; best Module Federation support       |
| Build tool    | Vite 5                             | Fast, first-class Module Federation support         |
| MFE wiring    | `@originjs/vite-plugin-federation` | Vite-native Module Federation                       |
| Styling       | Tailwind CSS v4 + shadcn/ui        | Rapid UI, consistent across MFEs via shared shell   |
| Routing       | React Router v6                    | Shell owns routes, MFEs export page components      |
| Data fetching | TanStack Query v5                  | Caching, optimistic updates, stale-while-revalidate |
| Charts        | Recharts                           | Lightweight, composable                             |
| Forms         | React Hook Form + Zod              | Type-safe validation                                |
| i18n          | i18next + react-i18next            | EN / NO / PT — shared via `libs/i18n`               |
| Testing       | Vitest + React Testing Library     | Per-MFE unit/integration tests                      |

### Why not Next.js?

Next.js was considered and ruled out for two reasons:

1. **Module Federation + Next.js is painful.** The `@module-federation/nextjs-mf` plugin works around Next.js internals and is especially awkward with the App Router. Vite gives us clean, first-class MFE support.

2. **SSR adds no value here.** Every route in this app is behind authentication — there is nothing to server-render for SEO. Next.js's primary benefit (SSR/SSG) is wasted on an authenticated dashboard app.

---

## Shared Libraries (`libs/ui`, `libs/api-client`, `libs/i18n`)

To avoid duplicating code across MFEs, three shared packages live in the monorepo:

### `libs/ui`

Exported from the shell host as a Module Federation singleton.

- Tailwind config
- shadcn/ui component wrappers (Button, Input, Card, Badge, etc.)
- Layout components (Page, Section, DataTable)

### `libs/api-client`

Typed API client generated from or handwritten against the backend contracts.

- One function per endpoint (`createTransaction`, `getBudgetStatus`, etc.)
- Handles JWT attachment + token refresh
- Shared by all MFEs — imported directly (not via Module Federation)

### `libs/i18n`

i18next setup + translation files + shared formatting utilities. Imported directly by all MFEs.

- EN / NO / PT translation files (`locales/en|no|pt/*.json`)
- Category key translations (`locales/*/categories.json`) — see `getCategoryName()` in edge-cases.md
- `formatDate(date, locale)` — always uses app locale, never `navigator.language`
- `formatCurrency(amount, locale, currency)` — divides by 100 (øre/centavos → display units), formats with `Intl.NumberFormat`

**Rule:** never call `Intl.DateTimeFormat` or `Intl.NumberFormat` directly in MFE code — always use these helpers with `i18n.language` as the locale.

---

## Auth Strategy

```
Login
  │
  ▼
api-gateway returns:
  - access_token (JWT, 15min TTL) → stored in memory (React context)
  - refresh_token → stored in httpOnly cookie (XSS-safe)

On each request:
  shell attaches Authorization: Bearer <access_token>

On 401:
  shell auto-calls POST /auth/refresh → gets new access_token
  Original request retried transparently (TanStack Query handles this)
```

No localStorage for tokens — avoids XSS exposure.

---

## Monorepo Structure (frontend addition)

```
familieoya/
├── apps/
│   ├── shell/                  ← host app, deployed to /
│   ├── mfe-auth/               ← remote, deployed to /remotes/auth/
│   ├── mfe-household/          ← remote, deployed to /remotes/household/
│   ├── mfe-transaction/        ← remote, deployed to /remotes/transaction/
│   ├── mfe-budget/             ← remote, deployed to /remotes/budget/
│   ├── mfe-reports/            ← remote, deployed to /remotes/reports/
│   ├── mfe-settings/           ← remote, deployed to /remotes/settings/
│   ├── api-gateway/            ← backend (existing)
│   ├── auth-service/           ← backend (existing)
│   └── ...
├── libs/
│   ├── ui/                     ← shared React components
│   ├── api-client/             ← typed API client
│   ├── contracts/              ← backend event types (existing)
│   ├── common/                 ← backend shared guards (existing)
│   └── testing/                ← test helpers (existing)
```

---

## Testing

**Unit tests — Vitest + React Testing Library:**

- Component rendering with mocked TanStack Query state
- Form validation (React Hook Form + Zod schemas)
- `getCategoryName()` — keyed vs user-created categories
- `formatDate()` / `formatCurrency()` — all 3 locales

**Integration tests — Vitest + MSW (Mock Service Worker):**

- MSW intercepts HTTP at the network level — no real backend, but tests the full component tree including hooks, query caching, and error states
- One test file per MFE covering the main user flow (add transaction, accept invitation, etc.)
- Key scenario to always test: loading state → data rendered → error state → retry

**No Playwright e2e** — backend integration tests cover the real distributed risk. MFE tests focus on UI behaviour. See roadmap.md test strategy for the full rationale.

---

## What to skip for portfolio scope

- Server-side rendering (SSR) — not needed, this is an authenticated app
- Storybook — nice but out of scope
- E2E Playwright tests — backend e2e is more important for this portfolio piece

---

## Portfolio story

> "The frontend mirrors the backend: each microfrontend is independently deployable and maps 1:1 to a backend service. The shell orchestrates them at runtime via Module Federation — add a new service, deploy a new MFE, no rebuild of the host required."
