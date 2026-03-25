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
  NOTIFICATION_CREATED,
  BudgetThresholdExceededEvent,
  HouseholdInvitationSentEvent,
  HouseholdMemberJoinedEvent,
  UserRegisteredEvent,
} from '@familieoya/contracts';
import { NotificationConsumer } from '../src/notifications/notification.consumer';
import { MailerService } from '../src/mailer/mailer.service';
import { AuthClient } from '../src/http-clients/auth.client';
import { HouseholdClient } from '../src/http-clients/household.client';

// Integration tests hit real PostgreSQL + real RabbitMQ.
// Start infrastructure: docker compose -f docker-compose.test.yml up -d --wait
// Required env vars (set in .env.test):
//   NOTIFICATION_DATABASE_URL=postgres://test:test@localhost:5437/notification_test
//   RABBITMQ_URL=amqp://localhost:5673

const HOUSEHOLD_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const USER_ID = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const USER_ID_2 = 'cccccccc-cccc-4ccc-cccc-cccccccccccc';

const RABBITMQ_URL = process.env.RABBITMQ_URL ?? 'amqp://localhost:5673';

/** Minimal RmqContext mock for direct handler invocation. */
function mockRmqContext() {
  return {
    getChannelRef: () => ({ ack: jest.fn(), nack: jest.fn() }),
    getMessage: () => ({}),
  } as any;
}

describe('notification-service — persist, REST, and notification.created events', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let consumer: NotificationConsumer;
  let rmq: TestRabbitMQClient;

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.NOTIFICATION_DATABASE_URL;

    // Stub external HTTP clients — no real auth-service or household-service in tests
    const mockAuthClient = {
      getNotificationPreferences: jest.fn().mockResolvedValue({
        email: 'user@example.com',
        budgetAlerts: true,
        householdUpdates: true,
        weeklyDigest: true,
        preferredLanguage: 'en',
      }),
    };

    const mockHouseholdClient = {
      getHouseholdMembers: jest.fn().mockResolvedValue([USER_ID, USER_ID_2]),
      getActiveHouseholds: jest.fn().mockResolvedValue([]),
    };

    const mockMailerService = {
      sendWelcome: jest.fn().mockResolvedValue(undefined),
      sendInvitation: jest.fn().mockResolvedValue(undefined),
      sendBudgetAlert: jest.fn().mockResolvedValue(undefined),
      sendDigest: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthClient)
      .useValue(mockAuthClient)
      .overrideProvider(HouseholdClient)
      .useValue(mockHouseholdClient)
      .overrideProvider(MailerService)
      .useValue(mockMailerService)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    dataSource = module.get<DataSource>(getDataSourceToken());
    consumer = module.get<NotificationConsumer>(NotificationConsumer);

    rmq = await createTestRabbitMQClient(RABBITMQ_URL);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await resetDatabase(dataSource);
  });

  afterAll(async () => {
    await rmq.close();
    await app.close();
  });

  // ── user.registered → welcome email ────────────────────────────────────────

  describe('when user.registered event arrives', () => {
    it('sends welcome email', async () => {
      const mailer = app.get(MailerService);
      const event: UserRegisteredEvent = {
        eventId: crypto.randomUUID(),
        userId: USER_ID,
        email: 'alice@example.com',
        name: 'Alice',
        preferredLanguage: 'en',
      };
      await consumer.onUserRegistered(event, mockRmqContext());
      expect(mailer.sendWelcome).toHaveBeenCalledWith({
        to: 'alice@example.com',
        name: 'Alice',
      });
    });
  });

  // ── household.invitation.sent → invitation email ────────────────────────────

  describe('when household.invitation.sent event arrives', () => {
    it('sends invitation email', async () => {
      const mailer = app.get(MailerService);
      const event: HouseholdInvitationSentEvent = {
        eventId: crypto.randomUUID(),
        householdId: HOUSEHOLD_ID,
        email: 'bob@example.com',
        token: 'abc123token',
        inviterName: 'Alice',
      };
      await consumer.onInvitationSent(event, mockRmqContext());
      expect(mailer.sendInvitation).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'bob@example.com',
          token: 'abc123token',
        }),
      );
    });
  });

  // ── household.member.joined → in-app notification ──────────────────────────

  describe('when household.member.joined event arrives', () => {
    it('persists an in-app notification for the joining user', async () => {
      const event: HouseholdMemberJoinedEvent = {
        eventId: crypto.randomUUID(),
        householdId: HOUSEHOLD_ID,
        userId: USER_ID,
      };
      await consumer.onMemberJoined(event, mockRmqContext());

      const res = await request(app.getHttpServer())
        .get('/notifications')
        .set('x-user-id', USER_ID);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].type).toBe('member_joined');
      expect(res.body[0].readAt).toBeNull();
    });

    it('publishes notification.created event after persisting', async () => {
      await rmq.bindQueue('test.notification.created', NOTIFICATION_CREATED);
      const listener = rmq.waitForMessage('test.notification.created', 8000);

      const event: HouseholdMemberJoinedEvent = {
        eventId: crypto.randomUUID(),
        householdId: HOUSEHOLD_ID,
        userId: USER_ID,
      };
      await consumer.onMemberJoined(event, mockRmqContext());

      const published = (await listener) as Record<string, unknown>;
      expect(published['userId']).toBe(USER_ID);
      expect(published['householdId']).toBe(HOUSEHOLD_ID);
      expect(published['notification']).toBeDefined();
    });
  });

  // ── budget.threshold.exceeded → in-app notification + email ────────────────

  describe('when budget.threshold.exceeded event arrives', () => {
    it('persists in-app notifications for all household members', async () => {
      const event: BudgetThresholdExceededEvent = {
        eventId: crypto.randomUUID(),
        householdId: HOUSEHOLD_ID,
        categoryId: 'food',
        percentage: 110,
        limitAmount: 100000,
        spentAmount: 110000,
      };
      await consumer.onBudgetExceeded(event, mockRmqContext());

      // Both members should have a notification
      const res1 = await request(app.getHttpServer())
        .get('/notifications')
        .set('x-user-id', USER_ID);

      const res2 = await request(app.getHttpServer())
        .get('/notifications')
        .set('x-user-id', USER_ID_2);

      expect(res1.status).toBe(200);
      expect(res1.body).toHaveLength(1);
      expect(res1.body[0].type).toBe('budget_exceeded');

      expect(res2.body).toHaveLength(1);
      expect(res2.body[0].type).toBe('budget_exceeded');
    });

    it('sends email alert to opted-in members', async () => {
      const mailer = app.get(MailerService);
      const event: BudgetThresholdExceededEvent = {
        eventId: crypto.randomUUID(),
        householdId: HOUSEHOLD_ID,
        categoryId: 'electricity',
        percentage: 105,
        limitAmount: 50000,
        spentAmount: 52500,
      };
      await consumer.onBudgetExceeded(event, mockRmqContext());

      // Both members have budgetAlerts=true in mock → two emails sent
      expect(mailer.sendBudgetAlert).toHaveBeenCalledTimes(2);
      expect(mailer.sendBudgetAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'exceeded',
          categoryId: 'electricity',
        }),
      );
    });
  });

  // ── GET /notifications ─────────────────────────────────────────────────────

  describe('GET /notifications', () => {
    it('returns only notifications for the requesting user', async () => {
      const e1: HouseholdMemberJoinedEvent = {
        eventId: crypto.randomUUID(),
        householdId: HOUSEHOLD_ID,
        userId: USER_ID,
      };
      const e2: HouseholdMemberJoinedEvent = {
        eventId: crypto.randomUUID(),
        householdId: HOUSEHOLD_ID,
        userId: USER_ID_2,
      };
      await consumer.onMemberJoined(e1, mockRmqContext());
      await consumer.onMemberJoined(e2, mockRmqContext());

      const res = await request(app.getHttpServer())
        .get('/notifications')
        .set('x-user-id', USER_ID);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].userId).toBe(USER_ID);
    });

    it('returns newest first', async () => {
      for (let i = 0; i < 3; i++) {
        await consumer.onMemberJoined(
          {
            eventId: crypto.randomUUID(),
            householdId: HOUSEHOLD_ID,
            userId: USER_ID,
          },
          mockRmqContext(),
        );
      }
      const res = await request(app.getHttpServer())
        .get('/notifications')
        .set('x-user-id', USER_ID);

      expect(res.body).toHaveLength(3);
      const dates = res.body.map((n: any) => new Date(n.createdAt).getTime());
      expect(dates[0]).toBeGreaterThanOrEqual(dates[1]);
    });
  });

  // ── PATCH /notifications/:id/read ──────────────────────────────────────────

  describe('PATCH /notifications/:id/read', () => {
    it('marks notification as read', async () => {
      await consumer.onMemberJoined(
        {
          eventId: crypto.randomUUID(),
          householdId: HOUSEHOLD_ID,
          userId: USER_ID,
        },
        mockRmqContext(),
      );

      const list = await request(app.getHttpServer())
        .get('/notifications')
        .set('x-user-id', USER_ID);

      const id = list.body[0].id;

      const patch = await request(app.getHttpServer())
        .patch(`/notifications/${id}/read`)
        .set('x-user-id', USER_ID);

      expect(patch.status).toBe(200);
      expect(patch.body.readAt).not.toBeNull();
    });

    it('returns 404 when notification belongs to another user', async () => {
      await consumer.onMemberJoined(
        {
          eventId: crypto.randomUUID(),
          householdId: HOUSEHOLD_ID,
          userId: USER_ID,
        },
        mockRmqContext(),
      );

      const list = await request(app.getHttpServer())
        .get('/notifications')
        .set('x-user-id', USER_ID);

      const id = list.body[0].id;

      const patch = await request(app.getHttpServer())
        .patch(`/notifications/${id}/read`)
        .set('x-user-id', USER_ID_2); // wrong user

      expect(patch.status).toBe(404);
    });
  });
});
