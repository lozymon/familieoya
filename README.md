# Familieøya

A family budget app built as a portfolio project demonstrating production-grade architecture:
NestJS microservices backend, React 19 microfrontend (Module Federation), and a Flutter mobile app.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        api-gateway :3000                        │
│   JWT validation · X-Household-ID check · rate limiting · proxy │
└───────────┬──────────────────────────────┬──────────────────────┘
            │                              │
     ┌──────▼──────┐               ┌───────▼────────┐
     │ auth-service│               │household-service│  ← Phase 2
     │    :3001    │               │     :3002       │
     └──────┬──────┘               └────────────────┘
            │ RabbitMQ (topic exchange: familieoya)
     ┌──────▼──────────────────────────────────────┐
     │  notification · budget · transaction · audit │  ← later phases
     └─────────────────────────────────────────────┘
```

**Key architecture rules:**
- No `householdId` in JWT — client sends `X-Household-ID` header, gateway validates membership
- Services never query each other's databases — RabbitMQ for async, HTTP for sync reads
- All amounts are integers (øre/cents) — never store floats
- All events extend `BaseEvent` with `eventId: crypto.randomUUID()` set by the publisher
- `noAck: false` on all RabbitMQ consumers — manual ack only

See [`docs/services.md`](docs/services.md) for full service contracts and [`docs/edge-cases.md`](docs/edge-cases.md) for implementation patterns.

---

## Monorepo structure

```
apps/
  api-gateway/        ← public entry point, JWT + proxy
  auth-service/       ← register, login, JWT issuance (RS256)
libs/
  contracts/          ← shared event interfaces + DTOs
  common/             ← JWT guard, HouseholdGuard, InternalApiGuard, decorators
  testing/            ← resetDatabase(), createTestRabbitMQClient()
docs/                 ← architecture docs (read before coding)
```

---

## Running locally

### 1. Generate RS256 key pair

```bash
openssl genrsa -out auth_private.pem 2048
openssl rsa -in auth_private.pem -pubout -out auth_public.pem
```

### 2. Create `.env`

```bash
cp .env.example .env
```

Paste the key contents into `.env`, replacing newlines with `\n`:

```bash
JWT_PRIVATE_KEY="$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' auth_private.pem)"
JWT_PUBLIC_KEY="$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' auth_public.pem)"
INTERNAL_SECRET="$(openssl rand -hex 32)"
```

### 3. Start all services

```bash
docker-compose up
```

**Milestone:** `POST /auth/register` → `POST /auth/login` → JWT ✓

### Run a single service (hot reload)

```bash
npx nx serve auth-service
npx nx serve api-gateway
```

### Debug in VSCode

Use the **Run and Debug** panel — launch configs for both services are in [.vscode/launch.json](.vscode/launch.json).

---

## Running tests

```bash
# Unit tests (all affected)
npx nx affected --target=test

# All unit tests
npx nx run-many --target=test

# Integration tests (requires test infra)
docker compose -f docker-compose.test.yml up -d --wait
npm run test:integration
docker compose -f docker-compose.test.yml down -v
```

Integration tests hit a real PostgreSQL (`localhost:5433`) and real RabbitMQ (`localhost:5673`) — no mocks.

---

## Build

```bash
# Single service
npx nx build auth-service --configuration=production

# All services
npx nx run-many --target=build --configuration=production
```

---

## Docs

| File | Contents |
|---|---|
| [`docs/services.md`](docs/services.md) | Service contracts, DB tables, all endpoints + events |
| [`docs/edge-cases.md`](docs/edge-cases.md) | Known gotchas + implementation patterns |
| [`docs/roadmap.md`](docs/roadmap.md) | Phased build plan |
| [`docs/frontend.md`](docs/frontend.md) | MFE architecture + shared libs |
| [`docs/billing.md`](docs/billing.md) | Stripe setup, plan tiers, webhook handling |
| [`docs/deployment.md`](docs/deployment.md) | Coolify + Docker Compose + Traefik |
| [`docs/ai-features.md`](docs/ai-features.md) | Claude API usage, cost model, rate limits |
