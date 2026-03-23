# Build Roadmap

Phased approach — each phase is independently deployable and showable.

---

## Phase 0 — Project Setup (before first commit)

_Do this once, before any code. Claude Code reads these files automatically on every session._

### Pre-reading (before Phase 0 tasks)

- [ ] **Nx monorepo basics** — nx.dev/getting-started/intro — understand workspace structure, `nx.json`, running targets before creating the repo
- [ ] **NestJS Microservices + RabbitMQ transport** — NestJS docs → Microservices → RabbitMQ — you'll write `@EventPattern` handlers and `ClientProxy` from Phase 1 day one
- [ ] **RabbitMQ exchanges + queues** — rabbitmq.com/tutorials, tutorials 1–4 (~1 hour) — understand topic exchanges and queue bindings before wiring the event bus
- [ ] _(Before Phase 6)_ **Module Federation with Vite** — `@originjs/vite-plugin-federation` README + examples — how remotes and the host shell are wired at build time

- [ ] Set local git identity in each repo (do this immediately after `git init` / cloning, before the first commit):
  ```bash
  git config user.name "Kim Andrè Furevikstrand"
  git config user.email "lozymon@gmail.com"
  ```
  Do this for all three repos: `familieoya`, `familieoya-mobile`, `familieoya-landing`.
- [ ] Copy all planning docs into `docs/` folder in the project root: `services.md`, `edge-cases.md`, `roadmap.md`, `frontend.md`, `billing.md`, `deployment.md`, `ai-features.md`, `claude-code.md`. Claude Code only reads files inside the project directory — docs left in `todo-projects/` will be invisible to it.
- [ ] Copy `mobile.md` into the `familieoya-mobile` repo's `docs/` folder instead.
- [ ] Create root `CLAUDE.md` — use template in `docs/claude-code.md`. References `docs/` paths.
- [ ] Create per-service `CLAUDE.md` stub (fill in as each service is scaffolded) — service responsibility, DB tables, events published/consumed, test commands
- [ ] Add `.env.example` with all required env vars (see `docs/billing.md` for Stripe vars, `docs/deployment.md` for the rest)
- [ ] Set up **GitHub MCP** (`claude mcp add github`) — enables CI status, issue creation, PR review from Claude Code
- [ ] Set up **PostgreSQL MCP** (`claude mcp add postgres`) — query service DBs directly during development (add when first DB is running in Phase 1)
- [ ] Set up **Context7 MCP** (`claude mcp add context7 -- npx -y @upstash/context7-mcp`) — pulls versioned library docs (NestJS, TypeORM, Riverpod, etc.) into context on demand; avoids hallucinated APIs
- [ ] Set up **Sequential Thinking MCP** (`claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking`) — structured multi-step reasoning for complex cross-service design problems
- [ ] Install **cc-status-line** (`npx cc-status-line@latest`) — adds a status bar to Claude Code showing context %, session cost, model, and git branch. Keep context below ~50% before starting a new session to avoid degraded output.
- [ ] _(Phase 10)_ Set up **Stripe MCP** when starting billing — inspect products, prices, webhook logs from Claude Code
- [ ] Install `@nestjs/swagger` on `api-gateway` — configure Swagger UI at `/docs`, enable the NestJS Swagger CLI plugin in `nest-cli.json` to auto-infer DTO properties from TypeScript types (reduces manual `@ApiProperty()` decoration significantly)

---

## Phase 1 — Foundation (Week 1–2)

_Goal: Monorepo scaffold + auth working end-to-end_

- [ ] Init Nx monorepo (`npx create-nx-workspace@latest familieoya --preset=ts`) — Nx is chosen over native Nest CLI for build caching and task orchestration across 10 services + 6 MFEs
- [ ] Set up `libs/contracts` — `BaseEvent` (with `eventId: string`), first event interfaces (`UserRegisteredEvent` incl. `preferredLanguage`, `UserDeletedEvent`)
- [ ] Set up `libs/common` with shared JWT guard, `X-Household-ID` validation guard + decorators
- [ ] Set up `libs/testing` with DB reset helpers
- [ ] Scaffold `api-gateway` — JWT validation, `X-Household-ID` membership check, proxy routing
- [ ] Scaffold `auth-service` — register, login, JWT issuance (RS256), `preferredLanguage` stored on user
- [ ] Docker Compose: gateway + auth + postgres_auth + RabbitMQ
- [ ] Integration tests for register → login → verify token flow
- [ ] Create `docker-compose.test.yml` — infrastructure only (postgres + rabbitmq, no frontend, `_test` DB names)
- [ ] Set up GitHub Actions CI (`.github/workflows/ci.yml`):

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  # Job 1: lint + unit tests + build (every PR + push)
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0          # required for nx affected

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - uses: nrwl/nx-set-shas@v4  # sets NX_BASE + NX_HEAD for affected

      - run: npx nx affected --target=lint --parallel=3
      - run: npx nx affected --target=test --parallel=3
      - run: npx nx affected --target=build --parallel=3 --configuration=production

  # Job 2: integration tests (push to main only — needs real DBs)
  integration:
    runs-on: ubuntu-latest
    needs: ci
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Start test infrastructure
        run: docker compose -f docker-compose.test.yml up -d --wait

      - run: npm run test:integration

      - name: Stop test infrastructure
        if: always()
        run: docker compose -f docker-compose.test.yml down -v
```

**Milestone:** `docker-compose up` → can register and get a JWT

---

## Phase 2 — Households (Week 3)

_Goal: Users can create and join households_

- [ ] Scaffold `household-service` with PostgreSQL
- [ ] Implement household CRUD
- [ ] Implement member management + role system (admin/member)
- [ ] Implement invitation flow (token-based, email-tied, one-time use `usedAt`)
- [ ] Publish `household.created` + `household.invitation.sent` + `household.member.joined` + `household.deleted` events
- [ ] `POST /invitations/:token/accept` returns `{ householdId, householdName }` — client uses this to update active household context
- [ ] Scaffold `notification-service` (consume invitation event → log to console for now)
- [ ] Integration tests for full invitation flow

**Milestone:** User A invites user B → B accepts → both are in the household

---

## Phase 3 — Transactions & Categories (Week 4–5)

_Goal: Core financial data entry working_

- [ ] Scaffold `transaction-service` with PostgreSQL
- [ ] Implement category CRUD — seeded with **keyed** categories (`food`, `electricity`, `housing`, etc.) not Norwegian strings. `key` field is null for user-created categories. See edge-cases.md for full seed table.
- [ ] Implement transaction CRUD + bulk delete
- [ ] Implement `/summary` endpoint (totals by category/month)
- [ ] Publish `transaction.created/updated/deleted` events
- [ ] Integration tests covering CRUD + event emission

**Milestone:** Can add income/expense transactions; summary endpoint returns correct totals

---

## Phase 4 — Budgets & Saga (Week 6–7)

_Goal: The core portfolio-worthy architecture piece_

- [ ] Scaffold `budget-service` with PostgreSQL
- [ ] Implement budget limit CRUD
- [ ] Consume `transaction.*` events → maintain running spending totals
- [ ] Configure `noAck: false` on all RabbitMQ consumers (manual ack required for idempotency)
- [ ] Implement threshold detection (80% warning, 100% exceeded) with `budget_alert_state` deduplication table
- [ ] Implement `processed_event_ids` table + `withIdempotency()` helper in budget-service and report-service
- [ ] Publish `budget.threshold.warning` + `budget.threshold.exceeded`
- [ ] Implement `/budgets/status` endpoint
- [ ] Wire `notification-service` to consume budget events + send email (Nodemailer/Resend)
- [ ] Write saga integration test:
  - Create transaction → assert `transaction.created` published
  - Assert budget-service updates spending total
  - Assert `budget.threshold.exceeded` published when over limit
  - Assert notification-service receives event

**Milestone:** Full saga working: transaction → budget check → email alert

---

## Phase 5 — Notifications & Polish (Week 8)

_Goal: Real emails, in-app notifications, clean UX for portfolio_

- [ ] Persist notifications in `notification-service` DB
- [ ] Add GET `/notifications` + mark-as-read endpoints
- [ ] Send real emails (welcome, invitation, budget alerts) via Resend or Nodemailer
- [ ] Consume `user.registered` → welcome email
- [ ] Add health check endpoints to all services (`/health`)
- [ ] Write e2e test covering the full user journey
- [ ] Add `@WebSocketGateway` to api-gateway — JWT handshake auth, userId→socket map, consume `notification.created` events and push to connected client
- [ ] Publish `notification.created` event from notification-service after persisting each in-app notification
- [ ] Connect shell to WebSocket on login — update TanStack Query notification cache on incoming events
- [ ] Add weekly spending digest cron (`@Cron('0 8 * * MON')`) to notification-service — queries household-service + report-service, sends Monday morning email to opted-in members
- [ ] Add `weeklyDigest` boolean to notification preferences (auth-service) — default true, exposed in `mfe-settings` Notifications page
- [ ] Add `GET /internal/households/active` to household-service for digest use

---

## Phase 6 — Frontend Shell + Auth MFE (Week 9–10)

_Goal: Working frontend skeleton with login flow_

- [ ] Scaffold Vite monorepo apps: `shell`, `mfe-auth`, `mfe-transaction`, `mfe-household`, `mfe-budget`
- [ ] Set up `libs/ui` with shared Tailwind config + base shadcn/ui components
- [ ] Set up `libs/api-client` with typed functions for auth endpoints
- [ ] Configure Module Federation in shell + `mfe-auth`
- [ ] Shell: sidebar layout, top bar, notification bell placeholder, React Router routes
- [ ] Auth MFE: login page, register page, profile page
- [ ] Shell: JWT auth context (access token in memory, refresh token in httpOnly cookie)
- [ ] Auto-refresh token on 401 (transparent retry via TanStack Query)
- [ ] Add frontend services to Docker Compose

**Milestone:** `docker-compose up` → can register, log in, see the shell layout

---

## Phase 7 — Transaction + Household MFEs (Week 11)

_Goal: Core data entry usable in the browser_

- [ ] Wire `libs/api-client` for transaction + household endpoints
- [ ] Transaction MFE: transaction list page (filterable table), add/edit form, bulk delete
- [ ] Transaction MFE: dashboard page — monthly summary cards + spending by category chart (Recharts)
- [ ] Transaction MFE: category management page
- [ ] Household MFE: household overview, member list, invite flow, role management
- [ ] Connect shell notification bell to `GET /notifications`

**Milestone:** Full transaction CRUD and household management working in browser

---

## Phase 7b — Reports + Settings + Audit (Week 11–12)

_Goal: Complete the full feature set_

**Backend:**

- [ ] Scaffold `report-service` — consumes `transaction.*` events, maintains aggregated read model
- [ ] Implement monthly, yearly, member report endpoints
- [ ] Implement CSV export + `export_history` table
- [ ] Scaffold `audit-service` — consumes all write events, stores to `activity_logs`
- [ ] Add `GET /audit/activity` endpoint
- [ ] Add `GET /auth/me/data-export` (GDPR JSON export) to auth-service

**Frontend:**

- [ ] Reports MFE: index, monthly report + chart, yearly report + chart, per-member report
- [ ] Reports MFE: CSV export button + export history list
- [ ] Settings MFE: profile, password, 2FA pages (move out of auth MFE)
- [ ] Settings MFE: appearance page (dark/light/system toggle via Tailwind + localStorage)
- [ ] Settings MFE: activity log page (feed from audit-service)
- [ ] Settings MFE: export history page
- [ ] Settings MFE: privacy page (GDPR data export download + delete account with confirmation)

**Milestone:** Full feature set complete — reports, settings, audit, and GDPR all working

---

## Phase 8 — Budget MFE + i18n + Full Integration (Week 13–14)

_Goal: Budget status visible; full saga visible in browser; app available in 3 languages_

- [ ] Budget MFE: budget limits list + add/edit form
- [ ] Budget MFE: spending status page — progress bars per category (ok/warning/exceeded)
- [ ] In-app notification when budget threshold event arrives via WebSocket (gateway implemented in Phase 5)
- [ ] Mark notification as read
- [ ] Manual e2e walkthrough: add transaction → watch budget status update → receive alert

**i18n (web):**

- [ ] Add `i18next` + `react-i18next` to `libs/i18n` shared package
- [ ] Create translation files: `en.json`, `no.json`, `pt.json`
- [ ] Wrap all MFEs with i18n provider from shell
- [ ] Language switcher in shell top bar (EN / NO / PT)
- [ ] Persist selected language to `localStorage`
- [ ] Translate all UI strings across all MFEs

**Milestone:** Complete user journey working end-to-end in all 3 languages

---

## Phase 9 — Flutter Mobile App (Week 14–17)

_Goal: Native iOS + Android app — learning Flutter/Dart from scratch_

### Pre-work (Week 14 — learning, no coding)

- [ ] Dart language tour — null safety, async/await, sealed classes (dart.dev/language)
- [ ] Flutter basics — Widget tree, StatelessWidget vs StatefulWidget, BuildContext
- [ ] Riverpod intro — `Provider`, `AsyncNotifierProvider`, `ref.watch` vs `ref.read`

### Scaffold (Week 14 end)

- [ ] `flutter create familieoya-mobile` — new separate repo
- [ ] Set up Riverpod, Dio, go_router, flutter_secure_storage, freezed
- [ ] Dio interceptor: attach JWT + auto-refresh on 401
- [ ] go_router: define all routes + deep link for `/invitations/:token`
- [ ] App theme — `AppTheme.light` + `AppTheme.dark` + `ThemeModeNotifier` (stored in `shared_preferences`, follows OS by default)

### Auth + Dashboard (Week 15)

- [ ] Login screen + Register screen
- [ ] `auth_provider.dart` — Riverpod notifier for auth state
- [ ] Secure token storage on login/logout
- [ ] Dashboard screen — monthly summary cards + fl_chart spending chart
- [ ] Bottom navigation bar (Dashboard / Transactions / Budgets / Notifications)

### Transactions (Week 15–16)

- [ ] Transaction list screen (grouped by day, pull-to-refresh)
- [ ] Swipe-to-delete with undo snackbar
- [ ] FAB → bottom sheet quick-add form (amount, category chips, type toggle, date)
- [ ] Optimistic UI update on add

### Budgets + Notifications (Week 16)

- [ ] Budget status screen — progress bars per category, colour-coded
- [ ] Notification list screen — in-app alerts, tap to mark as read
- [ ] Badge on notification icon when unread count > 0

### i18n (Week 16–17)

- [ ] Add `flutter_localizations` + `intl` package
- [ ] Create ARB files: `app_en.arb`, `app_no.arb`, `app_pt.arb`
- [ ] Run `flutter gen-l10n` to generate typed `AppLocalizations`
- [ ] Language switcher in profile screen (EN / NO / PT)
- [ ] Persist selected locale to `flutter_secure_storage`

### Polish + Build (Week 17)

- [ ] Deep link handling for invitation acceptance
- [ ] Loading states + error handling throughout
- [ ] Widget tests for key screens
- [ ] Build release APK → attach to GitHub release
- [ ] Screen recordings / screenshots for portfolio

**Milestone:** Working Android APK, full auth + dashboard + transactions + budgets flow

---

## Phase 10 — Stripe Billing (Week 18–19)

_Goal: Freemium model working end-to-end_

- [ ] Scaffold `billing-service` with PostgreSQL
- [ ] Set up Stripe products + prices in Stripe dashboard (Free / Pro / Family)
- [ ] `POST /billing/checkout` — create Stripe Checkout session
- [ ] `POST /billing/webhook` — handle `checkout.session.completed`, `subscription.updated`, `subscription.deleted`, `invoice.payment_failed`
- [ ] Publish `subscription.activated` / `subscription.cancelled` events
- [ ] Add `plan` field to JWT claims (auth-service reads subscription status)
- [ ] `transaction-service` — enforce 50 transaction/month limit for Free plan
- [ ] `household-service` — enforce member count limits per plan
- [ ] `report-service` — return 403 for Free plan users
- [ ] `mfe-settings` — billing page: current plan, usage, upgrade CTA, Stripe Customer Portal link
- [ ] Shell — plan gates: lock icon + upgrade CTA for Free users on Pro features
- [ ] 14-day Pro trial on registration (billing-service consumes `user.registered`)
- [ ] Wire `subscription.payment.failed` → notification-service → payment failure email

**Milestone:** Full checkout flow working — user upgrades from Free to Pro, features unlock

---

## Phase 11 — AI Features (Week 20–21)

_Goal: Claude API integrated across web and mobile_

- [ ] Scaffold `ai-service` (stateless, no DB)
- [ ] `POST /ai/categorize` — Claude Haiku suggests category from description
- [ ] `POST /ai/insights` — Claude Sonnet generates monthly spending summary
- [ ] `POST /ai/budget-recommendations` — Claude Sonnet recommends budget limits
- [ ] `POST /ai/search` — Claude Haiku translates natural language to transaction filters
- [ ] Rate limiting + response caching (insights cached 7 days, search 20/day/household)
- [ ] Web: categorization suggestion in quick-add form (debounced, 300ms)
- [ ] Web: AI insights card on dashboard (Pro/Family only, locked for Free)
- [ ] Web: NL search in transaction list search bar
- [ ] Web: budget recommendations on budget page when no limits set
- [ ] Mobile: same 4 features across Flutter screens

**Milestone:** Type a Norwegian receipt description → correct category suggested automatically

---

## Phase 12 — Landing Page (Week 22)

_Goal: Public-facing marketing site live at familieoya.furevikstrand.cloud_

- [ ] Create `familieoya-landing` repo (Astro 4)
- [ ] Set up `astro-i18next` — EN / NO / PT route-based i18n
- [ ] Hero section (headline, subheadline, CTA buttons, app screenshot)
- [ ] Features section (4 feature cards)
- [ ] How it works section (3-step visual)
- [ ] Pricing section (Free / Pro / Family cards with feature comparison)
- [ ] Footer with language switcher
- [ ] Privacy policy + Terms of service pages
- [ ] Deploy to Coolify at `familieoya.furevikstrand.cloud`
- [ ] `app.familieoya.furevikstrand.cloud` → the main app shell

**Milestone:** `familieoya.furevikstrand.cloud` live with pricing, `app.familieoya.furevikstrand.cloud` is the app

---

## Phase 13 — Docs & Portfolio Presentation (Week 23)

_Goal: Make the full stack easy for employers to understand and run_

- [ ] Root `README.md` with full architecture diagram
- [ ] Document all event contracts in `libs/contracts/README.md`
- [ ] Document how to run locally (single `docker-compose up`)
- [ ] Document how to run tests
- [ ] Add to portfolio site (furevikstrand.cloud) with case study write-up
- [ ] Include Flutter APK download link + screen recordings in portfolio
- [ ] GitHub repo public + pinned

---

## What to skip (keep it focused)

These are intentionally out of scope for the portfolio version:

- PDF report export
- Bank sync / PSD2
- Subscription/payments
- ~~Multi-language / i18n~~ → added to Phase 8 (web) and Phase 9 (mobile)
- Storybook / Playwright e2e tests (backend e2e is more important here)
- SSR (this is an authenticated app, SSR adds complexity without benefit)

The point is the **architecture**, not feature completeness.

---

## Test strategy

### Methodology

**Integration-first.** The most valuable test is one that proves multiple services work together correctly. Unit tests support integration tests — not the other way around. Write the integration test for a flow first; add unit tests only where the logic is complex enough to warrant isolated testing.

**Behaviour-driven naming.** Tests describe what the system does, not what the function is called:

```typescript
// ✅
describe('when spending crosses 80% of the budget limit', () => {
  it(
    'publishes budget.threshold.warning once and not again on subsequent transactions',
  );
});

// ❌
describe('checkThreshold()', () => {
  it('works correctly');
});
```

**AAA structure** — every test: Arrange (set up state), Act (trigger the behaviour), Assert (verify outcome). No logic between sections.

**Real infrastructure for backend** — real PostgreSQL, real RabbitMQ. No in-memory fakes, no mocked repositories. The only accepted mock is the Stripe API client.

**Critical path coverage, not % targets.** Cover the flows that matter:

- Auth (register → login → refresh → logout)
- Invitation (send → accept, with all rejection cases)
- The budget saga (transaction → spending total → threshold alert → email)
- Stripe webhooks (idempotency, past_due lifecycle)

Do not chase 80% coverage. A passing test on the saga is worth more than 50 unit tests on getters.

**Test-after** — write the feature, then write the test. TDD would slow down learning Flutter and NestJS simultaneously. Exception: complex business logic (threshold deduplication, idempotency helper) — write those test-first since the logic is the hard part.

---

### Backend (NestJS)

**Unit tests** — pure business logic, no I/O:

- Budget threshold calculation (`checkThreshold()` with varying spend amounts)
- Invitation token validation (expiry, usedAt, email mismatch)
- `withIdempotency()` helper (duplicate eventId → no-op)
- `resolvedPlan()` (active/past_due/cancelled → correct plan)
- `getPriceId()` (plan + currency → correct Stripe price ID)

**Integration tests** — real PostgreSQL + real RabbitMQ, no mocks:

- Run against a `docker-compose.test.yml` profile (separate DBs from dev)
- `libs/testing` provides: `resetDatabase()`, `publishEvent()`, `waitForEvent()`
- One test file per service covering the full happy path + key edge cases
- Key tests to write per service:
  - auth-service: register → login → refresh → logout
  - household-service: create → invite → accept (email match, mismatch, expired)
  - transaction-service: CRUD + bulk delete + summary totals
  - budget-service: transaction events → spending totals → threshold alerts (deduplication)
  - billing-service: Stripe webhook idempotency (same event.id twice → processed once)

**Saga integration test** (most important — proves the distributed architecture works):

```
POST /transactions (amount puts household at 85% of budget)
  → assert transaction.created published
  → assert budget-service spending total updated
  → assert budget.threshold.warning published
  → assert notification-service receives event
```

No mocked databases — ever. The only accepted mock is the Stripe API client in billing-service tests.

---

### Frontend (React MFEs)

**Unit tests** — Vitest + React Testing Library:

- Component rendering with mocked TanStack Query state
- Form validation logic (React Hook Form + Zod schemas)
- `getCategoryName()` with keyed vs user-created categories
- `formatDate()` / `formatCurrency()` with all 3 locales

**Integration tests** — Vitest + MSW (Mock Service Worker):

- Full user flows within a single MFE (fill form → submit → see result)
- MSW intercepts HTTP — no real backend needed, but tests the full component tree
- Key flows: add transaction, accept invitation, toggle budget, switch language

**No Playwright e2e** — backend integration tests cover the real risk. MFE tests focus on UI behaviour, not the full stack.

---

### Mobile (Flutter)

**Widget tests** — `flutter_test`:

- Each screen renders correctly in light + dark mode
- Quick-add bottom sheet: fill fields → tap Save → optimistic entry appears
- Optimistic rollback: mock API failure → entry removed → SnackBar shown
- Budget progress tiles: ok / warning / exceeded colour states

**Unit tests** — `flutter_test` + `mockito`:

- `getCategoryName()` Dart helper — keyed vs null key
- `formatDate()` / `formatCurrency()` with all 3 locales
- `AuthInterceptor` mutex logic — concurrent 401s → single refresh

**No full e2e on mobile** — manual walkthrough on device covers the integration risk (documented as a Phase 9 milestone checklist).
