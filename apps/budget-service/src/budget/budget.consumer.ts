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
import { BudgetService } from './budget.service';

@Controller()
export class BudgetConsumer {
  private readonly logger = new Logger(BudgetConsumer.name);

  constructor(private readonly budgetService: BudgetService) {}

  @EventPattern(TRANSACTION_CREATED)
  async onTransactionCreated(
    @Payload() event: TransactionCreatedEvent,
    @Ctx() ctx: RmqContext,
  ): Promise<void> {
    const channel = ctx.getChannelRef();
    const message = ctx.getMessage();

    if (event.type !== 'expense') {
      channel.ack(message);
      return;
    }

    const month = event.date.slice(0, 7);

    await withIdempotency(
      this.budgetService.getDataSource(),
      event.eventId,
      async (qr) => {
        await this.budgetService.addToTotal(
          qr,
          event.householdId,
          event.categoryId,
          month,
          event.amount,
        );
      },
    );

    await this.budgetService.checkThreshold(
      event.householdId,
      event.categoryId,
      month,
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

    await withIdempotency(
      this.budgetService.getDataSource(),
      event.eventId,
      async (qr) => {
        if (event.previousType === 'expense') {
          await this.budgetService.subtractFromTotal(
            qr,
            event.householdId,
            event.previousCategoryId,
            prevMonth,
            event.previousAmount,
          );
        }
        if (event.type === 'expense') {
          await this.budgetService.addToTotal(
            qr,
            event.householdId,
            event.categoryId,
            newMonth,
            event.amount,
          );
        }
      },
    );

    if (event.type === 'expense') {
      await this.budgetService.checkThreshold(
        event.householdId,
        event.categoryId,
        newMonth,
      );
    }

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

    await withIdempotency(
      this.budgetService.getDataSource(),
      event.eventId,
      async (qr) => {
        if (event.type === 'expense') {
          await this.budgetService.subtractFromTotal(
            qr,
            event.householdId,
            event.categoryId,
            month,
            event.previousAmount,
          );
        }
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

    await this.budgetService.deleteHouseholdData(event.householdId);

    this.logger.log(`[household.deleted] household=${event.householdId}`);
    channel.ack(message);
  }
}
