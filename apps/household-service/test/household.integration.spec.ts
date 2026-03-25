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
//   HOUSEHOLD_DATABASE_URL=postgres://test:test@localhost:5434/household_test
//   RABBITMQ_URL=amqp://localhost:5673
//   INTERNAL_SECRET=test-internal-secret

const USER_A = {
  id: 'aaaaaaaa-0000-0000-0000-000000000001',
  email: 'a@example.com',
};
const USER_B = {
  id: 'bbbbbbbb-0000-0000-0000-000000000002',
  email: 'b@example.com',
};
const INTERNAL_SECRET = process.env.INTERNAL_SECRET ?? 'test-internal-secret';

function asUser(user: { id: string; email: string }) {
  return {
    'x-user-id': user.id,
    'x-user-email': user.email,
    'x-internal-secret': INTERNAL_SECRET,
  };
}

describe('household-service — invitation flow', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    // Override DATABASE_URL so the household-service uses its own test DB
    process.env.DATABASE_URL = process.env.HOUSEHOLD_DATABASE_URL;

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

  // ── Household CRUD ───────────────────────────────────────────────────────

  describe('POST /households', () => {
    it('creates a household and makes the creator an admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/households')
        .set(asUser(USER_A))
        .send({ name: 'Hansen Family', currency: 'NOK' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Hansen Family');
      expect(res.body.currency).toBe('NOK');

      // Creator is listed as admin member
      const members = await request(app.getHttpServer())
        .get(`/households/${res.body.id}/members`)
        .set(asUser(USER_A));

      expect(members.body).toHaveLength(1);
      expect(members.body[0].userId).toBe(USER_A.id);
      expect(members.body[0].role).toBe('admin');
    });

    it('returns 400 when currency is not a 3-letter code', async () => {
      const res = await request(app.getHttpServer())
        .post('/households')
        .set(asUser(USER_A))
        .send({ name: 'Test', currency: 'nok' });

      expect(res.status).toBe(400);
    });

    it('rejects PATCH with currency field (immutable — unknown field)', async () => {
      const create = await request(app.getHttpServer())
        .post('/households')
        .set(asUser(USER_A))
        .send({ name: 'Original', currency: 'NOK' });

      // forbidNonWhitelisted: true means unknown fields are rejected, not stripped
      const patch = await request(app.getHttpServer())
        .patch(`/households/${create.body.id}`)
        .set(asUser(USER_A))
        .send({ name: 'Updated', currency: 'BRL' });

      expect(patch.status).toBe(400);
    });

    it('PATCH with only name updates name and preserves currency', async () => {
      const create = await request(app.getHttpServer())
        .post('/households')
        .set(asUser(USER_A))
        .send({ name: 'Original', currency: 'NOK' });

      const patch = await request(app.getHttpServer())
        .patch(`/households/${create.body.id}`)
        .set(asUser(USER_A))
        .send({ name: 'Updated' });

      expect(patch.status).toBe(200);
      expect(patch.body.name).toBe('Updated');
      expect(patch.body.currency).toBe('NOK');
    });
  });

  // ── Invitation flow ──────────────────────────────────────────────────────

  describe('when User A invites User B', () => {
    let householdId: string;
    let token: string;

    beforeEach(async () => {
      // User A creates a household
      const hRes = await request(app.getHttpServer())
        .post('/households')
        .set(asUser(USER_A))
        .send({ name: 'A Family', currency: 'NOK' });
      householdId = hRes.body.id as string;

      // User A sends invitation to User B's email
      const iRes = await request(app.getHttpServer())
        .post(`/households/${householdId}/invitations`)
        .set(asUser(USER_A))
        .send({ email: USER_B.email });
      expect(iRes.status).toBe(201);
      token = iRes.body.token as string;
    });

    it('GET /invitations/:token returns invitation details', async () => {
      const res = await request(app.getHttpServer()).get(
        `/invitations/${token}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(USER_B.email);
      expect(res.body.householdName).toBe('A Family');
      expect(res.body.expiresAt).toBeDefined();
    });

    it('User B accepts → joins the household', async () => {
      const res = await request(app.getHttpServer())
        .post(`/invitations/${token}/accept`)
        .set(asUser(USER_B));

      expect(res.status).toBe(201);
      expect(res.body.householdId).toBe(householdId);
      expect(res.body.householdName).toBe('A Family');

      // Both A and B are now members
      const members = await request(app.getHttpServer())
        .get(`/households/${householdId}/members`)
        .set(asUser(USER_A));

      expect(members.body).toHaveLength(2);
      const userIds = members.body.map((m: { userId: string }) => m.userId);
      expect(userIds).toContain(USER_A.id);
      expect(userIds).toContain(USER_B.id);
    });

    it('returns 403 when wrong user (email mismatch) tries to accept', async () => {
      const WRONG_USER = {
        id: 'cccccccc-0000-0000-0000-000000000003',
        email: 'wrong@example.com',
      };

      const res = await request(app.getHttpServer())
        .post(`/invitations/${token}/accept`)
        .set(asUser(WRONG_USER));

      expect(res.status).toBe(403);
    });

    it('returns 410 when invitation is already used', async () => {
      // First acceptance
      await request(app.getHttpServer())
        .post(`/invitations/${token}/accept`)
        .set(asUser(USER_B));

      // Second attempt
      const res = await request(app.getHttpServer())
        .post(`/invitations/${token}/accept`)
        .set(asUser(USER_B));

      expect(res.status).toBe(410);
    });

    it('returns 410 when invitation token is expired', async () => {
      // Manually expire the invitation via the DB
      await dataSource.query(
        `UPDATE invitations SET "expiresAt" = NOW() - INTERVAL '1 day' WHERE token = $1`,
        [token],
      );

      const res = await request(app.getHttpServer())
        .post(`/invitations/${token}/accept`)
        .set(asUser(USER_B));

      expect(res.status).toBe(410);
    });

    it('returns 404 for an unknown token', async () => {
      const res = await request(app.getHttpServer())
        .post('/invitations/nonexistent-token/accept')
        .set(asUser(USER_B));

      expect(res.status).toBe(404);
    });
  });

  // ── Internal endpoint ────────────────────────────────────────────────────

  describe('GET /internal/households/:householdId/members/:userId', () => {
    it('returns isMember=true for a member', async () => {
      const hRes = await request(app.getHttpServer())
        .post('/households')
        .set(asUser(USER_A))
        .send({ name: 'Test', currency: 'NOK' });

      const res = await request(app.getHttpServer())
        .get(`/internal/households/${hRes.body.id}/members/${USER_A.id}`)
        .set({ 'x-internal-secret': INTERNAL_SECRET });

      expect(res.status).toBe(200);
      expect(res.body.isMember).toBe(true);
    });

    it('returns isMember=false for a non-member', async () => {
      const hRes = await request(app.getHttpServer())
        .post('/households')
        .set(asUser(USER_A))
        .send({ name: 'Test', currency: 'NOK' });

      const res = await request(app.getHttpServer())
        .get(`/internal/households/${hRes.body.id}/members/${USER_B.id}`)
        .set({ 'x-internal-secret': INTERNAL_SECRET });

      expect(res.status).toBe(200);
      expect(res.body.isMember).toBe(false);
    });

    it('returns 401 without x-internal-secret', async () => {
      const res = await request(app.getHttpServer()).get(
        '/internal/households/any-id/members/any-user',
      );

      expect(res.status).toBe(401);
    });
  });

  // ── Role management ──────────────────────────────────────────────────────

  describe('PATCH /households/:id/members/:userId/role', () => {
    it('admin can promote a member to admin', async () => {
      const hRes = await request(app.getHttpServer())
        .post('/households')
        .set(asUser(USER_A))
        .send({ name: 'Test', currency: 'NOK' });
      const householdId = hRes.body.id as string;

      // Invite and accept B
      const iRes = await request(app.getHttpServer())
        .post(`/households/${householdId}/invitations`)
        .set(asUser(USER_A))
        .send({ email: USER_B.email });
      await request(app.getHttpServer())
        .post(`/invitations/${iRes.body.token}/accept`)
        .set(asUser(USER_B));

      // Promote B
      const res = await request(app.getHttpServer())
        .patch(`/households/${householdId}/members/${USER_B.id}/role`)
        .set(asUser(USER_A))
        .send({ role: 'admin' });

      expect(res.status).toBe(200);
      expect(res.body.role).toBe('admin');
    });

    it('non-admin cannot change roles', async () => {
      const hRes = await request(app.getHttpServer())
        .post('/households')
        .set(asUser(USER_A))
        .send({ name: 'Test', currency: 'NOK' });
      const householdId = hRes.body.id as string;

      const iRes = await request(app.getHttpServer())
        .post(`/households/${householdId}/invitations`)
        .set(asUser(USER_A))
        .send({ email: USER_B.email });
      await request(app.getHttpServer())
        .post(`/invitations/${iRes.body.token}/accept`)
        .set(asUser(USER_B));

      // B tries to change A's role
      const res = await request(app.getHttpServer())
        .patch(`/households/${householdId}/members/${USER_A.id}/role`)
        .set(asUser(USER_B))
        .send({ role: 'member' });

      expect(res.status).toBe(403);
    });
  });
});
