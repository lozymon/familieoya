import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../src/app/app.module';
import { resetDatabase } from '@familieoya/testing';

// Integration tests hit real PostgreSQL + real RabbitMQ.
// Start infrastructure: docker compose -f docker-compose.test.yml up -d --wait
// Required env vars (set in .env.test or CI env):
//   DATABASE_URL=postgres://test:test@localhost:5433/auth_test
//   RABBITMQ_URL=amqp://localhost:5673
//   JWT_PRIVATE_KEY, JWT_PUBLIC_KEY, INTERNAL_SECRET

describe('auth-service — register → login → token flow', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.use(cookieParser());
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

  describe('POST /auth/register', () => {
    it('returns 201 with userId and email', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Test User', email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.userId).toBeDefined();
      expect(res.body.email).toBe('test@example.com');
    });

    it('returns 409 when email is already registered', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'First', email: 'dupe@example.com', password: 'password123' });

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Second', email: 'dupe@example.com', password: 'password123' });

      expect(res.status).toBe(409);
    });

    it('returns 400 when password is too short', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Test', email: 'short@example.com', password: '123' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when email is invalid', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Test', email: 'not-an-email', password: 'password123' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Login Test', email: 'login@example.com', password: 'password123' });
    });

    it('returns an RS256 access token with correct claims', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'login@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();

      const publicKey = process.env.JWT_PUBLIC_KEY!.replace(/\\n/g, '\n');
      const payload = jwt.verify(res.body.accessToken, publicKey, {
        algorithms: ['RS256'],
      }) as jwt.JwtPayload;

      expect(payload.email).toBe('login@example.com');
      expect(payload.plan).toBe('free');
      expect(payload.sub).toBeDefined();
    });

    it('sets a httpOnly refresh token cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'login@example.com', password: 'password123' });

      const cookies = res.headers['set-cookie'] as string[];
      expect(cookies).toBeDefined();
      const refreshCookie = cookies.find((c: string) => c.startsWith('refresh_token='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toMatch(/HttpOnly/i);
    });

    it('returns 401 with invalid password', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'login@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
    });

    it('returns 401 for unregistered email', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/refresh', () => {
    let userId: string;
    let refreshTokenCookie: string;

    beforeEach(async () => {
      const reg = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Refresh Test', email: 'refresh@example.com', password: 'password123' });
      userId = reg.body.userId as string;

      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'refresh@example.com', password: 'password123' });

      const cookies = login.headers['set-cookie'] as string[];
      refreshTokenCookie = cookies.find((c: string) => c.startsWith('refresh_token='))!;
    });

    it('returns a new access token and rotates the refresh cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('x-user-id', userId)
        .set('Cookie', refreshTokenCookie);

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();

      const newCookies = res.headers['set-cookie'] as string[];
      const newRefreshCookie = newCookies.find((c: string) => c.startsWith('refresh_token='));
      expect(newRefreshCookie).toBeDefined();
      // New cookie value should differ from the old one
      expect(newRefreshCookie).not.toBe(refreshTokenCookie);
    });

    it('rejects a reused refresh token after rotation', async () => {
      // First refresh — consumes the token
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('x-user-id', userId)
        .set('Cookie', refreshTokenCookie);

      // Second refresh with the original (now revoked) token
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('x-user-id', userId)
        .set('Cookie', refreshTokenCookie);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /auth/me', () => {
    it('returns user profile for a known userId', async () => {
      const reg = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Profile User', email: 'me@example.com', password: 'password123' });

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('x-user-id', reg.body.userId as string);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('me@example.com');
      expect(res.body.passwordHash).toBeUndefined();
    });
  });
});
