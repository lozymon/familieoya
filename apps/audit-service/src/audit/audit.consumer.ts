import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  BUDGET_THRESHOLD_EXCEEDED,
  BudgetThresholdExceededEvent,
  HOUSEHOLD_DELETED,
  HOUSEHOLD_MEMBER_JOINED,
  HOUSEHOLD_MEMBER_REMOVED,
  HouseholdDeletedEvent,
  HouseholdMemberJoinedEvent,
  HouseholdMemberRemovedEvent,
  REPORT_EXPORTED,
  ReportExportedEvent,
  TRANSACTION_CREATED,
  TRANSACTION_DELETED,
  TRANSACTION_UPDATED,
  TransactionCreatedEvent,
  TransactionDeletedEvent,
  TransactionUpdatedEvent,
  USER_DATA_EXPORTED,
  USER_DELETED,
  UserDataExportedEvent,
  UserDeletedEvent,
} from '@familieoya/contracts';
import { withIdempotency } from '@familieoya/common';
import { AuditService } from './audit.service';

@Controller()
export class AuditConsumer {
  private readonly logger = new Logger(AuditConsumer.name);

  constructor(
    private readonly auditService: AuditService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @EventPattern(TRANSACTION_CREATED)
  async onTransactionCreated(
    @Payload() event: TransactionCreatedEvent,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    const channel = ctx.getChannelRef();
    const message = ctx.getMessage();

    await withIdempotency(
      this.dataSource,
      `audit:${event.eventId}`,
      async () => {
        await this.auditService.log({
          householdId: event.householdId,
          userId: (event as any).userId ?? null,
          actorName: (event as any).actorName ?? 'Unknown',
          action: TRANSACTION_CREATED,
          metadata: {
            transactionId: event.transactionId,
            amount: event.amount,
            type: event.type,
          },
        });
      },
    );

    this.logger.log(`[transaction.created] household=${event.householdId}`);
    channel.ack(message);
  }

  @EventPattern(TRANSACTION_UPDATED)
  async onTransactionUpdated(
    @Payload() event: TransactionUpdatedEvent,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    const channel = ctx.getChannelRef();
    const message = ctx.getMessage();

    await withIdempotency(
      this.dataSource,
      `audit:${event.eventId}`,
      async () => {
        await this.auditService.log({
          householdId: event.householdId,
          userId: (event as any).userId ?? null,
          actorName: (event as any).actorName ?? 'Unknown',
          action: TRANSACTION_UPDATED,
          metadata: {
            transactionId: event.transactionId,
            amount: event.amount,
            type: event.type,
          },
        });
      },
    );

    this.logger.log(`[transaction.updated] household=${event.householdId}`);
    channel.ack(message);
  }

  @EventPattern(TRANSACTION_DELETED)
  async onTransactionDeleted(
    @Payload() event: TransactionDeletedEvent,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    const channel = ctx.getChannelRef();
    const message = ctx.getMessage();

    await withIdempotency(
      this.dataSource,
      `audit:${event.eventId}`,
      async () => {
        await this.auditService.log({
          householdId: event.householdId,
          userId: (event as any).userId ?? null,
          actorName: (event as any).actorName ?? 'Unknown',
          action: TRANSACTION_DELETED,
          metadata: {
            transactionId: event.transactionId,
            amount: event.previousAmount,
            type: event.type,
          },
        });
      },
    );

    this.logger.log(`[transaction.deleted] household=${event.householdId}`);
    channel.ack(message);
  }

  @EventPattern(HOUSEHOLD_MEMBER_JOINED)
  async onHouseholdMemberJoined(
    @Payload() event: HouseholdMemberJoinedEvent,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    const channel = ctx.getChannelRef();
    const message = ctx.getMessage();

    await withIdempotency(
      this.dataSource,
      `audit:${event.eventId}`,
      async () => {
        await this.auditService.log({
          householdId: event.householdId,
          userId: event.userId,
          actorName: (event as any).actorName ?? 'Unknown',
          action: HOUSEHOLD_MEMBER_JOINED,
          metadata: {
            householdId: event.householdId,
            userId: event.userId,
          },
        });
      },
    );

    this.logger.log(
      `[household.member.joined] household=${event.householdId} user=${event.userId}`,
    );
    channel.ack(message);
  }

  @EventPattern(HOUSEHOLD_MEMBER_REMOVED)
  async onHouseholdMemberRemoved(
    @Payload() event: HouseholdMemberRemovedEvent,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    const channel = ctx.getChannelRef();
    const message = ctx.getMessage();

    await withIdempotency(
      this.dataSource,
      `audit:${event.eventId}`,
      async () => {
        await this.auditService.log({
          householdId: event.householdId,
          userId: event.userId,
          actorName: (event as any).actorName ?? 'Unknown',
          action: HOUSEHOLD_MEMBER_REMOVED,
          metadata: {
            householdId: event.householdId,
            userId: event.userId,
          },
        });
      },
    );

    this.logger.log(
      `[household.member.removed] household=${event.householdId} user=${event.userId}`,
    );
    channel.ack(message);
  }

  @EventPattern(BUDGET_THRESHOLD_EXCEEDED)
  async onBudgetThresholdExceeded(
    @Payload() event: BudgetThresholdExceededEvent,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    const channel = ctx.getChannelRef();
    const message = ctx.getMessage();

    await withIdempotency(
      this.dataSource,
      `audit:${event.eventId}`,
      async () => {
        await this.auditService.log({
          householdId: event.householdId,
          userId: null,
          actorName: 'System',
          action: BUDGET_THRESHOLD_EXCEEDED,
          metadata: {
            categoryId: event.categoryId,
            percentage: event.percentage,
          },
        });
      },
    );

    this.logger.log(
      `[budget.threshold.exceeded] household=${event.householdId} cat=${event.categoryId}`,
    );
    channel.ack(message);
  }

  @EventPattern(REPORT_EXPORTED)
  async onReportExported(
    @Payload() event: ReportExportedEvent,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    const channel = ctx.getChannelRef();
    const message = ctx.getMessage();

    await withIdempotency(
      this.dataSource,
      `audit:${event.eventId}`,
      async () => {
        await this.auditService.log({
          householdId: event.householdId,
          userId: event.userId,
          actorName: (event as any).actorName ?? 'Unknown',
          action: REPORT_EXPORTED,
          metadata: {
            reportType: event.reportType,
            format: event.format,
          },
        });
      },
    );

    this.logger.log(
      `[report.exported] household=${event.householdId} user=${event.userId}`,
    );
    channel.ack(message);
  }

  @EventPattern(USER_DELETED)
  async onUserDeleted(
    @Payload() event: UserDeletedEvent,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    const channel = ctx.getChannelRef();
    const message = ctx.getMessage();

    // Deduplicate via processed_event_ids, but run UPDATE not INSERT inside fn
    await withIdempotency(
      this.dataSource,
      `audit:${event.eventId}`,
      async () => {
        await this.auditService.handleUserDeleted(event.userId);
      },
    );

    this.logger.log(`[user.deleted] userId=${event.userId}`);
    channel.ack(message);
  }

  @EventPattern(USER_DATA_EXPORTED)
  async onUserDataExported(
    @Payload() event: UserDataExportedEvent,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    const channel = ctx.getChannelRef();
    const message = ctx.getMessage();

    // USER_DATA_EXPORTED has no householdId; log with empty string as placeholder
    await withIdempotency(
      this.dataSource,
      `audit:${event.eventId}`,
      async () => {
        await this.auditService.log({
          householdId: '',
          userId: event.userId,
          actorName: (event as any).actorName ?? 'Unknown',
          action: USER_DATA_EXPORTED,
          metadata: {},
        });
      },
    );

    this.logger.log(`[user.data.exported] userId=${event.userId}`);
    channel.ack(message);
  }

  @EventPattern(HOUSEHOLD_DELETED)
  async onHouseholdDeleted(
    @Payload() event: HouseholdDeletedEvent,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    const channel = ctx.getChannelRef();
    const message = ctx.getMessage();

    await withIdempotency(
      this.dataSource,
      `audit:${event.eventId}`,
      async () => {
        await this.auditService.deleteHouseholdData(event.householdId);
      },
    );

    this.logger.log(`[household.deleted] household=${event.householdId}`);
    channel.ack(message);
  }
}
