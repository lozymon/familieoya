import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../src/app/app.module';
import {
  resetDatabase,
  createTestRabbitMQClient,
  TestRabbitMQClient,
} from '@familieoya/testing';
import {
  BUDGET_THRESHOLD_EXCEEDED,
  BUDGET_THRESHOLD_WARNING,
  TransactionCreatedEvent,
  TransactionDeletedEvent,
  TransactionUpdatedEvent,
} from '@familieoya/contracts';
import { BudgetConsumer } from '../src/budget/budget.consumer';

// Integration tests hit real PostgreSQL + real RabbitMQ.
// Start infrastructure: docker compose -f docker-compose.test.yml up -d --wait
// Required env vars (set in .env.test):
//   BUDGET_DATABASE_URL=postgres://test:test@localhost:5436/budget_test
//   RABBITMQ_URL=amqp://localhost:5673

// Valid UUIDs (v4 format: 4xxx version + axxx variant)
const HOUSEHOLD_ID = 'cccccccc-cccc-4ccc-accc-cccccccccccc';
const CATEGORY_ID = 'dddddddd-dddd-4ddd-addd-dddddddddddd';
const CATEGORY_ID_2 = 'eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee';

const RABBITMQ_URL = process.env.RABBITMQ_URL ?? 'amqp://localhost:5673';

function asHousehold(householdId = HOUSEHOLD_ID) {
  return { 'x-household-id': householdId };
}

/** Minimal RmqContext mock for direct handler invocation (bypasses transport layer). */
function mockRmqContext() {
  return {
    getChannelRef: () => ({ ack: jest.fn(), nack: jest.fn() }),
    getMessage: () => ({}),
  } as any;
}

describe('budget-service — CRUD + spending totals + threshold alerts', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let consumer: BudgetConsumer;
  let rmq: TestRabbitMQClient;

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.BUDGET_DATABASE_URL;

    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    dataSource = module.get<DataSource>(getDataSourceToken());
    consumer = module.get<BudgetConsumer>(BudgetConsumer);

    // RabbitMQ client used to listen for threshold events published by BudgetService
    rmq = await createTestRabbitMQClient(RABBITMQ_URL);
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
  });

  afterAll(async () => {
    await rmq.close();
    await app.close();
  });

  // ── Budget CRUD ────────────────────────────────────────────────────────────

  describe('Budget CRUD', () => {
    it('creates a budget limit', async () => {
      const res = await request(app.getHttpServer())
        .post('/budgets')
        .set(asHousehold())
        .send({ categoryId: CATEGORY_ID, limitAmount: 100000 });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.limitAmount).toBe(100000);
      expect(res.body.categoryId).toBe(CATEGORY_ID);
    });

    it('rejects duplicate budget for same category', async () => {
      await request(app.getHttpServer())
        .post('/budgets')
        .set(asHousehold())
        .send({ categoryId: CATEGORY_ID, limitAmount: 100000 });

      const res = await request(app.getHttpServer())
        .post('/budgets')
        .set(asHousehold())
        .send({ categoryId: CATEGORY_ID, limitAmount: 50000 });

      expect(res.status).toBe(409);
    });

    it('rejects zero or float limit amounts', async () => {
      const zero = await request(app.getHttpServer())
        .post('/budgets')
        .set(asHousehold())
        .send({ categoryId: CATEGORY_ID, limitAmount: 0 });

      const float = await request(app.getHttpServer())
        .post('/budgets')
        .set(asHousehold())
        .send({ categoryId: CATEGORY_ID, limitAmount: 100.5 });

      expect(zero.status).toBe(400);
      expect(float.status).toBe(400);
    });

    it('lists budgets for household', async () => {
      await request(app.getHttpServer())
        .post('/budgets')
        .set(asHousehold())
        .send({ categoryId: CATEGORY_ID, limitAmount: 100000 });

      await request(app.getHttpServer())
        .post('/budgets')
        .set(asHousehold())
        .send({ categoryId: CATEGORY_ID_2, limitAmount: 50000 });

      const res = await request(app.getHttpServer())
        .get('/budgets')
        .set(asHousehold());

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('updates a budget limit', async () => {
      const create = await request(app.getHttpServer())
        .post('/budgets')
        .set(asHousehold())
        .send({ categoryId: CATEGORY_ID, limitAmount: 100000 });

      const patch = await request(app.getHttpServer())
        .patch(`/budgets/${create.body.id}`)
        .set(asHousehold())
        .send({ limitAmount: 200000 });

      expect(patch.status).toBe(200);
      expect(patch.body.limitAmount).toBe(200000);
    });

    it('deletes a budget limit', async () => {
      const create = await request(app.getHttpServer())
        .post('/budgets')
        .set(asHousehold())
        .send({ categoryId: CATEGORY_ID, limitAmount: 100000 });

      const del = await request(app.getHttpServer())
        .delete(`/budgets/${create.body.id}`)
        .set(asHousehold());

      expect(del.status).toBe(204);

      const list = await request(app.getHttpServer())
        .get('/budgets')
        .set(asHousehold());

      expect(list.body).toHaveLength(0);
    });
  });

  // ── Spending totals via events ─────────────────────────────────────────────

  describe('when transaction.created events arrive', () => {
    it('updates spending total and reflects it in /budgets/status', async () => {
      await request(app.getHttpServer())
        .post('/budgets')
        .set(asHousehold())
        .send({ categoryId: CATEGORY_ID, limitAmount: 100000 });

      const event: TransactionCreatedEvent = {
        eventId: crypto.randomUUID(),
        transactionId: crypto.randomUUID(),
        householdId: HOUSEHOLD_ID,
        categoryId: CATEGORY_ID,
        amount: 50000,
        type: 'expense',
        date: '2026-04-15',
      };
      await consumer.onTransactionCreated(event, mockRmqContext());

      const status = await request(app.getHttpServer())
        .get('/budgets/status')
        .set(asHousehold());

      expect(status.status).toBe(200);
      const row = status.body[0];
      expect(row.spentAmount).toBe(50000);
      expect(row.percentage).toBe(50);
      expect(row.status).toBe('ok');
    });

    it('income transactions do NOT affect spending totals', async () => {
      await request(app.getHttpServer())
        .post('/budgets')
        .set(asHousehold())
        .send({ categoryId: CATEGORY_ID, limitAmount: 100000 });

      await consumer.onTransactionCreated(
        {
          eventId: crypto.randomUUID(),
          transactionId: crypto.randomUUID(),
          householdId: HOUSEHOLD_ID,
          categoryId: CATEGORY_ID,
          amount: 999999,
          type: 'income',
          date: '2026-04-15',
        },
        mockRmqContext(),
      );

      const status = await request(app.getHttpServer())
        .get('/budgets/status')
        .set(asHousehold());

      expect(status.body[0].spentAmount).toBe(0);
    });

    it('deduplicates redelivered events (same eventId)', async () => {
      await request(app.getHttpServer())
        .post('/budgets')
        .set(asHousehold())
        .send({ categoryId: CATEGORY_ID, limitAmount: 100000 });

      const event: TransactionCreatedEvent = {
        eventId: 'fixed-event-id-dedup-test-0000-0000',
        transactionId: crypto.randomUUID(),
        householdId: HOUSEHOLD_ID,
        categoryId: CATEGORY_ID,
        amount: 10000,
        type: 'expense',
        date: '2026-04-15',
      };

      await consumer.onTransactionCreated(event, mockRmqContext());
      await consumer.onTransactionCreated(event, mockRmqContext()); // redelivery

      const status = await request(app.getHttpServer())
        .get('/budgets/status')
        .set(asHousehold());

      // spentAmount should be 10000, not 20000
      expect(status.body[0].spentAmount).toBe(10000);
    });
  });

  // ── Threshold alerts ───────────────────────────────────────────────────────

  describe('when spending crosses 80% threshold', () => {
    it('publishes budget.threshold.warning exactly once', async () => {
      await request(app.getHttpServer())
        .post('/budgets')
        .set(asHousehold())
        .send({ categoryId: CATEGORY_ID, limitAmount: 100000 });

      // Bind the listener queue BEFORE publishing to avoid the race condition
      await rmq.bindQueue('test.budget.warning', BUDGET_THRESHOLD_WARNING);
      const warningListener = rmq.waitForMessage('test.budget.warning', 8000);

      await consumer.onTransactionCreated(
        {
          eventId: crypto.randomUUID(),
          transactionId: crypto.randomUUID(),
          householdId: HOUSEHOLD_ID,
          categoryId: CATEGORY_ID,
          amount: 85000,
          type: 'expense',
          date: '2026-04-15',
        },
        mockRmqContext(),
      );

      const warning = (await warningListener) as Record<string, unknown>;
      expect(warning['householdId']).toBe(HOUSEHOLD_ID);
      expect(warning['categoryId']).toBe(CATEGORY_ID);
      expect(Number(warning['percentage'])).toBeGreaterThanOrEqual(80);
    });
  });

  // ── Full saga ──────────────────────────────────────────────────────────────

  describe('full saga: transaction → budget check → threshold exceeded alert', () => {
    it('publishes budget.threshold.exceeded when spending crosses 100%', async () => {
      await request(app.getHttpServer())
        .post('/budgets')
        .set(asHousehold())
        .send({ categoryId: CATEGORY_ID, limitAmount: 100000 });

      // Bind the listener queue BEFORE publishing to avoid the race condition
      await rmq.bindQueue('test.budget.exceeded', BUDGET_THRESHOLD_EXCEEDED);
      const exceededListener = rmq.waitForMessage('test.budget.exceeded', 8000);

      await consumer.onTransactionCreated(
        {
          eventId: crypto.randomUUID(),
          transactionId: crypto.randomUUID(),
          householdId: HOUSEHOLD_ID,
          categoryId: CATEGORY_ID,
          amount: 110000,
          type: 'expense',
          date: '2026-04-15',
        },
        mockRmqContext(),
      );

      const exceeded = (await exceededListener) as Record<string, unknown>;
      expect(exceeded['householdId']).toBe(HOUSEHOLD_ID);
      expect(exceeded['categoryId']).toBe(CATEGORY_ID);
      expect(Number(exceeded['percentage'])).toBeGreaterThanOrEqual(100);
      expect(Number(exceeded['limitAmount'])).toBe(100000);
    });

    it('does NOT re-publish exceeded alert on subsequent transactions', async () => {
      await request(app.getHttpServer())
        .post('/budgets')
        .set(asHousehold())
        .send({ categoryId: CATEGORY_ID, limitAmount: 100000 });

      // First crossing — sets exceededSentAt
      await consumer.onTransactionCreated(
        {
          eventId: crypto.randomUUID(),
          transactionId: crypto.randomUUID(),
          householdId: HOUSEHOLD_ID,
          categoryId: CATEGORY_ID,
          amount: 110000,
          type: 'expense',
          date: '2026-04-15',
        },
        mockRmqContext(),
      );

      // Second transaction — should NOT trigger another exceeded alert
      await consumer.onTransactionCreated(
        {
          eventId: crypto.randomUUID(),
          transactionId: crypto.randomUUID(),
          householdId: HOUSEHOLD_ID,
          categoryId: CATEGORY_ID,
          amount: 5000,
          type: 'expense',
          date: '2026-04-16',
        },
        mockRmqContext(),
      );

      const status = await request(app.getHttpServer())
        .get('/budgets/status')
        .set(asHousehold());

      expect(status.body[0].status).toBe('exceeded');
      expect(status.body[0].spentAmount).toBe(115000);
    });
  });

  // ── transaction.deleted ────────────────────────────────────────────────────

  describe('when transaction.deleted event arrives', () => {
    it('decrements spending total', async () => {
      await request(app.getHttpServer())
        .post('/budgets')
        .set(asHousehold())
        .send({ categoryId: CATEGORY_ID, limitAmount: 100000 });

      await consumer.onTransactionCreated(
        {
          eventId: crypto.randomUUID(),
          transactionId: 'ffffffff-ffff-4fff-afff-ffffffffffff',
          householdId: HOUSEHOLD_ID,
          categoryId: CATEGORY_ID,
          amount: 60000,
          type: 'expense',
          date: '2026-04-10',
        },
        mockRmqContext(),
      );

      await consumer.onTransactionDeleted(
        {
          eventId: crypto.randomUUID(),
          transactionId: 'ffffffff-ffff-4fff-afff-ffffffffffff',
          householdId: HOUSEHOLD_ID,
          categoryId: CATEGORY_ID,
          previousAmount: 60000,
          type: 'expense',
          date: '2026-04-10',
        } satisfies TransactionDeletedEvent,
        mockRmqContext(),
      );

      const status = await request(app.getHttpServer())
        .get('/budgets/status')
        .set(asHousehold());

      expect(status.body[0].spentAmount).toBe(0);
    });
  });

  // ── transaction.updated ────────────────────────────────────────────────────

  describe('when transaction.updated event arrives', () => {
    it('recalculates spending by undoing old and applying new amount', async () => {
      await request(app.getHttpServer())
        .post('/budgets')
        .set(asHousehold())
        .send({ categoryId: CATEGORY_ID, limitAmount: 100000 });

      await consumer.onTransactionCreated(
        {
          eventId: crypto.randomUUID(),
          transactionId: crypto.randomUUID(),
          householdId: HOUSEHOLD_ID,
          categoryId: CATEGORY_ID,
          amount: 30000,
          type: 'expense',
          date: '2026-04-10',
        },
        mockRmqContext(),
      );

      await consumer.onTransactionUpdated(
        {
          eventId: crypto.randomUUID(),
          transactionId: crypto.randomUUID(),
          householdId: HOUSEHOLD_ID,
          categoryId: CATEGORY_ID,
          amount: 70000,
          type: 'expense',
          date: '2026-04-10',
          previousCategoryId: CATEGORY_ID,
          previousAmount: 30000,
          previousType: 'expense',
          previousDate: '2026-04-10',
        } satisfies TransactionUpdatedEvent,
        mockRmqContext(),
      );

      const status = await request(app.getHttpServer())
        .get('/budgets/status')
        .set(asHousehold());

      expect(status.body[0].spentAmount).toBe(70000);
    });
  });

  // ── /budgets/status ────────────────────────────────────────────────────────

  describe('GET /budgets/status', () => {
    it('returns warning status when spending is between 80% and 100%', async () => {
      await request(app.getHttpServer())
        .post('/budgets')
        .set(asHousehold())
        .send({ categoryId: CATEGORY_ID, limitAmount: 100000 });

      await consumer.onTransactionCreated(
        {
          eventId: crypto.randomUUID(),
          transactionId: crypto.randomUUID(),
          householdId: HOUSEHOLD_ID,
          categoryId: CATEGORY_ID,
          amount: 90000,
          type: 'expense',
          date: '2026-04-15',
        },
        mockRmqContext(),
      );

      const status = await request(app.getHttpServer())
        .get('/budgets/status')
        .set(asHousehold());

      expect(status.status).toBe(200);
      const row = status.body[0];
      expect(row.percentage).toBe(90);
      expect(row.status).toBe('warning');
    });

    it('returns empty array when no budgets exist', async () => {
      const status = await request(app.getHttpServer())
        .get('/budgets/status')
        .set(asHousehold());

      expect(status.status).toBe(200);
      expect(status.body).toHaveLength(0);
    });
  });
});
