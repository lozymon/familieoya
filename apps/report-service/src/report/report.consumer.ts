import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import {
  HOUSEHOLD_DELETED,
  TRANSACTION_CREATED,
  TRANSACTION_DELETED,
  TRANSACTION_UPDATED,
  HouseholdDeletedEvent,
  TransactionCreatedEvent,
  TransactionDeletedEvent,
  TransactionUpdatedEvent,
} from '@familieoya/contracts';
import { withIdempotency } from '@familieoya/common';
import { ReportService } from './report.service';

@Controller()
export class ReportConsumer {
  private readonly logger = new Logger(ReportConsumer.name);

  constructor(private readonly reportService: ReportService) {}

  @EventPattern(TRANSACTION_CREATED)
  async onTransactionCreated(
    @Payload() event: TransactionCreatedEvent,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    const channel = ctx.getChannelRef();
    const message = ctx.getMessage();

    const month = event.date.slice(0, 7);
    const userId = (event as any).userId ?? '';

    await withIdempotency(
      this.reportService.getDataSource(),
      event.eventId,
      async (qr) => {
        await this.reportService.addToSnapshot(
          qr,
          event.householdId,
          userId,
          event.categoryId,
          event.type,
          month,
          event.amount,
        );
      },
    );

    this.logger.log(
      `[transaction.created] household=${event.householdId} cat=${event.categoryId} amount=${event.amount}`,
    );
    channel.ack(message);
  }

  @EventPattern(TRANSACTION_UPDATED)
  async onTransactionUpdated(
    @Payload() event: TransactionUpdatedEvent,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    const channel = ctx.getChannelRef();
    const message = ctx.getMessage();

    const prevMonth = event.previousDate.slice(0, 7);
    const newMonth = event.date.slice(0, 7);
    const userId = (event as any).userId ?? '';

    await withIdempotency(
      this.reportService.getDataSource(),
      event.eventId,
      async (qr) => {
        // Subtract old values
        await this.reportService.subtractFromSnapshot(
          qr,
          event.householdId,
          userId,
          event.previousCategoryId,
          event.previousType,
          prevMonth,
          event.previousAmount,
        );
        // Add new values
        await this.reportService.addToSnapshot(
          qr,
          event.householdId,
          userId,
          event.categoryId,
          event.type,
          newMonth,
          event.amount,
        );
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

    const month = event.date.slice(0, 7);
    const userId = (event as any).userId ?? '';

    await withIdempotency(
      this.reportService.getDataSource(),
      event.eventId,
      async (qr) => {
        await this.reportService.subtractFromSnapshot(
          qr,
          event.householdId,
          userId,
          event.categoryId,
          event.type,
          month,
          event.previousAmount,
        );
      },
    );

    this.logger.log(
      `[transaction.deleted] household=${event.householdId} cat=${event.categoryId}`,
    );
    channel.ack(message);
  }

  @EventPattern(HOUSEHOLD_DELETED)
  async onHouseholdDeleted(
    @Payload() event: HouseholdDeletedEvent,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    const channel = ctx.getChannelRef();
    const message = ctx.getMessage();

    await this.reportService.deleteHouseholdData(event.householdId);

    this.logger.log(`[household.deleted] household=${event.householdId}`);
    channel.ack(message);
  }
}
