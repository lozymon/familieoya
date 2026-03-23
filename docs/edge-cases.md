# Edge Cases & Known Design Decisions

Issues identified during planning that need specific handling during implementation.
Grouped by severity: **🔴 Must fix**, **🟡 Handle with care**, **🟢 Known/accepted limitation**.

---

## Auth

### 🔴 JWT `plan` claim is stale after upgrade

The plan is baked into the JWT (15-min TTL). A user who upgrades from Free to Pro is blocked from Pro features for up to 15 minutes, or retains Free-plan access after downgrade for the same window.

**Decision: two-layer approach**

- JWT `plan` claim is used **client-side only** — for showing lock icons and upgrade CTAs in the UI
- **Server-side enforcement never trusts the JWT `plan`** — each service queries billing-service (or a Redis cache) for the current plan on every write operation that requires a plan check
- Upgrade UX: after checkout completes, frontend calls `POST /auth/refresh` to get an updated token immediately — plan is reflected within seconds
- This means a stale JWT cannot grant or block server-side access — only the DB is authoritative

---

### 🔴 Multi-household: single `householdId` in JWT breaks context switching

JWT carries one `householdId`. Re-issuing tokens on every household switch is unnecessary complexity.

**Decision: `X-Household-ID` request header**

Remove `householdId` from the JWT entirely. The client sends the active household as a header on every request:

```
X-Household-ID: <uuid>
```

The gateway validates that the authenticated user (`sub` from JWT) is a member of that household on every request. No token re-issuance, no session store, no Redis needed.

- Household switch = client updates which `householdId` it sends. Instant.
- Shell stores the active household in React context + `localStorage` for persistence across refreshes
- Mobile stores it in `flutter_secure_storage`
- `POST /auth/switch-household` endpoint is no longer needed

---

### 🔴 Invitation token not tied to email at acceptance

Any authenticated user with the invitation URL can join the household, not just the intended recipient.

**Fix — complete invitation flow:**

Token is a cryptographically random 32-byte hex string (`crypto.randomBytes(32).toString('hex')`). Stored in the `invitations` table alongside the target email, expiry (7 days), and `usedAt`.

Three scenarios at `GET /invitations/:token`:

| Scenario                    | Action                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Not logged in               | Store token in `sessionStorage`, redirect to `/login?next=/invitations/:token`. After login, resume acceptance. |
| Registering via invite link | Pre-fill the invited email as read-only — forces registration with the correct email                            |
| Logged in, email matches    | Accept immediately — join household, invalidate token, switch household context                                 |
| Logged in, email mismatch   | Return 403: "This invitation was sent to a different email. Log out and use that account."                      |
| Token expired (>7 days)     | Return 410: "This invitation has expired. Ask an admin to send a new one."                                      |
| Token already used          | Return 410: "This invitation has already been accepted."                                                        |

Token is invalidated (set `usedAt`) immediately on acceptance — one-time use only.

---

### 🟡 JWT refresh race condition on mobile (multiple concurrent requests)

Three simultaneous API calls all get 401 → three concurrent refresh attempts → only the first succeeds, the others invalidate the rotated refresh token → silent logout.

**Fix — Flutter (Dio interceptor mutex):**

```dart
// core/api/auth_interceptor.dart
class AuthInterceptor extends Interceptor {
  final SecureStorage _storage;
  final AuthApi _authApi;
  final Ref _ref; // Riverpod ref to trigger logout

  bool _isRefreshing = false;
  final List<Completer<String>> _queue = [];

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode != 401) {
      return handler.next(err);
    }

    // If already refreshing, queue this request and wait
    if (_isRefreshing) {
      final completer = Completer<String>();
      _queue.add(completer);
      try {
        final newToken = await completer.future;
        final opts = err.requestOptions
          ..headers['Authorization'] = 'Bearer $newToken';
        return handler.resolve(await Dio().fetch(opts));
      } catch (_) {
        return handler.next(err);
      }
    }

    // First 401 — acquire the lock
    _isRefreshing = true;
    try {
      final newToken = await _authApi.refresh();
      await _storage.writeAccessToken(newToken);

      // Release all queued requests with the new token
      for (final c in _queue) { c.complete(newToken); }
      _queue.clear();

      // Retry the original request
      final opts = err.requestOptions
        ..headers['Authorization'] = 'Bearer $newToken';
      return handler.resolve(await Dio().fetch(opts));

    } catch (_) {
      // Refresh failed — reject all queued requests and log out
      for (final c in _queue) { c.completeError('session_expired'); }
      _queue.clear();
      _ref.read(authProvider.notifier).logout();
      return handler.next(err);

    } finally {
      _isRefreshing = false;
    }
  }
}
```

**Fix — Web (TanStack Query + fetch — singleton promise):**

```typescript
// libs/api-client/src/auth.ts
let _refreshPromise: Promise<string> | null = null;

export async function refreshAccessToken(): Promise<string> {
  // If a refresh is already in progress, return the same promise
  // All callers get the same result — only one HTTP call is made
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = fetch('/auth/refresh', {
    method: 'POST',
    credentials: 'include', // sends httpOnly refresh cookie
  })
    .then((res) => {
      if (!res.ok) throw new Error('refresh_failed');
      return res.json();
    })
    .then((data) => {
      setAccessToken(data.accessToken); // store in memory
      return data.accessToken;
    })
    .finally(() => {
      _refreshPromise = null; // clear so next expiry works
    });

  return _refreshPromise;
}
```

All API client functions call `refreshAccessToken()` on 401 — they all get the same in-flight promise, only one HTTP request is made, and all retry with the new token once it resolves.

**Why these approaches work:**

- Flutter: `_queue` holds `Completer`s — they pause execution until `complete()` is called
- Web: returning the same `Promise` object means all callers await the same resolution — JavaScript's event loop handles the rest naturally

---

### 🟡 2FA recovery codes missing

A user who loses their authenticator app is permanently locked out. Blocks GDPR deletion requests too. Support cannot help — there is no backdoor, by design.

**Fix — full recovery code flow:**

**Generating codes (at `POST /auth/2fa/enable`):**

- Generate 8 codes, each `XXXXX-XXXXX` format (10 random alphanumeric chars, split for readability)
- Use `crypto.randomBytes` — never `Math.random()`
- Store each code **hashed** with bcrypt (treat like passwords — plain text never persists)
- Show codes to user **once only** — they must save them before leaving the page
- UI: "Copy all" button + "Download as .txt" + printed warning

```typescript
// auth-service: generate recovery codes
function generateRecoveryCodes(): { plain: string[]; hashed: string[] } {
  const plain = Array.from({ length: 8 }, () => {
    const bytes = crypto.randomBytes(5).toString('hex').toUpperCase();
    return `${bytes.slice(0, 5)}-${bytes.slice(5, 10)}`;
  });
  const hashed = plain.map((code) => bcrypt.hashSync(code, 10));
  return { plain, hashed };
}
```

**Database schema (`recovery_codes` table in auth-service):**

```
id        uuid
userId    uuid
codeHash  string     ← bcrypt hash, never plain text
usedAt    timestamp? ← null = still valid, set = consumed
createdAt timestamp
```

**New endpoints:**

| Method | Path                        | Description                                                                                   |
| ------ | --------------------------- | --------------------------------------------------------------------------------------------- |
| POST   | `/auth/2fa/enable`          | Returns TOTP secret + QR code + **8 plain recovery codes (shown once)**                       |
| POST   | `/auth/login/recover`       | Login using a recovery code instead of TOTP — marks code as `usedAt`, sends email alert       |
| POST   | `/auth/2fa/regenerate`      | Generate 8 new codes, invalidate all old ones — requires TOTP or a recovery code to authorize |
| GET    | `/auth/2fa/recovery-status` | Returns `{ remaining: 6, total: 8 }` — shown in settings                                      |

**Login flow with recovery:**

```
POST /auth/login/recover { email, password, recoveryCode }
  │
  ├── validate email + password
  ├── find user's recovery_codes where usedAt IS NULL
  ├── bcrypt.compare(recoveryCode, each hash) ← O(n) but n=8, acceptable
  ├── if match found:
  │     set usedAt = now
  │     send email: "A recovery code was used to access your account"
  │     issue JWT (same as normal login)
  │     if remaining codes ≤ 2:
  │       send email: "You only have X recovery codes left — regenerate them"
  └── if no match: return 401 (rate-limited: max 5 attempts/hour)
```

**Settings page additions (`mfe-settings → Two-factor auth`):**

- Show remaining code count: "6 of 8 recovery codes remaining"
- Warning banner when ≤ 2 remaining: "You're running low on recovery codes"
- "Regenerate codes" button → requires current TOTP to confirm → shows new 8 codes once

**Why codes are hashed:**
If the database is breached, plain-text recovery codes would be as dangerous as plain-text passwords — they grant full account access. Bcrypt makes them useless without the original value.

---

## Event-Driven Architecture

### 🔴 `transaction.updated` missing previous state fields

If a user changes a transaction's category from Food → Transport, `budget-service` needs to subtract from Food and add to Transport. Without the previous values, the old category's total is never corrected.

**Full payload (updated in services.md):**

```typescript
{
  (transactionId,
    householdId,
    // new values
    categoryId,
    amount,
    type,
    date,
    // previous values — all four needed
    previousCategoryId,
    previousAmount,
    previousType,
    previousDate);
}
```

`previousType` and `previousDate` are also required — without them cases 4 and 5 below are broken.

**All cases budget-service must handle:**

| Scenario                      | Action                                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| Amount changed, same category | subtract `previousAmount`, add `amount` (same category, same month)                     |
| Category changed, same amount | subtract from `previousCategoryId`, add to `categoryId`                                 |
| Both changed                  | subtract `previousAmount` from `previousCategoryId`, add `amount` to `categoryId`       |
| expense → income              | subtract `previousAmount` from `previousCategoryId` (income never counts toward budget) |
| income → expense              | add `amount` to `categoryId`                                                            |
| Date moves to different month | subtract from `previousDate` month total, add to `date` month total                     |

**Handler logic (budget-service):**

```typescript
@EventPattern(TRANSACTION_UPDATED)
async handleTransactionUpdated(event: TransactionUpdatedEvent) {
  const {
    householdId,
    categoryId, amount, type, date,
    previousCategoryId, previousAmount, previousType, previousDate,
  } = event

  // Step 1: undo the previous state (if it was an expense)
  if (previousType === 'expense') {
    await this.subtractFromTotal(householdId, previousCategoryId, previousDate, previousAmount)
  }

  // Step 2: apply the new state (if it is now an expense)
  if (type === 'expense') {
    await this.addToTotal(householdId, categoryId, date, amount)
    await this.checkThreshold(householdId, categoryId, date)
  }
}
```

The pattern is: **always undo what was, then apply what is**. This covers all 6 cases with one clean handler — no conditional branching per scenario needed.

---

### 🔴 Budget threshold fires on every transaction after crossing 80%

Once a household crosses 80%, every subsequent transaction re-publishes `budget.threshold.warning` → spam emails.

**Database — `budget_alert_state` table (budget-service):**

```
budgetId        uuid
month           string     ← 'YYYY-MM' — acts as the natural reset key
warningSentAt   timestamp? ← null = not yet fired this month
exceededSentAt  timestamp? ← null = not yet fired this month
```

No cron job needed for monthly reset — querying by `(budgetId, month)` automatically gives a fresh record each new month.

**Threshold check logic:**

```typescript
async checkThreshold(householdId: string, categoryId: string, month: string) {
  const budget = await this.getBudget(householdId, categoryId)
  if (!budget) return // no limit set for this category

  const spent = await this.getSpentAmount(householdId, categoryId, month)
  const percentage = (spent / budget.limitAmount) * 100

  // getOrCreate — returns existing row or inserts a fresh one for this month
  const state = await this.getOrCreateAlertState(budget.id, month)

  if (percentage >= 100 && !state.exceededSentAt) {
    await this.markExceededSent(state.id)
    await this.publish(BUDGET_THRESHOLD_EXCEEDED, { householdId, categoryId, percentage, ... })

  } else if (percentage >= 80 && !state.warningSentAt) {
    await this.markWarningSent(state.id)
    await this.publish(BUDGET_THRESHOLD_WARNING, { householdId, categoryId, percentage, ... })
  }
  // if already alerted at this level → do nothing
}
```

**All scenarios handled:**

| Scenario                                          | Result                                                                      |
| ------------------------------------------------- | --------------------------------------------------------------------------- |
| First crossing of 80%                             | `warningSentAt` is null → fires, sets `warningSentAt`                       |
| Next transaction at 85%                           | `warningSentAt` is set → no-op                                              |
| Transaction deleted → 78% → new transaction → 82% | `warningSentAt` still set → no-op                                           |
| Spending crosses 100%                             | `exceededSentAt` is null → fires, sets `exceededSentAt`                     |
| Another transaction at 105%                       | `exceededSentAt` is set → no-op                                             |
| New month                                         | New `(budgetId, 'YYYY-MM')` row → both fields null → alerts reset naturally |
| Budget limit **increased** (82% → 51%)            | Reset `warningSentAt` to null — next crossing fires again                   |

**The limit-change reset** is the only special case. When `PATCH /budgets/:id` fires, budget-service updates `warningSentAt = null` and `exceededSentAt = null` for the current month's alert state — because the new limit makes the old thresholds meaningless.

---

### 🔴 `household.deleted` event missing — orphaned data across services

When a household is deleted, budget-service, report-service, audit-service, and notification-service have no consumer — their data for that `householdId` is never cleaned up. billing-service also keeps charging.

**Two triggers for `household.deleted`:**

```
1. Admin deletes account (DELETE /auth/me)
      → user.deleted published
      → household-service: if user is last admin → delete household
      → household.deleted published

2. Admin explicitly deletes household (DELETE /households/:id)
      → household-service: verify requester is admin → delete household
      → household.deleted published
```

**Per-service cleanup:**

| Service              | Tables cleaned up                                   | Extra                                         |
| -------------------- | --------------------------------------------------- | --------------------------------------------- |
| transaction-service  | `transactions`, `categories`                        | (already wired)                               |
| budget-service       | `budgets`, `budget_snapshots`, `budget_alert_state` | —                                             |
| report-service       | `report_snapshots`, `export_history`                | —                                             |
| audit-service        | `activity_logs`                                     | —                                             |
| notification-service | `notifications`                                     | —                                             |
| billing-service      | mark `subscriptions` as `cancelled`                 | **Cancel active Stripe subscription via API** |

The Stripe cancellation is the critical extra step in billing-service. Without it, the household is gone but Stripe keeps billing the customer.

**billing-service handler:**

```typescript
@EventPattern(HOUSEHOLD_DELETED)
async onHouseholdDeleted(@Payload() event: HouseholdDeletedEvent) {
  const subscription = await this.subscriptions.findActiveByHousehold(event.householdId)
  if (!subscription) return // free tier — no Stripe subscription to cancel

  await this.stripe.subscriptions.cancel(subscription.stripeSubscriptionId)
  await this.subscriptions.markCancelled(subscription.id)
}
```

All other consumers follow the same pattern (just a hard delete — no external call needed):

```typescript
@EventPattern(HOUSEHOLD_DELETED)
async onHouseholdDeleted(@Payload() event: HouseholdDeletedEvent) {
  await this.repository.deleteByHousehold(event.householdId)
}
```

**Idempotency:** Hard deletes are safe to receive twice — deleting already-deleted rows is a no-op. No `processed_event_ids` needed here.

**Contract (`libs/contracts`):**

```typescript
// libs/contracts/src/events/household.events.ts
export interface HouseholdDeletedEvent {
  householdId: string;
}
export const HOUSEHOLD_DELETED = 'household.deleted';
```

---

### 🟡 At-least-once delivery — budget-service totals can double-count

RabbitMQ can redeliver a message. If `budget-service` crashes after updating the spending total but before ACKing, the handler runs again — the total is incremented twice. Same risk in report-service (aggregated read model).

**Prerequisite — manual ACK:**

NestJS auto-acks by default. Disable it so you control when ACK is sent:

```typescript
// budget-service/src/main.ts
app.connectMicroservice({
  transport: Transport.RMQ,
  options: {
    urls: [process.env.RABBITMQ_URL],
    queue: 'budget_queue',
    noAck: false, // ← must be false for manual ack
    queueOptions: { durable: true },
  },
});
```

**Database — `processed_event_ids` table (budget-service and report-service):**

```
eventId      string  ← UNIQUE constraint — PK
processedAt  timestamp
```

**Why not just check-then-mark?**

A check before processing and a mark after is still unsafe under concurrent redelivery. The correct pattern is: insert `eventId` and perform the state change **inside the same database transaction**. The unique constraint on `eventId` becomes the idempotency guard — the second attempt throws a unique violation, not a logic error.

**Implementation:**

```typescript
// shared helper — same pattern in budget-service and report-service
async function withIdempotency(
  db: DataSource,
  eventId: string,
  fn: (queryRunner: QueryRunner) => Promise<void>,
): Promise<void> {
  const qr = db.createQueryRunner();
  await qr.startTransaction();
  try {
    // Unique constraint throws here if already processed
    await qr.manager.insert(ProcessedEventId, {
      eventId,
      processedAt: new Date(),
    });
    await fn(qr); // state change runs inside same transaction
    await qr.commitTransaction();
  } catch (err) {
    await qr.rollbackTransaction();
    if (isUniqueConstraintError(err)) return; // already processed — safe to ack
    throw err; // real error — do NOT ack, let RabbitMQ redeliver
  } finally {
    await qr.release();
  }
}
```

**Consumer using the helper:**

```typescript
@EventPattern(TRANSACTION_CREATED)
async onTransactionCreated(
  @Payload() event: TransactionCreatedEvent,
  @Ctx() context: RmqContext,
) {
  const channel = context.getChannelRef()
  const message = context.getMessage()

  await withIdempotency(this.dataSource, event.eventId, async (qr) => {
    await this.addToTotal(qr, event.householdId, event.categoryId, event.date, event.amount)
    await this.checkThreshold(event.householdId, event.categoryId, event.date)
  })

  channel.ack(message) // only reaches here if processed or already-processed
}
```

If `withIdempotency` throws a real error (DB down, etc.), the function throws before `channel.ack()` — RabbitMQ keeps the message and redelivers. This is exactly what we want.

**Event contract — `eventId` required on all events:**

Publishers must generate a stable ID per event. Add to `libs/contracts`:

```typescript
// libs/contracts/src/events/base.ts
export interface BaseEvent {
  eventId: string; // nanoid() or crypto.randomUUID() — set by publisher, never changed on retry
}

// Every event extends BaseEvent:
export interface TransactionCreatedEvent extends BaseEvent {
  transactionId: string;
  householdId: string;
  // ...
}
```

**Which services need this:**

| Service              | Why                                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| budget-service       | Spending totals are financial data — must be exact                                                                      |
| report-service       | Aggregated read model — must be exact                                                                                   |
| audit-service        | Duplicate log entries are ugly but not harmful — skip for now                                                           |
| notification-service | Emails deduplicated by other means (budget threshold via `budget_alert_state`, invitations are one-time) — skip for now |

**Retention:** `processed_event_ids` rows older than 7 days can be deleted — RabbitMQ will not redeliver a message that old. Add a nightly cron in each service:

```typescript
await this.processedEventIds.delete({ processedAt: LessThan(sevenDaysAgo) });
```

---

### 🟡 Stripe webhook idempotency

Stripe guarantees at-least-once delivery. A `checkout.session.completed` webhook could arrive twice — activating a subscription twice, or double-crediting a trial.

**Two steps must always happen in order:**

1. Verify the `Stripe-Signature` header (reject unsigned requests first)
2. Check idempotency (then process)

**Gotcha — raw body required for signature verification:**

Express/NestJS body-parser parses the JSON body before your handler runs. Stripe's `constructEvent()` needs the **raw Buffer**, not the parsed object — a parsed body produces a different hash and verification always fails.

Fix: enable raw body in NestJS bootstrap:

```typescript
// main.ts (billing-service)
const app = await NestFactory.create(AppModule, { rawBody: true });
```

Then in the controller, request the raw body explicitly:

```typescript
import { RawBodyRequest } from '@nestjs/common'

@Post('webhook')
async handleWebhook(
  @Headers('stripe-signature') sig: string,
  @Req() req: RawBodyRequest<Request>,
  @Res() res: Response,
) {
  // Step 1: verify signature — must use raw Buffer
  let event: Stripe.Event
  try {
    event = this.stripe.webhooks.constructEvent(
      req.rawBody,   // ← raw Buffer, not req.body
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    )
  } catch {
    return res.status(400).send('Invalid signature')
  }

  // Step 2: idempotency + processing in one transaction
  try {
    await this.dataSource.transaction(async (tx) => {
      // Unique constraint throws if event.id already exists
      await tx.getRepository(BillingEvent).insert({
        stripeEventId: event.id,
        type: event.type,
        processedAt: new Date(),
      })
      await this.processStripeEvent(event, tx)
    })
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return res.status(200).send() // already processed — Stripe will stop retrying
    }
    // Real processing error — return 500 so Stripe retries
    throw err
  }

  return res.status(200).send()
}
```

**Why the transaction matters:**

Same atomicity argument as RabbitMQ idempotency. If you insert into `billing_events` after processing, a crash between the two means the event redelivers and processes again. Inserting first (inside the same transaction) means commit = both happened, rollback = neither happened.

**`billing_events` table schema:**

```
stripeEventId  string     ← UNIQUE — e.g. 'evt_1RaB3kLkfjHKGF'
type           string     ← e.g. 'checkout.session.completed'
processedAt    timestamp
```

Stripe retries for up to 3 days — records can safely be pruned after 7 days.

**Return 200 on duplicates — not 4xx:**

If you return 4xx on a duplicate, Stripe treats it as a failure and keeps retrying. Always return 200 for events you've already processed.

---

### 🟡 Stripe `past_due` state not modelled

Stripe retries failed payments with exponential backoff for ~2 weeks before cancelling. During that window the subscription is `past_due` — not active, not cancelled. Immediately downgrading users on first payment failure is terrible UX and will drive churn.

**Subscription status lifecycle:**

```
trialing → active → past_due → cancelled
                 ↗             (after all retries exhausted)
         active ←              (if payment succeeds during retry window)
```

**`subscriptions` table — status enum update:**

```
status: 'trialing' | 'active' | 'past_due' | 'cancelled'
```

**Webhook → status mapping:**

| Stripe webhook event            | Action                                                       | Access                              |
| ------------------------------- | ------------------------------------------------------------ | ----------------------------------- |
| `checkout.session.completed`    | Set status `active`                                          | Full plan                           |
| `customer.subscription.updated` | Sync status from Stripe (covers `past_due` too)              | Full plan if `active` or `past_due` |
| `invoice.payment_failed`        | Set status `past_due`, publish `subscription.payment.failed` | **Keep full plan**                  |
| `customer.subscription.deleted` | Set status `cancelled`, publish `subscription.cancelled`     | Downgrade to Free                   |

**Plan enforcement during `past_due`:**

`GET /billing/subscription` returns the plan based on status:

```typescript
function resolvedPlan(subscription: Subscription): Plan {
  if (subscription.status === 'active' || subscription.status === 'past_due') {
    return subscription.plan; // Pro or Family — grace period maintained
  }
  return 'free'; // cancelled or no subscription
}
```

The user retains full access throughout the retry window. Only `customer.subscription.deleted` (Stripe gives up) triggers the downgrade.

**Frontend — payment failure banner:**

The shell calls `GET /billing/subscription` on load. If `status === 'past_due'`, show a dismissible banner:

> "Your last payment failed. [Update payment method →]" (links to `POST /billing/portal` → Stripe Customer Portal)

This is the only UI change needed — no feature gating during `past_due`.

**`invoice.payment_failed` handler:**

```typescript
case 'invoice.payment_failed': {
  const stripeSubId = event.data.object.subscription as string
  await this.subscriptions.updateByStripeId(stripeSubId, { status: 'past_due' })
  await this.publish(SUBSCRIPTION_PAYMENT_FAILED, { householdId, userId })
  // notification-service sends email: "Update your payment method to keep access"
  break
}
```

**`customer.subscription.deleted` handler (the actual downgrade):**

```typescript
case 'customer.subscription.deleted': {
  await this.subscriptions.updateByStripeId(stripeSubId, { status: 'cancelled' })
  await this.publish(SUBSCRIPTION_CANCELLED, { householdId, plan })
  // auth-service consumer: user's next token refresh will reflect Free plan
  break
}
```

No timer, no cron — Stripe's own retry mechanism is the clock. When Stripe sends `customer.subscription.deleted`, that is the authoritative signal to downgrade.

---

## Billing

### 🔴 Trial is user-scoped but billing is household-scoped

Trial was triggered by `user.registered`, but the user has no household at that point — billing-service has no `householdId` to attach the trial to.

**Fix: trigger trial on `household.created` instead**

**Step 1 — add `household.created` event to household-service:**

```typescript
// libs/contracts/src/events/household.events.ts
export interface HouseholdCreatedEvent extends BaseEvent {
  householdId: string;
  createdBy: string; // userId of the admin who created it
}
export const HOUSEHOLD_CREATED = 'household.created';
```

**Step 2 — billing-service handler:**

```typescript
@EventPattern(HOUSEHOLD_CREATED)
async onHouseholdCreated(@Payload() event: HouseholdCreatedEvent) {
  // One trial per user — check if this user has ever had a trial on any household
  const hadTrial = await this.subscriptions.userHadTrial(event.createdBy)
  if (hadTrial) return // user already used their free trial

  await this.subscriptions.create({
    householdId: event.householdId,
    createdByUserId: event.createdBy,
    plan: 'pro',
    status: 'trialing',
    trialEndsAt: addDays(new Date(), 14),
    stripeCustomerId: null, // no Stripe subscription yet — no card required
  })
}
```

**Why one trial per user, not per household?**

Without this, a user creates household A (gets trial), then household B (gets another trial), cycling indefinitely. Tracking `createdByUserId` on the subscription and checking if that userId has ever had a trial closes this.

**Trial expiry — internal cron (not Stripe):**

No credit card is required to start the trial, so there is no Stripe subscription to manage. billing-service runs a daily cron to expire trials:

```typescript
// Runs at midnight UTC daily
@Cron('0 0 * * *')
async expireTrials() {
  const expired = await this.subscriptions.findExpiredTrials() // status=trialing AND trialEndsAt < now
  for (const sub of expired) {
    await this.subscriptions.update(sub.id, { status: 'cancelled' })
    await this.publish(SUBSCRIPTION_CANCELLED, { householdId: sub.householdId, plan: 'pro' })
    // auth-service consumer: user's next token refresh reflects Free plan
  }
}
```

**When the user upgrades during or after trial:**

`POST /billing/checkout` creates a Stripe Checkout session for the first time. On `checkout.session.completed`, billing-service sets status to `active` and stores `stripeCustomerId`. The trial record is replaced by a real subscription.

**`subscriptions` table — additions:**

```
createdByUserId  uuid       ← used for one-trial-per-user check
trialEndsAt      timestamp? ← null for paid subscriptions
```

**Full status flow:**

```
household.created → trialing (14 days, no card)
     ↓ cron at day 14
   cancelled (Free tier)
     ↓ user upgrades
   active (Stripe subscription created)
     ↓ payment fails
   past_due (grace period, Stripe retries)
     ↓ all retries exhausted
   cancelled
```

---

### 🟡 Downgrade does not define over-limit member handling

Downgrading from Family (10 members) to Pro (5 members) leaves 5 members in limbo.

**Decision:** Existing members are never removed automatically — that would be destructive. Instead:

- All existing members retain access until the household admin manually removes them
- Adding new members is blocked until under the plan limit
- A banner is shown to admins: "Your plan allows 5 members. You have 10. Upgrade or remove members."

**Where the limit is enforced — household-service:**

On `POST /households/:id/invitations`, household-service fetches the current plan limits from billing-service before creating the invitation:

```typescript
async sendInvitation(householdId: string, email: string) {
  const [memberCount, limits] = await Promise.all([
    this.members.countByHousehold(householdId),
    this.billingClient.getLimits(householdId), // HTTP call to billing-service
  ])

  if (memberCount >= limits.maxMembers) {
    throw new ForbiddenException(
      `Your plan allows ${limits.maxMembers} members. Remove members to invite new ones.`
    )
  }

  // proceed with invitation...
}
```

billing-service exposes an internal endpoint used by other services:

```
GET /billing/limits?householdId=:id
→ { maxMembers: 5, maxTransactionsPerMonth: null, canExportReports: true, ... }
```

**What the frontend gets — `GET /billing/subscription` response:**

Add usage context so the shell can render the banner without an extra call:

```typescript
{
  plan: 'pro',
  status: 'active',
  trialEndsAt: null,
  usage: {
    memberCount: 8,
    memberLimit: 5,
    isOverMemberLimit: true,   // memberCount > memberLimit
  }
}
```

The shell checks `isOverMemberLimit` on load and shows a banner to admins only (not regular members):

> "Your plan allows 5 members but you have 8. [Remove members] or [Upgrade to Family →]"

**Same pattern applies to the Free tier transaction limit:**

On `POST /transactions`, transaction-service calls `GET /billing/limits` and checks monthly transaction count. If the household has ≥ 50 transactions this month and is on Free, the request is rejected with a 403 and an upgrade prompt.

**No auto-removal, ever.** The principle is: downgrading restricts what you can _add_, never what you already _have_.

---

### 🟡 Household `currency` should be immutable after first transaction

If a household changes currency (e.g., NOK → BRL), historical transactions stored in the smallest unit (øre, centavos, cents) become meaningless — 5000 øre is kr 50, but 5000 centavos is R$ 50. The Stripe checkout would also silently use the wrong price.

**Decision: `currency` is immutable from creation — not just after first transaction**

"Allow changes before first transaction" adds complexity for minimal value. Users pick their currency at creation time; there is no edit flow for it.

The enforcement is at the DTO level — `currency` is simply absent from `UpdateHouseholdDto`:

```typescript
// update-household.dto.ts
export class UpdateHouseholdDto {
  @IsOptional()
  @IsString()
  name?: string;
  // currency is intentionally absent — immutable after creation
}
```

NestJS's `ValidationPipe` with `whitelist: true` strips any `currency` field sent in a PATCH body automatically. No conditional logic, no cross-service call to count transactions.

**Frontend:** the household edit form has a `name` field only. `currency` is shown as read-only text (e.g. "Norwegian Krone — NOK"). No edit input rendered.

**Why not "reject if has transactions"?**

That requires household-service to call transaction-service to check — cross-service coupling for a check that should never succeed anyway. Immutable from creation is simpler and equally correct.

**Stripe:** billing-service reads `currency` from the household when creating a Checkout session. Since `currency` never changes, `getPriceId(plan, household.currency)` always returns the correct price ID regardless of when checkout is initiated.

---

## GDPR

### 🔴 GDPR data export only covers auth-service

`GET /auth/me/data-export` only returns auth-service data. Personal data is spread across all services.

**Fix:** auth-service fans out to each service via internal HTTP, aggregates all responses, and streams a single JSON file.

**What each service holds per user:**

| Service              | User-specific data                         |
| -------------------- | ------------------------------------------ |
| auth-service         | profile, 2FA status (not secrets)          |
| household-service    | memberships, invitations sent by this user |
| transaction-service  | all transactions where `userId = :userId`  |
| notification-service | notifications for this user                |
| audit-service        | activity log entries for this user         |
| report-service       | export history for this user               |
| billing-service      | subscription plan + status                 |

**Internal endpoint on each service:**

```
GET /internal/users/:userId/export
```

Not a public route — only reachable service-to-service within the Docker network. Protected by a shared `x-internal-secret` header (defense-in-depth):

```typescript
// InternalApiGuard — applied to all /internal/* controllers
@Injectable()
export class InternalApiGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    return req.headers['x-internal-secret'] === process.env.INTERNAL_API_SECRET;
  }
}
```

**auth-service aggregator — `Promise.allSettled`, not `Promise.all`:**

If one service is temporarily down, the user still gets the rest of their data rather than a total failure:

```typescript
async exportUserData(userId: string) {
  const targets = [
    { key: 'households',     url: `http://household-service/internal/users/${userId}/export` },
    { key: 'transactions',   url: `http://transaction-service/internal/users/${userId}/export` },
    { key: 'notifications',  url: `http://notification-service/internal/users/${userId}/export` },
    { key: 'activity',       url: `http://audit-service/internal/users/${userId}/export` },
    { key: 'exportHistory',  url: `http://report-service/internal/users/${userId}/export` },
    { key: 'billing',        url: `http://billing-service/internal/users/${userId}/export` },
  ]

  const results = await Promise.allSettled(
    targets.map(t => this.httpClient.get(t.url))
  )

  const data: Record<string, unknown> = {}
  for (const [i, result] of results.entries()) {
    data[targets[i].key] = result.status === 'fulfilled'
      ? result.value.data
      : { error: 'Data temporarily unavailable' }
  }

  return {
    exportedAt: new Date().toISOString(),
    userId,
    profile: await this.users.findById(userId),
    ...data,
  }
}
```

Response is returned as a JSON file download:

```typescript
@Get('me/data-export')
async dataExport(@Req() req, @Res() res: Response) {
  const data = await this.authService.exportUserData(req.user.sub)
  res
    .setHeader('Content-Type', 'application/json')
    .setHeader('Content-Disposition', `attachment; filename="my-data-${Date.now()}.json"`)
    .json(data)
}
```

**Security note:** `/internal/*` routes are only reachable within the Docker Compose network — api-gateway is the only service with a public Traefik label. The `x-internal-secret` guard is an extra layer in case of misconfiguration.

---

### 🟡 Audit log entries must be anonymized on account deletion

Audit logs reference the actor's name. After `user.deleted`, those name references are PII that should not remain.

**Why not store pre-formatted strings:**

Storing `"Kim added transaction #123"` means anonymization requires string replacement — fragile, locale-dependent, breaks if names contain special characters. Instead, store structured data and format the message at read time.

**`activity_logs` table schema:**

```
id           uuid
householdId  uuid
userId       uuid?     ← null after account deletion
actorName    string    ← name denormalized at write time; overwritten to 'Deleted user' on deletion
action       string    ← e.g. 'transaction.created'
metadata     jsonb     ← { transactionId, amount, categoryId, ... }
createdAt    timestamp
```

At read time, the frontend formats: `"${actorName} added a transaction"` using `action` as the template key. If `actorName` is `'Deleted user'`, it renders as "Deleted user added a transaction" — no PII, historically coherent.

**audit-service consumer for `user.deleted`:**

```typescript
@EventPattern(USER_DELETED)
async onUserDeleted(@Payload() event: UserDeletedEvent) {
  await this.activityLogs.update(
    { userId: event.userId },
    { userId: null, actorName: 'Deleted user' },
  )
}
```

Two fields updated atomically: `userId` nulled (breaks the link to the deleted account), `actorName` overwritten (removes the PII name). The rest of the log entry — household, action, metadata, timestamp — is retained for historical accuracy.

**What about `metadata`?** Transaction IDs, category IDs in `metadata` are system identifiers, not PII — they can stay. If the transaction itself is also deleted (via `household.deleted` cascade), the ID becomes a dangling reference but that is not a GDPR concern.

---

### 🟡 No email notification opt-out

Budget alerts and other emails are sent without a documented opt-out. Required under GDPR for non-transactional emails.

**Not all emails can be opted out:**

| Email type              | Category          | Can opt out?               |
| ----------------------- | ----------------- | -------------------------- |
| Welcome email           | Transactional     | ❌ — contractual necessity |
| Payment failed          | Transactional     | ❌ — contractual necessity |
| Invitation email        | Transactional     | ❌ — user-initiated action |
| Budget warning/exceeded | Alerts            | ✅                         |
| Member joined household | Household updates | ✅                         |

**`notification_preferences` — stored as JSONB on the `users` row in auth-service:**

```typescript
{
  budgetAlerts: boolean; // default: true
  householdUpdates: boolean; // default: true
}
```

JSONB on the existing row avoids a separate table for two fields. Defaults to `{ budgetAlerts: true, householdUpdates: true }` at registration.

**New endpoints in auth-service:**

```
GET  /auth/me/notification-preferences   → returns current preferences
PATCH /auth/me/notification-preferences  → update (body: partial preferences object)
```

**notification-service preference check:**

notification-service calls auth-service via internal HTTP before sending any opt-outable email:

```typescript
async shouldSendEmail(userId: string, eventType: string): Promise<boolean> {
  const transactional = ['user.registered', 'subscription.payment.failed', 'household.invitation.sent']
  if (transactional.includes(eventType)) return true // always send

  const prefs = await this.authClient.get(`/internal/users/${userId}/notification-preferences`)

  if (['budget.threshold.warning', 'budget.threshold.exceeded'].includes(eventType)) {
    return prefs.budgetAlerts
  }
  if (eventType === 'household.member.joined') {
    return prefs.householdUpdates
  }
  return true
}
```

**One-click unsubscribe link in every alert email:**

GDPR requires a visible unsubscribe mechanism in every non-transactional email. Each budget/household alert email includes a footer link:

```
Don't want these emails? Unsubscribe from budget alerts →
```

The link points to `app.familieoya.furevikstrand.cloud/settings/notifications` where the user can toggle preferences without logging in via a signed token (or just require login — acceptable for a portfolio scope).

**Frontend — add Notifications page to `mfe-settings`:**

New settings page between Appearance and Activity log:

| Setting           | Control                            |
| ----------------- | ---------------------------------- |
| Budget alerts     | Toggle (warning + exceeded emails) |
| Household updates | Toggle (member joined/removed)     |

---

## i18n / Locale

### 🔴 Category names stored in Norwegian — not translatable

Categories are seeded with Norwegian names (`Mat`, `Strøm`, etc.) and stored as strings. Brazilian users see Norwegian category names.

**Fix:** Store categories with a `key` alongside the display name. The frontend uses the key to look up the translated name. User-created categories have no key — displayed as typed.

**`categories` table schema:**

```
id          uuid
householdId uuid
key         string?   ← null for user-created categories
name        string    ← English fallback for seeded; user's typed value for custom
createdAt   timestamp
```

**Seed data keys:**

| key             | EN            | NO            | PT             |
| --------------- | ------------- | ------------- | -------------- |
| `food`          | Food          | Mat           | Alimentação    |
| `electricity`   | Electricity   | Strøm         | Eletricidade   |
| `housing`       | Housing       | Bolig         | Moradia        |
| `transport`     | Transport     | Transport     | Transporte     |
| `childcare`     | Childcare     | Barnepass     | Creche         |
| `healthcare`    | Healthcare    | Helse         | Saúde          |
| `clothing`      | Clothing      | Klær          | Roupas         |
| `entertainment` | Entertainment | Underholdning | Entretenimento |
| `dining_out`    | Dining out    | Restauranter  | Restaurante    |
| `savings`       | Savings       | Sparing       | Poupança       |

**`libs/i18n` file structure:**

```
libs/i18n/
├── locales/
│   ├── en/
│   │   └── categories.json   ← { "food": "Food", "electricity": "Electricity", ... }
│   ├── no/
│   │   └── categories.json   ← { "food": "Mat", "electricity": "Strøm", ... }
│   └── pt/
│       └── categories.json   ← { "food": "Alimentação", "electricity": "Eletricidade", ... }
```

**Frontend lookup (web):**

```typescript
// libs/i18n/src/getCategoryName.ts
export function getCategoryName(category: Category, t: TFunction): string {
  if (category.key) {
    return t(`categories.${category.key}`); // translated
  }
  return category.name; // user-typed, as-is
}
```

Used wherever a category name is rendered — transaction list, budget status, reports, charts.

**Mobile (Flutter ARB):**

```
apps/mobile/lib/l10n/
├── app_en.arb   "categoriesFood": "Food", "categoriesElectricity": "Electricity", ...
├── app_no.arb   "categoriesFood": "Mat",  "categoriesElectricity": "Strøm", ...
└── app_pt.arb   "categoriesFood": "Alimentação", ...
```

```dart
String getCategoryName(Category category, AppLocalizations l10n) {
  if (category.key == null) return category.name;
  switch (category.key) {
    case 'food': return l10n.categoriesFood;
    case 'electricity': return l10n.categoriesElectricity;
    // ...
    default: return category.name; // unknown key fallback
  }
}
```

**API response shape** — always return both fields so clients apply their own translation:

```json
{ "id": "uuid", "householdId": "uuid", "key": "food", "name": "Food" }
```

For user-created: `"key": null, "name": "Kim's custom category"`

---

### 🟡 User language preference not synced to backend

Mobile locale is stored in `flutter_secure_storage`, web locale in `localStorage`. Budget alert emails always arrive in a fixed language (currently unspecified).

**`preferredLanguage` field on `users` table in auth-service:**

```
preferredLanguage  string  ← 'en' | 'no' | 'pt', default 'en'
```

Updated via `PATCH /auth/me { preferredLanguage }`. Already in the endpoint spec.

**Bootstrapping — welcome email language:**

The welcome email fires from `user.registered` before the user has a chance to set their language. Include `preferredLanguage` in the event payload so notification-service has it immediately:

```typescript
export interface UserRegisteredEvent extends BaseEvent {
  userId: string;
  email: string;
  name: string;
  preferredLanguage: 'en' | 'no' | 'pt'; // browser/device detected at registration
}
```

**How notification-service gets the language for later emails:**

It already calls `GET /internal/users/:userId/notification-preferences` before sending opt-outable emails. Extend that response to include `preferredLanguage` — one call, two pieces of info:

```typescript
// GET /internal/users/:userId/notification-preferences
{
  budgetAlerts: true,
  householdUpdates: true,
  preferredLanguage: 'pt',
}
```

**notification-service email templates:**

```
notification-service/src/templates/
├── welcome/           en.hbs  no.hbs  pt.hbs
├── budget-warning/    en.hbs  no.hbs  pt.hbs
├── budget-exceeded/   en.hbs  no.hbs  pt.hbs
└── member-joined/     en.hbs  no.hbs  pt.hbs
```

Template selected as: `templates/${eventType}/${preferredLanguage}.hbs`

**Web — first-load detection (before login):**

```typescript
function detectLanguage(): 'en' | 'no' | 'pt' {
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith('nb') || lang.startsWith('nn') || lang.startsWith('no'))
    return 'no';
  if (lang.startsWith('pt')) return 'pt';
  return 'en';
}
```

After login, `GET /auth/me` returns `preferredLanguage` — server value overrides browser detection.

**Web — syncing on language change:**

```typescript
i18next.on('languageChanged', async (lang) => {
  if (isLoggedIn()) {
    await apiClient.patch('/auth/me', { preferredLanguage: lang });
  }
  // if not logged in: localStorage only, synced after login via GET /auth/me
});
```

**Mobile — syncing on language change:**

```dart
// In settings screen, when user picks a language
await authApi.updateProfile(preferredLanguage: selectedLang);
await secureStorage.write(key: 'preferredLanguage', value: selectedLang);
ref.read(localeProvider.notifier).setLocale(Locale(selectedLang));
```

On app start: read `preferredLanguage` from `secureStorage` first for immediate display. After login, fetch `GET /auth/me` and apply the server value if different.

---

### 🟡 Date formatting uses browser/device locale, not app locale

`Intl.DateTimeFormat` and `Intl.NumberFormat` default to the system locale, not the selected app language. A Brazilian user who switches to English still sees `dd/MM/yyyy` dates and R$ currency symbols.

**Fix — shared formatters in `libs/i18n`:**

```typescript
// libs/i18n/src/formatters.ts

export function formatDate(date: Date | string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatCurrency(
  amount: number,
  locale: string,
  currency: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency, // household.currency — 'NOK', 'BRL', 'USD'
    minimumFractionDigits: 2,
  }).format(amount / 100); // amounts stored in smallest unit (øre/centavos/cents)
}
```

Used throughout all MFEs:

```typescript
const { i18n } = useTranslation();
const { household } = useHousehold();

formatDate(transaction.date, i18n.language);
formatCurrency(transaction.amount, i18n.language, household.currency);
```

`i18n.language` is the active app language (`'en'`, `'no'`, `'pt'`) — not `navigator.language`.

**Flutter equivalent:**

```dart
import 'package:intl/intl.dart';

String formatDate(DateTime date, String locale) =>
    DateFormat.yMd(locale).format(date);

String formatCurrency(int amount, String locale, String currency) =>
    NumberFormat.currency(locale: locale, symbol: currencySymbol(currency))
        .format(amount / 100);
```

Pass `AppLocalizations.of(context).localeName` as the locale — not `Platform.localeName`.

**The two rules:**

1. Never call `Intl.DateTimeFormat()` or `Intl.NumberFormat()` without an explicit locale
2. Never use `navigator.language` or `Platform.localeName` — always use the app's active language from i18next / `AppLocalizations`

---

## Mobile

### 🟡 Optimistic UI rollback on quick-add failure

The transaction is shown immediately before server confirmation. If the request fails (offline, plan limit hit), there is no rollback.

**Riverpod notifier — optimistic add with rollback:**

```dart
class TransactionListNotifier extends AsyncNotifier<List<Transaction>> {
  @override
  Future<List<Transaction>> build() => _api.fetchTransactions();

  Future<void> addTransaction(CreateTransactionInput input) async {
    // Temporary ID marks the optimistic entry
    final tempId = 'temp_${DateTime.now().millisecondsSinceEpoch}';
    final optimistic = Transaction.optimistic(id: tempId, input: input);

    // 1. Add immediately — UI shows it at once
    state = AsyncData([optimistic, ...state.value ?? []]);

    try {
      final created = await _api.createTransaction(input);
      // 2. Replace temp entry with the real one from the server
      state = AsyncData([
        created,
        ...state.value!.where((t) => t.id != tempId),
      ]);
    } catch (err) {
      // 3. Remove the optimistic entry — as if it never happened
      state = AsyncData(state.value!.where((t) => t.id != tempId).toList());
      rethrow; // let the UI layer handle the error message
    }
  }
}
```

**UI layer — SnackBar + retry with pre-filled sheet:**

```dart
Future<void> _submit(CreateTransactionInput input) async {
  Navigator.pop(context); // close bottom sheet

  try {
    await ref.read(transactionListProvider.notifier).addTransaction(input);
  } on DioException catch (e) {
    if (!mounted) return;

    final message = e.response?.statusCode == 403
        ? l10n.transactionLimitReached   // plan limit hit
        : l10n.transactionSaveFailed;    // offline / server error

    final action = e.response?.statusCode == 403
        ? SnackBarAction(label: l10n.upgrade, onPressed: _openBillingScreen)
        : SnackBarAction(label: l10n.retry, onPressed: () => _openAddSheet(prefilled: input));

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), action: action),
    );
  }
}
```

**`_openAddSheet(prefilled: input)`** — the bottom sheet accepts an optional `CreateTransactionInput? initialValues`. If provided, all fields are pre-filled and the keyboard auto-focuses the amount field. The user sees their data intact and just taps Save again.

**Error distinction:**

| `DioException`        | statusCode | Message                                  | Action        |
| --------------------- | ---------- | ---------------------------------------- | ------------- |
| No response (offline) | null       | "Could not save — check connection"      | Retry         |
| 403                   | 403        | "Monthly limit reached. Upgrade to Pro." | Go to billing |
| 5xx                   | 5xx        | "Something went wrong. Try again."       | Retry         |

**`Transaction.optimistic()` factory:**

```dart
factory Transaction.optimistic({
  required String id,
  required CreateTransactionInput input,
}) => Transaction(
  id: id,
  isOptimistic: true,   // used to show a loading indicator on the tile
  amount: input.amount,
  categoryId: input.categoryId,
  date: input.date ?? DateTime.now(),
  type: input.type,
  description: input.description,
);
```

### 🟡 Push notifications (FCM) absent

Budget alerts and invitations only arrive by email. On mobile, users have no on-device signal when the app is backgrounded.

**Phase 9 stretch goal — not required for MVP.**

**Device token storage — `device_tokens` table in auth-service:**

```
id         uuid
userId     uuid
token      string     ← FCM token
platform   string     ← 'android' | 'ios'
updatedAt  timestamp
```

One row per device. A user with the app on two phones has two rows.

**Flutter — register token on login:**

```dart
// After successful login
final token = await FirebaseMessaging.instance.getToken();
if (token != null) {
  await authApi.registerDeviceToken(token, platform: Platform.isIOS ? 'ios' : 'android');
}

// Handle token rotation (FCM can issue new tokens)
FirebaseMessaging.instance.onTokenRefresh.listen((newToken) {
  authApi.registerDeviceToken(newToken, ...);
});
```

`POST /auth/device-tokens` — upserts by `(userId, platform)` so rotating tokens don't accumulate.

**notification-service — FCM fan-out:**

```typescript
async sendPushNotification(userId: string, title: string, body: string, data?: Record<string, string>) {
  const tokens = await this.authClient.get(`/internal/users/${userId}/device-tokens`)
  if (!tokens.length) return

  const response = await this.firebaseAdmin.messaging().sendEachForMulticast({
    tokens: tokens.map(t => t.token),
    notification: { title, body },
    data,
  })

  // Clean up expired/invalid tokens
  response.responses.forEach((res, i) => {
    if (!res.success && res.error?.code === 'messaging/registration-token-not-registered') {
      this.authClient.delete(`/internal/device-tokens/${tokens[i].token}`)
    }
  })
}
```

**Which events trigger push (in addition to email):**

| Event                       | Push title        | Push body                                   |
| --------------------------- | ----------------- | ------------------------------------------- |
| `budget.threshold.warning`  | "Budget warning"  | "You've used 80% of your [Category] budget" |
| `budget.threshold.exceeded` | "Budget exceeded" | "You've exceeded your [Category] budget"    |
| `household.invitation.sent` | "New invitation"  | "[Name] invited you to join [Household]"    |
| `household.member.joined`   | "New member"      | "[Name] joined your household"              |

**Flutter foreground handling:**

FCM shows system notifications automatically when the app is backgrounded. When the app is in the foreground, `FirebaseMessaging.onMessage` fires — handle it with a local notification or in-app banner:

```dart
FirebaseMessaging.onMessage.listen((message) {
  // Show in-app banner via local_notifications package
  // or just refresh the notifications list
  ref.invalidate(notificationListProvider);
});
```

**New internal endpoint on auth-service:**

```
GET  /internal/users/:userId/device-tokens  → list tokens for this user
POST /auth/device-tokens                    → register/upsert device token
DELETE /internal/device-tokens/:token       → remove expired token
```

### 🟡 Deep link + wrong household context

If a logged-in user (household A) taps an invitation link to household B, they join B but the app is still sending `X-Household-ID: <household-A-id>` on every request.

**This is simpler to fix than it appears.** Because `householdId` was removed from the JWT in favour of the `X-Household-ID` header, there is no token to re-issue. The fix is purely client-side: after accepting the invitation, update the active household in client state before navigating.

**Web — after `POST /invitations/:token/accept` succeeds:**

```typescript
const { householdId } = await apiClient.post(`/invitations/${token}/accept`);

// Update active household in React context + localStorage
setActiveHousehold(householdId);
localStorage.setItem('activeHouseholdId', householdId);
// All subsequent requests now send X-Household-ID: <household-B-id>

router.push('/dashboard');
```

**Mobile — after `POST /invitations/:token/accept` succeeds:**

```dart
final newHouseholdId = response['householdId'];

await secureStorage.write(key: 'activeHouseholdId', value: newHouseholdId);
ref.read(activeHouseholdProvider.notifier).set(newHouseholdId);
// Dio interceptor reads activeHouseholdId on each request — updating storage is enough

context.go('/dashboard');
```

**`POST /invitations/:token/accept` must return the joined household:**

```json
{ "householdId": "uuid-of-household-B", "householdName": "Hansen Family" }
```

The spec currently doesn't define a response body for this endpoint — without it the client doesn't know which household it just joined and can't update the active context.
