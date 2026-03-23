# Deployment — Coolify on VPS

All services (backend + frontend) are deployed to a single VPS running Coolify.
Coolify manages the containers via Docker Compose and handles SSL + reverse proxy via Traefik.

---

## Domain Layout

```
familieoya.furevikstrand.cloud              → landing page (Astro static)
app.familieoya.furevikstrand.cloud          → shell (MFE host app)
api.familieoya.furevikstrand.cloud          → api-gateway (NestJS)
remotes.familieoya.furevikstrand.cloud      → nginx serving all MFE static builds
```

---

## Deployment Strategy

### Option A — Single Docker Compose stack (recommended)

One `docker-compose.yml` that Coolify manages as a single stack.
All services, databases, RabbitMQ, and nginx in one place.
Simpler to manage, all on one VPS.

### Option B — Separate Coolify apps per service

More granular — each service has its own Coolify app and deploy trigger.
More overhead for a portfolio project.

**We go with Option A.**

---

## Docker Compose Overview

```
Services:
  # Backend
  api-gateway            (NestJS, port 3000)
  auth-service           (NestJS, port 3001)
  household-service      (NestJS, port 3002)
  transaction-service    (NestJS, port 3003)
  budget-service         (NestJS, port 3004)
  notification-service   (NestJS, port 3005)
  report-service         (NestJS, port 3006)
  audit-service          (NestJS, port 3007)
  billing-service        (NestJS, port 3008)
  ai-service             (NestJS, port 3009)

  # Databases (one per backend service)
  postgres-auth          (PostgreSQL)
  postgres-household     (PostgreSQL)
  postgres-transaction   (PostgreSQL)
  postgres-budget        (PostgreSQL)
  postgres-notification  (PostgreSQL)
  postgres-report        (PostgreSQL)
  postgres-audit         (PostgreSQL)
  postgres-billing       (PostgreSQL)

  # Message broker
  rabbitmq               (RabbitMQ + management UI)

  # Frontend
  frontend               (nginx, serves shell + all MFE static builds)
```

---

## Frontend Build Strategy (MFEs + Coolify)

Module Federation requires MFEs to know each other's **public URLs at build time**.
Since we know our domain (`familieoya.furevikstrand.cloud`), we set these as build-time env vars.

### Environment variables (set in Coolify)

```env
# Used by shell's vite.config.ts to locate remote MFEs
VITE_REMOTE_AUTH_URL=https://remotes.familieoya.furevikstrand.cloud/auth
VITE_REMOTE_HOUSEHOLD_URL=https://remotes.familieoya.furevikstrand.cloud/household
VITE_REMOTE_TRANSACTION_URL=https://remotes.familieoya.furevikstrand.cloud/transaction
VITE_REMOTE_BUDGET_URL=https://remotes.familieoya.furevikstrand.cloud/budget
VITE_REMOTE_REPORTS_URL=https://remotes.familieoya.furevikstrand.cloud/reports
VITE_REMOTE_SETTINGS_URL=https://remotes.familieoya.furevikstrand.cloud/settings

# Used by all MFEs to call the backend
VITE_API_URL=https://api.familieoya.furevikstrand.cloud
```

### Build process

Each MFE is built separately (`vite build`) and outputs static files.
A single `nginx` container serves all of them from different paths:

```nginx
# nginx.conf
server {
  listen 80;

  # Shell (host app)
  location / {
    root /usr/share/nginx/html/shell;
    try_files $uri /index.html;
  }

  # MFE remotes (Module Federation assets)
  location /remotes/auth/ {
    root /usr/share/nginx/html;
    add_header Access-Control-Allow-Origin *;
  }

  location /remotes/household/ {
    root /usr/share/nginx/html;
    add_header Access-Control-Allow-Origin *;
  }

  location /remotes/transaction/ {
    root /usr/share/nginx/html;
    add_header Access-Control-Allow-Origin *;
  }

  location /remotes/budget/ {
    root /usr/share/nginx/html;
    add_header Access-Control-Allow-Origin *;
  }

  location /remotes/reports/ {
    root /usr/share/nginx/html;
    add_header Access-Control-Allow-Origin *;
  }

  location /remotes/settings/ {
    root /usr/share/nginx/html;
    add_header Access-Control-Allow-Origin *;
  }
}
```

> The `Access-Control-Allow-Origin *` header is required — the shell fetches `remoteEntry.js`
> from a different path, which counts as a cross-origin request even on the same domain.

### Multi-stage Dockerfile (frontend)

```dockerfile
# Build all MFEs
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci

RUN npx nx build mfe-auth --configuration=production
RUN npx nx build mfe-household --configuration=production
RUN npx nx build mfe-transaction --configuration=production
RUN npx nx build mfe-budget --configuration=production
RUN npx nx build mfe-reports --configuration=production
RUN npx nx build mfe-settings --configuration=production
RUN npx nx build shell --configuration=production

# Serve with nginx
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/apps/shell        /usr/share/nginx/html/shell
COPY --from=builder /app/dist/apps/mfe-auth     /usr/share/nginx/html/remotes/auth
COPY --from=builder /app/dist/apps/mfe-household /usr/share/nginx/html/remotes/household
COPY --from=builder /app/dist/apps/mfe-transaction /usr/share/nginx/html/remotes/transaction
COPY --from=builder /app/dist/apps/mfe-budget   /usr/share/nginx/html/remotes/budget
COPY --from=builder /app/dist/apps/mfe-reports   /usr/share/nginx/html/remotes/reports
COPY --from=builder /app/dist/apps/mfe-settings  /usr/share/nginx/html/remotes/settings
```

---

## Coolify Configuration

### Traefik labels (in docker-compose.yml)

```yaml
services:
  api-gateway:
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.api.rule=Host(`api.familieoya.furevikstrand.cloud`)'
      - 'traefik.http.routers.api.tls.certresolver=letsencrypt'
      - 'traefik.http.services.api.loadbalancer.server.port=3000'

  frontend:
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.frontend.rule=Host(`app.familieoya.furevikstrand.cloud`) || Host(`remotes.familieoya.furevikstrand.cloud`)'
      - 'traefik.http.routers.frontend.tls.certresolver=letsencrypt'
      - 'traefik.http.services.frontend.loadbalancer.server.port=80'
```

> **WebSocket:** Traefik proxies WebSocket connections automatically — no extra labels needed. The `wss://` upgrade is handled transparently as long as the backend service accepts WebSocket connections on the same port as HTTP.

Coolify provides the Traefik network automatically — services just need to be added to it.

### Internal service communication

Backend services talk to each other via Docker's internal network (no Traefik needed):

```yaml
# auth-service connects to its DB
AUTH_DATABASE_URL=postgres://user:pass@postgres-auth:5432/auth_db

# budget-service connects to RabbitMQ
RABBITMQ_URL=amqp://user:pass@rabbitmq:5672
```

Service names become hostnames within the Docker Compose network.

---

## Environment Variables per Service

### api-gateway

```env
JWT_PUBLIC_KEY=<RS256 public key>
AUTH_SERVICE_URL=http://auth-service:3001
HOUSEHOLD_SERVICE_URL=http://household-service:3002
TRANSACTION_SERVICE_URL=http://transaction-service:3003
BUDGET_SERVICE_URL=http://budget-service:3004
NOTIFICATION_SERVICE_URL=http://notification-service:3005
REPORT_SERVICE_URL=http://report-service:3006
AUDIT_SERVICE_URL=http://audit-service:3007
BILLING_SERVICE_URL=http://billing-service:3008
AI_SERVICE_URL=http://ai-service:3009
```

### auth-service

```env
DATABASE_URL=postgres://user:pass@postgres-auth:5432/auth_db
JWT_PRIVATE_KEY=<RS256 private key>
JWT_PUBLIC_KEY=<RS256 public key>
RABBITMQ_URL=amqp://user:pass@rabbitmq:5672
```

### household-service / transaction-service / budget-service / notification-service

```env
DATABASE_URL=postgres://user:pass@postgres-<name>:5432/<name>_db
RABBITMQ_URL=amqp://user:pass@rabbitmq:5672
```

### notification-service (extra)

```env
RESEND_API_KEY=<key>
FROM_EMAIL=noreply@familieoya.furevikstrand.cloud
APP_URL=https://app.familieoya.furevikstrand.cloud
```

---

## Deployment Flow

```
git push to main
    │
    ▼
Coolify detects change (webhook)
    │
    ▼
Docker build (multi-stage)
    │
    ├── backend services built individually
    └── frontend: all MFEs built → packed into nginx image
    │
    ▼
Coolify runs docker-compose up --build
    │
    ▼
Traefik routes traffic
    │
    ├── api.familieoya.furevikstrand.cloud     → api-gateway
    ├── app.familieoya.furevikstrand.cloud     → nginx (shell)
    └── remotes.familieoya.furevikstrand.cloud → nginx (MFE remotes)
```

---

## Test Infrastructure (`docker-compose.test.yml`)

Used by integration tests locally and in CI. Spins up only the infrastructure — no backend services, no frontend. Tests run on the host machine and connect to these containers.

Differences from `docker-compose.yml`:
- DB names use `_test` suffix to avoid colliding with dev data
- No backend service containers (auth-service, etc.) — tests run those directly
- No frontend container
- Same ports as dev (fine in CI; if running dev + tests simultaneously locally, change ports)

```yaml
services:
  postgres-auth-test:
    image: postgres:16
    environment:
      POSTGRES_DB: auth_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - '5433:5432'

  postgres-household-test:
    image: postgres:16
    environment:
      POSTGRES_DB: household_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - '5434:5432'

  # ... repeat for transaction, budget, notification, report, audit, billing

  rabbitmq-test:
    image: rabbitmq:3-management
    ports:
      - '5673:5672'
      - '15673:15672'
    healthcheck:
      test: rabbitmq-diagnostics ping
      interval: 10s
      timeout: 5s
      retries: 5
```

Tests read from `.env.test` which points at these containers:
```env
AUTH_DATABASE_URL=postgres://test:test@localhost:5433/auth_test
RABBITMQ_URL=amqp://localhost:5673
```

---

## RabbitMQ Management UI

Accessible internally — **do not expose publicly**.
Accessible via SSH tunnel for debugging:

```bash
ssh -L 15672:localhost:15672 user@your-vps
# then open http://localhost:15672
```

Or add a Coolify-only Traefik rule restricted to your IP.

---

## Database Backups

Coolify has built-in scheduled backup support for databases.
Configure per-service PostgreSQL backups in Coolify UI → point to S3-compatible storage.
