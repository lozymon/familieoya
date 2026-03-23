# Service Contracts

Detailed breakdown of each service — API endpoints, database ownership, and events published/consumed.

---

## api-gateway

**Responsibility:** Single public-facing entry point. Validates JWTs, forwards requests to the correct service via HTTP or RabbitMQ RPC. No business logic.

**Key responsibilities:**

- Attach `userId` and `householdId` to forwarded requests (from JWT claims)
- Rate limiting via `@nestjs/throttler` — default: 100 requests / 60 seconds per IP. Applied globally; tighter limits on auth endpoints (`POST /auth/login`, `POST /auth/register`: 10 / 60s) to prevent brute force.
- Request logging

**Does NOT have its own database.**

**WebSocket Gateway:**

The api-gateway hosts the WebSocket gateway for real-time notifications. It runs alongside the HTTP server on the same port (NestJS supports both on one process).

- Client connects to `wss://api.familieoya.furevikstrand.cloud/notifications` with a valid JWT as a query param (`?token=<jwt>`)
- Gateway validates the JWT on handshake — unauthenticated connections are rejected immediately
- On successful connect: socket is stored in an in-memory map keyed by `userId`
- The gateway consumes `notification.created` events from RabbitMQ and emits them to the correct connected socket

```typescript
// apps/api-gateway/src/notifications/notification.gateway.ts
@WebSocketGateway({ namespace: '/notifications', cors: { origin: 'https://app.familieoya.furevikstrand.cloud' } })
export class NotificationGateway {
  private readonly clients = new Map<string, Socket>() // userId → socket

  handleConnection(client: Socket) {
    const token = client.handshake.query.token as string
    const payload = this.jwtService.verify(token) // rejects if invalid
    client.data.userId = payload.sub
    this.clients.set(payload.sub, client)
  }

  handleDisconnect(client: Socket) {
    this.clients.delete(client.data.userId)
  }

  @EventPattern(NOTIFICATION_CREATED)
  pushToClient(event: NotificationCreatedEvent) {
    const socket = this.clients.get(event.userId)
    socket?.emit('notification', event.notification)
  }
}
```

---

## auth-service

**Database tables:** `users`, `refresh_tokens`, `two_factor_secrets`, `recovery_codes`, `device_tokens` (Phase 9 — FCM)

### REST Endpoints (internal, called by gateway)

| Method | Path                                               | Description                                                                                                                      |
| ------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/register`                                   | Create user account                                                                                                              |
| POST   | `/auth/login`                                      | Returns JWT access + refresh token                                                                                               |
| POST   | `/auth/refresh`                                    | Refresh access token — issues a new access token **and a new refresh token**, invalidates the old refresh token (rotation)       |
| POST   | `/auth/logout`                                     | Invalidate refresh token                                                                                                         |
| POST   | `/auth/2fa/enable`                                 | Generate TOTP secret + QR code + 8 recovery codes (plain, shown once)                                                            |
| POST   | `/auth/2fa/verify`                                 | Confirm TOTP code to activate 2FA                                                                                                |
| POST   | `/auth/login/recover`                              | Login with recovery code instead of TOTP — marks code used, sends email alert                                                    |
| POST   | `/auth/2fa/regenerate`                             | Generate 8 new recovery codes, invalidate old ones (requires current TOTP)                                                       |
| GET    | `/auth/2fa/recovery-status`                        | Returns `{ remaining, total }` for settings page                                                                                 |
| GET    | `/auth/me`                                         | Get current user profile                                                                                                         |
| PATCH  | `/auth/me`                                         | Update name, email, password, preferredLanguage                                                                                  |
| DELETE | `/auth/me`                                         | Delete account (GDPR)                                                                                                            |
| GET    | `/auth/me/data-export`                             | Download full JSON export of user data (GDPR)                                                                                    |
| GET    | `/internal/users/:userId/notification-preferences` | Internal — returns `{ budgetAlerts, householdUpdates, preferredLanguage }` — called by notification-service before sending email |
| GET    | `/internal/users/:userId/device-tokens`            | (Phase 9) Internal — FCM tokens for this user                                                                                    |
| DELETE | `/internal/device-tokens/:token`                   | (Phase 9) Internal — remove expired/invalid FCM token                                                                            |
| GET    | `/auth/me/notification-preferences`                | Get email notification preferences                                                                                               |
| PATCH  | `/auth/me/notification-preferences`                | Update preferences (`budgetAlerts`, `householdUpdates`)                                                                          |
| POST   | `/auth/device-tokens`                              | (Phase 9) Register/upsert FCM device token — upserts by `(userId, platform)`                                                     |

### Events Published

| Event                | Payload                                      | When                   |
| -------------------- | -------------------------------------------- | ---------------------- |
| `user.registered`    | `{ userId, email, name, preferredLanguage }` | After registration     |
| `user.deleted`       | `{ userId }`                                 | After account deletion |
| `user.data.exported` | `{ userId }`                                 | After GDPR data export |

### JWT Claims

```json
{
  "sub": "uuid",
  "email": "user@example.com",
  "plan": "free | pro | family"
}
```

> **Refresh token rotation:** every call to `POST /auth/refresh` issues a new refresh token and immediately invalidates the previous one. The `refresh_tokens` table stores a hash of the current valid token per user. If a stolen token is used after the legitimate user has already refreshed, it will be rejected — and the legitimate session is not silently broken.

> `householdId` is **not** in the JWT. The client sends `X-Household-ID: <uuid>` as a request header. The gateway validates membership on every request. This allows instant household switching without re-issuing tokens.

> `plan` is in the JWT for **client-side UI only** (lock icons, upgrade CTAs). Server-side enforcement always queries billing-service — never trusts the JWT plan claim.

---

## household-service

**Database tables:** `households`, `household_members`, `invitations`

**Household currency:** Each household stores a `currency` field (ISO 4217 code: `NOK`, `BRL`, `USD`, etc.) set at creation time. **Immutable — cannot be changed after creation.** `UpdateHouseholdDto` does not include `currency`; `ValidationPipe` with `whitelist: true` strips it if sent. All transactions in that household use that currency. The frontend reads it from the household object and passes it to `Intl.NumberFormat` — no conversion ever happens.

**`invitations` table schema:**

```
id          uuid
householdId uuid
email       string        ← invitation is tied to this specific email
token       string        ← 32-byte cryptographically random hex (crypto.randomBytes(32))
expiresAt   timestamp     ← createdAt + 7 days
usedAt      timestamp?    ← null until accepted; set on acceptance (one-time use)
createdBy   uuid          ← userId of the admin who sent it
```

### REST Endpoints

| Method | Path                                   | Description                                                                                                                                                                                   |
| ------ | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/households`                          | Create household                                                                                                                                                                              |
| GET    | `/households/:id`                      | Get household details + members                                                                                                                                                               |
| PATCH  | `/households/:id`                      | Update name                                                                                                                                                                                   |
| DELETE | `/households/:id`                      | Delete household                                                                                                                                                                              |
| GET    | `/households/:id/members`              | List members                                                                                                                                                                                  |
| POST   | `/households/:id/invitations`          | Send invitation by email                                                                                                                                                                      |
| GET    | `/invitations/:token`                  | Validate token — returns invitation details (email, householdName, expiry)                                                                                                                    |
| POST   | `/invitations/:token/accept`           | Accept invitation — validates email match, checks expiry + usedAt, joins household, invalidates token. Returns `{ householdId, householdName }` so client can update active household context |
| DELETE | `/households/:id/members/:userId`      | Remove member                                                                                                                                                                                 |
| PATCH  | `/households/:id/members/:userId/role` | Update member role (admin/member)                                                                                                                                                             |
| GET    | `/internal/users/:userId/export`       | GDPR — memberships + invitations sent by this user (internal only)                                                                                                                            |
| GET    | `/internal/households/active` | Internal — returns all households with their member user IDs (used by notification-service weekly digest) |

### Events Published

| Event                       | Payload                                      | When                                                               |
| --------------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| `household.created`         | `{ householdId, createdBy }`                 | Household created — triggers trial in billing-service              |
| `household.invitation.sent` | `{ householdId, email, token, inviterName }` | Invitation created                                                 |
| `household.member.joined`   | `{ householdId, userId }`                    | Invitation accepted                                                |
| `household.member.removed`  | `{ householdId, userId }`                    | Member removed                                                     |
| `household.deleted`         | `{ householdId }`                            | Household deleted (last admin left or admin explicitly deleted it) |

### Events Consumed

| Event          | Action                                                           |
| -------------- | ---------------------------------------------------------------- |
| `user.deleted` | Remove user from all households; if last admin, delete household |

---

## transaction-service

**Database tables:** `transactions`, `categories`

> **i18n note:** Categories have a `key` field (e.g. `food`, `electricity`, `housing`) alongside a `name` fallback. The frontend/mobile uses the key to look up the translated name from `libs/i18n` — never renders the stored `name` for seeded categories. User-created categories have `key: null` and are stored and displayed as typed. See edge-cases.md for the full seed key table (10 keys × 3 languages) and the `getCategoryName()` helper.

**Events Consumed:**

| Event               | Action                                                             |
| ------------------- | ------------------------------------------------------------------ |
| `household.deleted` | Hard delete all transactions and categories for that `householdId` |

### REST Endpoints

| Method | Path                             | Description                                                                                                    |
| ------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| GET    | `/transactions`                  | List (filterable by month, category, type)                                                                     |
| POST   | `/transactions`                  | Create transaction                                                                                             |
| GET    | `/transactions/:id`              | Get single transaction                                                                                         |
| PATCH  | `/transactions/:id`              | Update transaction                                                                                             |
| DELETE | `/transactions/:id`              | Delete transaction                                                                                             |
| DELETE | `/transactions/bulk`             | Bulk delete by IDs                                                                                             |
| GET    | `/transactions/summary`          | Monthly totals by category                                                                                     |
| GET    | `/categories`                    | List categories for household                                                                                  |
| POST   | `/categories`                    | Create category                                                                                                |
| PATCH  | `/categories/:id`                | Update category                                                                                                |
| DELETE | `/categories/:id`                | Delete category                                                                                                |
| GET    | `/internal/users/:userId/export` | GDPR data export — returns all transactions for this user (internal only, requires `x-internal-secret` header) |

### Transaction Shape

```typescript
{
  id: string
  householdId: string
  userId: string
  type: 'income' | 'expense'
  amount: number          // stored in øre (integer, no float)
  categoryId: string
  description?: string
  date: string            // ISO 8601
  createdAt: string
}
```

### Events Published

| Event                 | Payload                                                                                                                          | When         |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `transaction.created` | `{ transactionId, householdId, categoryId, amount, type, date }`                                                                 | After create |
| `transaction.updated` | `{ transactionId, householdId, categoryId, amount, type, date, previousCategoryId, previousAmount, previousType, previousDate }` | After update |
| `transaction.deleted` | `{ transactionId, householdId, categoryId, previousAmount, type }`                                                               | After delete |

---

## budget-service

**Database tables:** `budgets`, `budget_snapshots`, `budget_alert_state`, `processed_event_ids`

A budget is a spending limit per category per month for a household.

### REST Endpoints

| Method | Path              | Description                                             |
| ------ | ----------------- | ------------------------------------------------------- |
| GET    | `/budgets`        | List budgets for household (current month)              |
| POST   | `/budgets`        | Create budget limit for a category                      |
| PATCH  | `/budgets/:id`    | Update limit                                            |
| DELETE | `/budgets/:id`    | Remove budget limit                                     |
| GET    | `/budgets/status` | Current spending vs limit for all categories this month |

### Budget Status Shape

```typescript
{
  categoryId: string;
  categoryName: string;
  limitAmount: number;
  spentAmount: number; // calculated from received transaction events
  percentage: number; // spentAmount / limitAmount * 100
  status: 'ok' | 'warning' | 'exceeded'; // warning = >80%, exceeded = >100%
}
```

### Events Consumed

| Event                 | Action                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------ |
| `transaction.created` | Add to spending total for category/month                                                   |
| `transaction.updated` | Recalculate spending, re-check threshold                                                   |
| `transaction.deleted` | Subtract from spending total, re-check threshold                                           |
| `household.deleted`   | Hard delete all `budgets`, `budget_snapshots`, `budget_alert_state` for that `householdId` |

### Events Published

| Event                       | Payload                                                             | When                                                    |
| --------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------- |
| `budget.threshold.warning`  | `{ householdId, categoryId, percentage, limitAmount, spentAmount }` | Spending crosses 80% **for the first time this month**  |
| `budget.threshold.exceeded` | `{ householdId, categoryId, percentage, limitAmount, spentAmount }` | Spending crosses 100% **for the first time this month** |

> **Note:** budget-service maintains its own spending totals from events — it does NOT query transaction-service. This is intentional (service isolation).

> **Deduplication:** `budget_alert_state` table keyed by `(budgetId, month)` tracks `warningSentAt` and `exceededSentAt`. Each threshold fires at most once per month. No cron reset needed — a new month is a new row. When a budget limit is updated (`PATCH /budgets/:id`), both sent flags are reset to null so the next crossing fires again. See edge-cases.md for full implementation.

---

## notification-service

**Database tables:** `notifications` (in-app notification log)

Reacts to events and delivers alerts. Exposes read endpoints for the authenticated user — all writes are event-driven.

### Events Consumed → Actions

| Event                         | Action                                                       |
| ----------------------------- | ------------------------------------------------------------ |
| `user.registered`             | Send welcome email                                           |
| `household.invitation.sent`   | Send invitation email with accept link                       |
| `household.member.joined`     | Notify household admins                                      |
| `budget.threshold.warning`    | Email household: "You've used 80% of your [Category] budget" |
| `budget.threshold.exceeded`   | Email household: "You've exceeded your [Category] budget"    |
| `subscription.payment.failed` | Email user: "Your payment failed — update your billing info" |
| `household.deleted`           | Hard delete all `notifications` for that `householdId`       |

### Events Published

| Event | Payload | When |
|---|---|---|
| `notification.created` | `{ userId, householdId, notification: { id, type, message, createdAt } }` | After a new in-app notification is persisted |

### REST Endpoints

| Method | Path                             | Description                                        |
| ------ | -------------------------------- | -------------------------------------------------- |
| GET    | `/notifications`                 | List in-app notifications for a user               |
| PATCH  | `/notifications/:id/read`        | Mark as read                                       |
| GET    | `/internal/users/:userId/export` | GDPR — notifications for this user (internal only) |

### Weekly Spending Digest

A scheduled cron job runs every Monday at 08:00 (using `@nestjs/schedule`):

1. Calls `GET /internal/households/active` on household-service to get all households with their member user IDs
2. For each household, calls `GET /reports/monthly` on report-service to get the current month's spending summary
3. For each member, calls `GET /internal/users/:userId/notification-preferences` on auth-service — skips users who have opted out
4. Sends a digest email to each opted-in member with the household's monthly-to-date summary

```typescript
// apps/notification-service/src/digest/digest.service.ts
@Cron('0 8 * * MON')
async sendWeeklyDigest() {
  const households = await this.householdClient.getActiveHouseholds()
  for (const household of households) {
    const report = await this.reportClient.getMonthlyReport(household.id)
    for (const userId of household.memberIds) {
      const prefs = await this.authClient.getNotificationPreferences(userId)
      if (!prefs.weeklyDigest) continue
      await this.mailer.sendDigest({ userId, household, report })
    }
  }
}
```

**Opt-out preference:** add `weeklyDigest: boolean` to the `notification_preferences` structure in auth-service (default `true`).

---

## report-service

**Database tables:** `report_snapshots`, `export_history`, `processed_event_ids`

Maintains its own aggregated read model built from transaction events (CQRS pattern).
Never queries transaction-service directly — all data comes from the event bus.

### REST Endpoints

| Method | Path                             | Description                                                        |
| ------ | -------------------------------- | ------------------------------------------------------------------ |
| GET    | `/reports/monthly`               | Monthly totals + category breakdown + comparison to previous month |
| GET    | `/reports/yearly`                | Yearly totals + monthly breakdown                                  |
| GET    | `/reports/member`                | Spending breakdown per household member                            |
| GET    | `/reports/export/csv`            | Generate and stream CSV export                                     |
| GET    | `/reports/export/history`        | List past exports for this household                               |
| GET    | `/internal/users/:userId/export` | GDPR — export history for this user (internal only)                |

### Events Consumed

| Event                 | Action                                                                      |
| --------------------- | --------------------------------------------------------------------------- |
| `transaction.created` | Add to aggregated monthly/yearly totals                                     |
| `transaction.updated` | Recalculate affected period                                                 |
| `transaction.deleted` | Subtract from aggregated totals                                             |
| `household.deleted`   | Hard delete all `report_snapshots`, `export_history` for that `householdId` |

### Events Published

| Event             | Payload                                       | When             |
| ----------------- | --------------------------------------------- | ---------------- |
| `report.exported` | `{ householdId, userId, reportType, format }` | After CSV export |

---

## audit-service

**Database tables:** `activity_logs`

Schema: `id`, `householdId`, `userId` (nullable), `actorName` (denormalized, set to `'Deleted user'` on account deletion), `action` (e.g. `transaction.created`), `metadata` (jsonb), `createdAt`. Messages are formatted by the frontend from `action` + `actorName` — not stored as pre-formatted strings.

Records user actions across the system for the Activity Log settings page.
Purely a consumer — no REST writes, only reads and event ingestion.

### REST Endpoints

| Method | Path                             | Description                                               |
| ------ | -------------------------------- | --------------------------------------------------------- |
| GET    | `/audit/activity`                | List activity log for current user's household            |
| GET    | `/internal/users/:userId/export` | GDPR — activity log entries for this user (internal only) |

### Events Consumed

| Event                       | Action                                                                         |
| --------------------------- | ------------------------------------------------------------------------------ |
| `transaction.created`       | Log: "User X added transaction Y"                                              |
| `transaction.updated`       | Log: "User X updated transaction Y"                                            |
| `transaction.deleted`       | Log: "User X deleted transaction Y"                                            |
| `household.member.joined`   | Log: "User X joined the household"                                             |
| `household.member.removed`  | Log: "User X was removed from the household"                                   |
| `budget.threshold.exceeded` | Log: "Budget exceeded for category X"                                          |
| `report.exported`           | Log: "User X exported a CSV report"                                            |
| `user.deleted`              | Set `userId = null`, `actorName = 'Deleted user'` for all entries by this user |
| `user.data.exported`        | Log: "User X downloaded their data export"                                     |
| `household.deleted`         | Hard delete all `activity_logs` for that `householdId`                         |

---

## RabbitMQ Topology

### Exchange

One **topic exchange** named `familieoya` used for all events.

Topic exchange is chosen over direct because multiple services subscribe to the same events (e.g. `transaction.created` goes to budget-service, report-service, and audit-service). Topic allows flexible routing by pattern — `transaction.*` matches all transaction events.

### Queues

**One queue per service.** The exchange binds all relevant routing keys to a single queue per service. NestJS dispatches internally to the correct `@EventPattern` handler.

| Queue | Bound routing keys |
|---|---|
| `auth-service.queue` | _(publishes only — no consumed events)_ |
| `household-service.queue` | `user.deleted` |
| `transaction-service.queue` | `household.deleted` |
| `budget-service.queue` | `transaction.created`, `transaction.updated`, `transaction.deleted`, `household.deleted` |
| `notification-service.queue` | `user.registered`, `household.invitation.sent`, `household.member.joined`, `budget.threshold.warning`, `budget.threshold.exceeded`, `subscription.payment.failed`, `household.deleted` |
| `report-service.queue` | `transaction.created`, `transaction.updated`, `transaction.deleted`, `household.deleted` |
| `audit-service.queue` | `transaction.created`, `transaction.updated`, `transaction.deleted`, `household.member.joined`, `household.member.removed`, `budget.threshold.exceeded`, `report.exported`, `user.deleted`, `user.data.exported`, `household.deleted` |
| `billing-service.queue` | `household.created`, `household.deleted` |

### Dead-Letter Queues (DLQ)

Every service queue has a paired DLQ: `<service>.queue.dlq`.

If a message fails 3 times (handler throws, message is nacked), RabbitMQ moves it to the DLQ instead of dropping it or looping forever. A lightweight DLQ consumer logs the dead message — no auto-retry. You inspect and replay manually via the RabbitMQ management UI.

**NestJS queue configuration (same pattern for every service):**

```typescript
// apps/<service>/src/main.ts
app.connectMicroservice<MicroserviceOptions>({
  transport: Transport.RMQ,
  options: {
    urls: [process.env.RABBITMQ_URL],
    exchange: 'familieoya',
    exchangeType: 'topic',
    queue: '<service>.queue',
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'familieoya.dlq',
        'x-dead-letter-routing-key': '<service>.queue.dlq',
        'x-message-ttl': 60000,   // 1 min between retries
        'x-max-retries': 3,       // move to DLQ after 3 failures
      },
    },
    noAck: false,  // manual ack — required for DLQ to work
  },
})
```

**DLQ consumer (one shared handler in `libs/common`):**

```typescript
// libs/common/src/dlq/dlq.handler.ts
@EventPattern('*.dlq')
handleDeadLetter(@Payload() message: unknown, @Ctx() context: RmqContext) {
  const channel = context.getChannelRef()
  const originalMessage = context.getMessage()
  this.logger.error('Dead letter received', { message, queue: originalMessage.fields.routingKey })
  channel.ack(originalMessage) // ack the DLQ message so it doesn't loop
}
```

### Publisher pattern

All publishers set `eventId` once and never regenerate it on retry:

```typescript
// Example: transaction-service publishing an event
this.client.emit<void, TransactionCreatedEvent>(TRANSACTION_CREATED, {
  eventId: crypto.randomUUID(),  // set once, never changed on retry
  transactionId: transaction.id,
  householdId: transaction.householdId,
  categoryId: transaction.categoryId,
  amount: transaction.amount,
  type: transaction.type,
  date: transaction.date,
})
```

---

## Shared Contracts (`libs/contracts`)

All event message shapes are defined here as TypeScript interfaces so every service imports the same types.

```typescript
// libs/contracts/src/events/base.ts
export interface BaseEvent {
  eventId: string; // set by publisher (crypto.randomUUID()), never changed on retry
}

// libs/contracts/src/events/transaction.events.ts
export interface TransactionCreatedEvent extends BaseEvent {
  transactionId: string;
  householdId: string;
  categoryId: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
}

export const TRANSACTION_CREATED = 'transaction.created';
```

`eventId` on every event is required for idempotent consumers (budget-service, report-service). Publishers generate it once with `crypto.randomUUID()` — never regenerated on retry.

This prevents event schema drift between services.

---

## Swagger / OpenAPI

Swagger is set up on **api-gateway only** — it is the single public-facing entry point and the only contract external consumers (web, mobile, employers) care about. Internal services are not documented with Swagger.

Swagger UI is available at: `https://api.familieoya.furevikstrand.cloud/docs`

### Setup

```typescript
// apps/api-gateway/src/main.ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('Familieøya API')
  .setDescription('Family budget app — api-gateway')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('docs', app, document);
```

Enable the NestJS Swagger CLI plugin in `nest-cli.json` to auto-infer DTO properties from TypeScript types — this eliminates most manual `@ApiProperty()` decoration:

```json
{
  "plugins": [
    {
      "name": "@nestjs/swagger",
      "options": { "introspectComments": true }
    }
  ]
}
```

### `libs/contracts` — request/response DTOs

`libs/contracts` currently holds event interfaces. For Swagger to work on the gateway, **request and response DTOs also belong here** — the gateway needs to reference them to generate accurate schema definitions.

Structure:

```
libs/contracts/src/
├── events/          ← existing: event interfaces + constants
│   ├── base.ts
│   ├── transaction.events.ts
│   └── ...
└── dto/             ← new: request/response DTOs for gateway Swagger
    ├── auth/
    │   ├── register.dto.ts
    │   ├── login.dto.ts
    │   └── ...
    ├── transaction/
    │   ├── create-transaction.dto.ts
    │   └── ...
    └── ...
```

Each DTO uses class-validator decorators for validation and the Swagger plugin picks up TypeScript types automatically. The gateway imports these DTOs for its forwarded route handlers — internal services import the same DTOs for their own validation, keeping request shapes in sync across the stack.
