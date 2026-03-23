# familieoya

Family budget app — NestJS microservices backend + React 19 microfrontend + Flutter mobile.
Portfolio project. Full architecture in `docs/`.

## Monorepo structure

```
apps/          ← NestJS services (api-gateway, auth-service, household-service, ...)
libs/
  contracts/   ← shared event interfaces (all events extend BaseEvent with eventId)
  common/      ← shared JWT guard, X-Household-ID guard, InternalApiGuard
  ui/          ← shared React components (Module Federation singleton)
  api-client/  ← typed API client used by all MFEs
  i18n/        ← translations + formatDate/formatCurrency helpers
```

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

```bash
docker-compose up                                  # starts all services + postgres + rabbitmq
npx nx serve api-gateway                           # run a single backend service
npx nx serve shell                                 # run the frontend shell
npx nx run-many --target=serve                     # run everything
npx nx run-many --target=test                      # run all tests
npx nx affected --target=test                      # only test what changed
npx nx build mfe-auth --configuration=production   # production build of one MFE
npm run test:e2e                                   # integration tests (hits real DB + real RabbitMQ, no mocks)
```

## Key reference docs

- `docs/services.md` — service contracts, DB tables, all endpoints + events
- `docs/edge-cases.md` — known gotchas + implementation patterns (read this before implementing any service)
- `docs/roadmap.md` — phased build plan
- `docs/frontend.md` — MFE architecture + libs/ui, libs/i18n, libs/api-client
- `docs/billing.md` — Stripe setup, plan tiers, webhook handling
- `docs/deployment.md` — Coolify + Docker Compose + Traefik
- `docs/ai-features.md` — Claude API usage, cost model, rate limits
