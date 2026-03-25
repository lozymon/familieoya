import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { resetDatabase } from '@familieoya/testing';

// Integration tests hit real PostgreSQL + real RabbitMQ.
// Start infrastructure: docker compose -f docker-compose.test.yml up -d --wait
// Required env vars (set in .env.test):
//   TRANSACTION_DATABASE_URL=postgres://test:test@localhost:5435/transaction_test
//   RABBITMQ_URL=amqp://localhost:5673
//   INTERNAL_SECRET=test-internal-secret

const HOUSEHOLD_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const USER_A = {
  id: 'bbbbbbbb-0000-0000-0000-000000000002',
  email: 'a@example.com',
};
const INTERNAL_SECRET = process.env.INTERNAL_SECRET ?? 'test-internal-secret';

function asUser(user: { id: string }, householdId = HOUSEHOLD_ID) {
  return {
    'x-user-id': user.id,
    'x-household-id': householdId,
    'x-internal-secret': INTERNAL_SECRET,
  };
}

describe('transaction-service — CRUD + events', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TRANSACTION_DATABASE_URL;

    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    dataSource = module.get<DataSource>(getDataSourceToken());
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Categories ────────────────────────────────────────────────────────────

  describe('GET /categories — seeded categories', () => {
    it('returns 10 seeded categories on first GET for a household', async () => {
      const cats = await request(app.getHttpServer())
        .get('/categories')
        .set(asUser(USER_A));

      expect(cats.status).toBe(200);
      expect(cats.body).toHaveLength(10);
      const keys = cats.body.map((c: { key: string }) => c.key);
      expect(keys).toContain('food');
      expect(keys).toContain('electricity');
      expect(keys).toContain('housing');
    });

    it('does not double-seed on subsequent GET calls', async () => {
      await request(app.getHttpServer()).get('/categories').set(asUser(USER_A));
      await request(app.getHttpServer()).get('/categories').set(asUser(USER_A));

      const cats = await request(app.getHttpServer())
        .get('/categories')
        .set(asUser(USER_A));

      expect(cats.body).toHaveLength(10);
    });
  });

  describe('Category CRUD', () => {
    it('creates a user-defined category', async () => {
      const res = await request(app.getHttpServer())
        .post('/categories')
        .set(asUser(USER_A))
        .send({ name: 'Gym' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.key).toBeNull();
      expect(res.body.name).toBe('Gym');
      expect(res.body.householdId).toBe(HOUSEHOLD_ID);
    });

    it('rejects creating a category without a name', async () => {
      const res = await request(app.getHttpServer())
        .post('/categories')
        .set(asUser(USER_A))
        .send({});

      expect(res.status).toBe(400);
    });

    it('can rename a user-defined category', async () => {
      const create = await request(app.getHttpServer())
        .post('/categories')
        .set(asUser(USER_A))
        .send({ name: 'Old name' });

      const patch = await request(app.getHttpServer())
        .patch(`/categories/${create.body.id}`)
        .set(asUser(USER_A))
        .send({ name: 'New name' });

      expect(patch.status).toBe(200);
      expect(patch.body.name).toBe('New name');
    });

    it('can delete a user-defined category', async () => {
      const create = await request(app.getHttpServer())
        .post('/categories')
        .set(asUser(USER_A))
        .send({ name: 'Temp' });

      const del = await request(app.getHttpServer())
        .delete(`/categories/${create.body.id}`)
        .set(asUser(USER_A));

      expect(del.status).toBe(204);
    });

    it('cannot rename a seeded (keyed) category', async () => {
      const cats = await request(app.getHttpServer())
        .get('/categories')
        .set(asUser(USER_A));

      const foodCat = cats.body.find((c: { key: string }) => c.key === 'food');
      expect(foodCat).toBeDefined();

      const patch = await request(app.getHttpServer())
        .patch(`/categories/${foodCat.id}`)
        .set(asUser(USER_A))
        .send({ name: 'Renamed food' });

      expect(patch.status).toBe(409);
    });
  });

  // ── Transactions ──────────────────────────────────────────────────────────

  describe('Transaction CRUD', () => {
    let categoryId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/categories')
        .set(asUser(USER_A))
        .send({ name: 'Food' });
      categoryId = res.body.id as string;
    });

    it('creates a transaction', async () => {
      const res = await request(app.getHttpServer())
        .post('/transactions')
        .set(asUser(USER_A))
        .send({
          type: 'expense',
          amount: 15000,
          categoryId,
          description: 'Grocery run',
          date: '2026-03-01',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.amount).toBe(15000);
      expect(res.body.type).toBe('expense');
      expect(res.body.date).toBe('2026-03-01');
    });

    it('rejects a float amount', async () => {
      const res = await request(app.getHttpServer())
        .post('/transactions')
        .set(asUser(USER_A))
        .send({
          type: 'expense',
          amount: 150.5,
          categoryId,
          date: '2026-03-01',
        });

      expect(res.status).toBe(400);
    });

    it('rejects a zero amount', async () => {
      const res = await request(app.getHttpServer())
        .post('/transactions')
        .set(asUser(USER_A))
        .send({ type: 'expense', amount: 0, categoryId, date: '2026-03-01' });

      expect(res.status).toBe(400);
    });

    it('rejects an invalid category', async () => {
      const res = await request(app.getHttpServer())
        .post('/transactions')
        .set(asUser(USER_A))
        .send({
          type: 'expense',
          amount: 100,
          categoryId: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
          date: '2026-03-01',
        });

      expect(res.status).toBe(404);
    });

    it('lists transactions for household', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set(asUser(USER_A))
        .send({
          type: 'expense',
          amount: 5000,
          categoryId,
          date: '2026-03-10',
        });

      await request(app.getHttpServer())
        .post('/transactions')
        .set(asUser(USER_A))
        .send({
          type: 'income',
          amount: 200000,
          categoryId,
          date: '2026-03-15',
        });

      const res = await request(app.getHttpServer())
        .get('/transactions')
        .set(asUser(USER_A));

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('filters transactions by month', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set(asUser(USER_A))
        .send({
          type: 'expense',
          amount: 5000,
          categoryId,
          date: '2026-03-10',
        });

      await request(app.getHttpServer())
        .post('/transactions')
        .set(asUser(USER_A))
        .send({
          type: 'expense',
          amount: 3000,
          categoryId,
          date: '2026-02-20',
        });

      const res = await request(app.getHttpServer())
        .get('/transactions?month=2026-03')
        .set(asUser(USER_A));

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].date).toBe('2026-03-10');
    });

    it('updates a transaction', async () => {
      const create = await request(app.getHttpServer())
        .post('/transactions')
        .set(asUser(USER_A))
        .send({
          type: 'expense',
          amount: 5000,
          categoryId,
          date: '2026-03-01',
        });

      const patch = await request(app.getHttpServer())
        .patch(`/transactions/${create.body.id}`)
        .set(asUser(USER_A))
        .send({ amount: 7500 });

      expect(patch.status).toBe(200);
      expect(patch.body.amount).toBe(7500);
    });

    it('deletes a transaction', async () => {
      const create = await request(app.getHttpServer())
        .post('/transactions')
        .set(asUser(USER_A))
        .send({
          type: 'expense',
          amount: 5000,
          categoryId,
          date: '2026-03-01',
        });

      const del = await request(app.getHttpServer())
        .delete(`/transactions/${create.body.id}`)
        .set(asUser(USER_A));

      expect(del.status).toBe(204);

      const get = await request(app.getHttpServer())
        .get(`/transactions/${create.body.id}`)
        .set(asUser(USER_A));

      expect(get.status).toBe(404);
    });

    it('bulk deletes transactions', async () => {
      const t1 = await request(app.getHttpServer())
        .post('/transactions')
        .set(asUser(USER_A))
        .send({
          type: 'expense',
          amount: 5000,
          categoryId,
          date: '2026-03-01',
        });

      const t2 = await request(app.getHttpServer())
        .post('/transactions')
        .set(asUser(USER_A))
        .send({
          type: 'expense',
          amount: 3000,
          categoryId,
          date: '2026-03-02',
        });

      const del = await request(app.getHttpServer())
        .delete('/transactions/bulk')
        .set(asUser(USER_A))
        .send({ ids: [t1.body.id, t2.body.id] });

      expect(del.status).toBe(204);

      const list = await request(app.getHttpServer())
        .get('/transactions')
        .set(asUser(USER_A));

      expect(list.body).toHaveLength(0);
    });

    it('returns 400 for bulk delete with empty ids array', async () => {
      const res = await request(app.getHttpServer())
        .delete('/transactions/bulk')
        .set(asUser(USER_A))
        .send({ ids: [] });

      expect(res.status).toBe(400);
    });
  });

  // ── Summary endpoint ──────────────────────────────────────────────────────

  describe('GET /transactions/summary', () => {
    it('returns totals by category and type for the given month', async () => {
      const catRes = await request(app.getHttpServer())
        .post('/categories')
        .set(asUser(USER_A))
        .send({ name: 'Food' });
      const foodId = catRes.body.id as string;

      const catRes2 = await request(app.getHttpServer())
        .post('/categories')
        .set(asUser(USER_A))
        .send({ name: 'Transport' });
      const transportId = catRes2.body.id as string;

      await request(app.getHttpServer())
        .post('/transactions')
        .set(asUser(USER_A))
        .send({
          type: 'expense',
          amount: 10000,
          categoryId: foodId,
          date: '2026-03-01',
        });

      await request(app.getHttpServer())
        .post('/transactions')
        .set(asUser(USER_A))
        .send({
          type: 'expense',
          amount: 5000,
          categoryId: foodId,
          date: '2026-03-15',
        });

      await request(app.getHttpServer())
        .post('/transactions')
        .set(asUser(USER_A))
        .send({
          type: 'expense',
          amount: 3000,
          categoryId: transportId,
          date: '2026-03-10',
        });

      // Different month — should NOT appear in summary
      await request(app.getHttpServer())
        .post('/transactions')
        .set(asUser(USER_A))
        .send({
          type: 'expense',
          amount: 9999,
          categoryId: foodId,
          date: '2026-02-28',
        });

      const res = await request(app.getHttpServer())
        .get('/transactions/summary?month=2026-03')
        .set(asUser(USER_A));

      expect(res.status).toBe(200);

      const foodRow = res.body.find(
        (r: { categoryId: string }) => r.categoryId === foodId,
      );
      const transportRow = res.body.find(
        (r: { categoryId: string }) => r.categoryId === transportId,
      );

      expect(foodRow.total).toBe(15000);
      expect(transportRow.total).toBe(3000);
    });

    it('returns 400 for invalid month format', async () => {
      const res = await request(app.getHttpServer())
        .get('/transactions/summary?month=March-2026')
        .set(asUser(USER_A));

      expect(res.status).toBe(400);
    });
  });

  // ── Internal GDPR endpoint ────────────────────────────────────────────────

  describe('GET /internal/users/:userId/export', () => {
    it('returns all transactions for the user', async () => {
      const catRes = await request(app.getHttpServer())
        .post('/categories')
        .set(asUser(USER_A))
        .send({ name: 'Food' });
      const categoryId = catRes.body.id as string;

      await request(app.getHttpServer())
        .post('/transactions')
        .set(asUser(USER_A))
        .send({
          type: 'expense',
          amount: 5000,
          categoryId,
          date: '2026-03-01',
        });

      const res = await request(app.getHttpServer())
        .get(`/internal/users/${USER_A.id}/export`)
        .set({ 'x-internal-secret': INTERNAL_SECRET });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].userId).toBe(USER_A.id);
    });

    it('returns 401 without x-internal-secret', async () => {
      const res = await request(app.getHttpServer()).get(
        '/internal/users/any-user/export',
      );

      expect(res.status).toBe(401);
    });
  });
});
