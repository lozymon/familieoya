# Learning Claude Code — via This Project

This project is intentionally used as a hands-on environment for mastering Claude Code.
Each phase introduces new Claude Code patterns — by the end you'll have used most of its core features in a real codebase.

---

## Before You Start — Context Management

The single most important habit when using Claude Code on a large project:

```bash
npx cc-status-line@latest
```

This adds a status bar showing **context %**, session cost, model, and git branch. Configure line 1 as: `model | context% | cost | clock` and line 2 as: `git branch | worktree`.

**Rule:** Don't let context go past ~50% in a single session. Once you hit that, start a new session — Claude's output quality degrades well before 100%. Never use `/compact` as a workaround; it gives you the worst of both worlds (lost context + poisoned summary).

For long tasks, prefer asking Claude to spawn subagents (the Agent tool) so each unit of work runs in its own clean context window and reports back a summary.

---

## Key Practices Per Phase

### Phase 1–2 (Scaffold + Auth)

**Goal: Learn the basics — file generation, CLAUDE.md, and /plan**

- Write a `CLAUDE.md` in the repo root and in each service folder
  - Root: project overview, monorepo structure, naming conventions
  - Per service (e.g. `apps/auth-service/CLAUDE.md`): what this service owns, its DB tables, which events it publishes
  - Claude reads these automatically — good CLAUDE.md = better suggestions with less prompting
- Use `/plan` before starting each new service to align on approach before writing code
- Let Claude scaffold the NestJS boilerplate (modules, controllers, services, DTOs) — this is tedious to write by hand and Claude does it well
- Practice: describe what you want in plain language, review the output, push back when it's wrong

### Phase 3–4 (Transactions + Saga)

**Goal: Learn hooks and automated workflows**

- Set up a **pre-commit hook** that runs `npm run lint` + `npm run test` before every commit
  - Configure via Claude Code settings (`/update-config`)
  - Ask Claude to fix lint/test failures before they reach git
- Set up a **post-edit hook** that auto-formats changed files with Prettier
- Use Claude to write the RabbitMQ event handlers — describe the event shape, let Claude generate the `@EventPattern` handlers and update `libs/contracts`
- Practice writing integration tests by describing the scenario to Claude: _"Write an integration test that creates a transaction, then asserts the budget-service receives the event and updates its spending total"_

### Phase 5 (Notifications)

**Goal: Learn multi-file edits and refactoring**

- Ask Claude to wire a new event consumer end-to-end across multiple files at once
- Practice: _"Add a handler in notification-service that listens to `budget.threshold.exceeded` and sends an email via Resend — update the module, add the Resend service, and write a unit test"_
- Notice how Claude tracks changes across files — review each diff carefully

### Phase 6–8 (Frontend MFEs)

**Goal: Learn context management and slash commands**

- Each MFE gets its own `CLAUDE.md` describing which routes it owns and which API endpoints it calls
- When context gets long, start a new session rather than using `/compact` — a fresh context window gives better output than a compacted one
- Create a custom slash command for repetitive tasks:
  - Example: `/new-mfe-page` → scaffolds a new page component with TanStack Query hook, loading state, error boundary, and i18n keys
- Ask Claude to generate the `libs/api-client` functions directly from the `services.md` endpoint table
- Practice: give Claude a screenshot or description of a UI and ask it to implement the component

### Phase 9 (Flutter)

**Goal: Learn how to use Claude Code in an unfamiliar language**

- This is where Claude Code shines most — you're learning Dart/Flutter, Claude knows it well
- Start each screen by asking Claude to explain the pattern before generating code:
  _"Before writing the login screen, explain how Riverpod AsyncNotifierProvider works for auth state"_
- Use Claude to translate your TypeScript mental model to Dart:
  _"In TypeScript I'd use a Zod schema + React Hook Form for this — what's the Dart/Flutter equivalent?"_
- Ask Claude to review your Flutter code for idiomatic patterns — Dart has conventions (widget composition, `const` constructors, etc.) that differ from JS

---

## CLAUDE.md Template (root — `CLAUDE.md` in repo root)

```markdown
# familieoya

Family budget app — NestJS microservices backend + React 19 microfrontend + Flutter mobile.
Portfolio project. Full architecture in `todo-projects/familieøya/`.

## Monorepo structure

apps/ ← NestJS services (api-gateway, auth-service, household-service, ...)
libs/
contracts/ ← shared event interfaces (all events extend BaseEvent with eventId)
common/ ← shared JWT guard, X-Household-ID guard, InternalApiGuard
ui/ ← shared React components (Module Federation singleton)
api-client/ ← typed API client used by all MFEs
i18n/ ← translations + formatDate/formatCurrency helpers

## Architecture rules — read before writing any code

1. **No householdId in JWT.** Client sends `X-Household-ID: <uuid>` header. Gateway validates membership on every request. Never put householdId in a JWT claim.
2. **plan claim is UI-only.** Server always queries billing-service for plan enforcement. Never gate server-side logic on the JWT plan claim.
3. **Service isolation.** Services never query each other's databases directly. Use events (RabbitMQ) for async, HTTP to internal endpoints for sync reads.
4. **All events extend BaseEvent.** Publishers set `eventId: crypto.randomUUID()`. Consumers use `withIdempotency(eventId, fn)` in budget-service and report-service.
5. **noAck: false on all RabbitMQ consumers.** Manual ack only — never let NestJS auto-ack.
6. **Amounts are integers** (øre / centavos / cents). Divide by 100 for display. Never store floats.
7. **Internal endpoints require `x-internal-secret` header.** Use `InternalApiGuard` from libs/common.
8. **Dates are ISO 8601 strings.** Never store as locale-formatted strings.
9. **Category keys, not names.** Seeded categories have a `key` field (`food`, `electricity`, ...). Use `getCategoryName(category, t)` from libs/i18n — never render the stored `name` directly for seeded categories.

## Running locally

docker-compose up                                  ← starts all services + postgres + rabbitmq
npx nx serve api-gateway                           ← run a single backend service
npx nx serve shell                                 ← run the frontend shell
npx nx run-many --target=serve                     ← run everything
npx nx run-many --target=test                      ← run all tests
npx nx affected --target=test                      ← only test what changed
npx nx build mfe-auth --configuration=production   ← production build of one MFE
npm run test:e2e                                   ← integration tests (hits real DB + real RabbitMQ, no mocks)

## Key reference docs (live in `docs/` — copy from planning before first commit)

- `docs/services.md` — service contracts, DB tables, all endpoints + events
- `docs/edge-cases.md` — known gotchas + implementation patterns (read this before implementing any service)
- `docs/roadmap.md` — phased build plan
- `docs/frontend.md` — MFE architecture + libs/ui, libs/i18n, libs/api-client
- `docs/billing.md` — Stripe setup, plan tiers, webhook handling
- `docs/deployment.md` — Coolify + Docker Compose + Traefik
- `docs/ai-features.md` — Claude API usage, cost model, rate limits
```

---

## CLAUDE.md Template (per service)

Create one of these in each `apps/<service>/` folder:

```markdown
# <service-name>

## What this service owns

- Database tables: <list>
- Domain: <one sentence>

## Events published

- `event.name` — `{ eventId, ... }` — when X happens

## Events consumed

- `event.name` — does Y in response (idempotency via `processed_event_ids`? yes/no)

## Key files

- `src/<name>.module.ts` — module definition
- `src/<name>.service.ts` — business logic
- `src/<name>.controller.ts` — HTTP handlers (if any)

## Coding rules for this service

- Amounts stored as integers (øre/centavos/cents), never floats
- All entity IDs are UUIDs (uuid v4)
- Dates are ISO 8601 strings
- RabbitMQ consumers use `noAck: false` — always call `channel.ack(message)` explicitly
- Do NOT query other services' databases directly — use events or internal HTTP
- Internal endpoints (`/internal/*`) must use `InternalApiGuard`

## Running tests

npx nx test <service-name>                                                     ← unit tests for this service
npx nx test <service-name> --testFile=src/budget.integration.spec.ts           ← single test file
npm run test:integration                                                        ← hits real PostgreSQL + RabbitMQ (no mocks)

## Test conventions

- Behaviour-driven naming: `describe('when X happens', () => { it('does Y') })`
- AAA structure: Arrange → Act → Assert, no logic between sections
- No mocked databases or RabbitMQ — use real infrastructure via docker-compose.test.yml
- Integration tests are more valuable than unit tests — prioritise them
```

---

## MCP Servers

Five MCP servers add real value at different phases of this project:

| Server                      | Phase                   | What it enables                                                                                                   |
| --------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **GitHub MCP**              | Phase 0 — always on     | Check CI status, create issues, review PRs without leaving Claude Code                                            |
| **PostgreSQL MCP**          | Phase 1 — always on     | Query any of the 8 service databases directly — debug event consumers, check migration state, verify data         |
| **Context7 MCP**            | Phase 0 — always on     | Pull up-to-date library docs (NestJS, Riverpod, TypeORM, etc.) directly into context — avoids hallucinated APIs   |
| **Sequential Thinking MCP** | Phase 0 — always on     | Structured multi-step reasoning for complex cross-service problems (saga design, GDPR cascade, idempotency logic) |
| **Stripe MCP**              | Phase 10 — billing only | Inspect products, prices, webhook logs, trigger test events from Claude Code                                      |

### Setup

Add to your Claude Code MCP settings (`claude mcp add`):

```bash
# GitHub — set up once when repo is created
claude mcp add github -- npx -y @modelcontextprotocol/server-github

# PostgreSQL — one per service DB, or point at the shared test DB
claude mcp add postgres -- npx -y @modelcontextprotocol/server-postgres postgresql://localhost/auth_db

# Context7 — always on, resolves library docs by version
claude mcp add context7 -- npx -y @upstash/context7-mcp

# Sequential Thinking — always on, structured reasoning for complex problems
claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking

# Stripe — add when starting Phase 10
claude mcp add stripe -- npx -y @stripe/mcp --tools=all --api-key=sk_test_...
```

### How to use during development

**PostgreSQL MCP** is the most useful day-to-day. When a consumer isn't behaving, ask:

> "Query the budget_service DB and show me the budget_alert_state rows for householdId X"

**GitHub MCP** is useful for tracking work:

> "Create a GitHub issue for the `processed_event_ids` retention cron — label it `backend` and assign to Phase 4"

**Context7 MCP** when starting a new library or hitting an unfamiliar API:

> "use context7 — show me the NestJS @nestjs/microservices RabbitMQ transport options for NestJS 10"
> "use context7 — Riverpod 2 AsyncNotifierProvider — how do I invalidate and refetch?"

**Sequential Thinking MCP** for cross-service design problems:

> "use sequential thinking — walk through the full `household.deleted` cascade: which services need to react, in what order, and what can fail silently vs must succeed"
> "use sequential thinking — design the idempotency strategy for budget-service consuming transaction events"

**Stripe MCP** during Phase 10:

> "List all Stripe products and their prices so I can verify the NOK/BRL/USD price IDs match the env vars"

---

## Useful Claude Code Patterns for This Project

### Scaffold a new NestJS service

```
Scaffold a NestJS service called budget-service. It should:
- Have a BudgetModule, BudgetService, BudgetController
- Connect to PostgreSQL via TypeORM with a Budget entity (id, householdId, categoryId, limitAmount, month, createdAt)
- Listen to RabbitMQ via @nestjs/microservices
- Follow the same structure as auth-service
```

### Add a new event contract

```
Add a new event contract to libs/contracts for `budget.threshold.exceeded`.
Payload: { householdId, categoryId, percentage, limitAmount, spentAmount }.
Export the interface and the event name constant.
```

### Write an integration test

```
Write an integration test for budget-service that:
1. Creates a budget (limitAmount: 10000, categoryId: X)
2. Publishes a transaction.created event (amount: 8500, categoryId: X)
3. Asserts that budget-service updates spentAmount to 8500
4. Asserts that budget.threshold.warning event is published
Use a real PostgreSQL test database and real RabbitMQ (no mocks).
```

### Generate i18n keys

```
Look at all the UI strings in mfe-transaction and generate the i18n keys for en.json, no.json, and pt.json.
Follow the existing key naming convention in libs/i18n.
```

---

## What Claude Code Is NOT Good At (on this project)

- **Architectural decisions** — use `/plan` and think it through yourself first. Claude will generate whatever you ask; it won't tell you your architecture is wrong unless you ask.
- **RabbitMQ topology decisions** — topic vs direct exchange, queue names, dead-letter queues. Understand these yourself before asking Claude to implement them.
- **Flutter widget tree structure** — for complex screens, sketch the widget hierarchy yourself first, then ask Claude to implement it.
- **Security decisions** — don't ask Claude to "make this secure", ask specific questions: _"Is storing the refresh token in flutter_secure_storage sufficient here, or do I need additional protection?"_
