import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import {
  HOUSEHOLD_DELETED,
  HouseholdDeletedEvent,
} from '@familieoya/contracts';
import { TransactionService } from './transaction.service';
import { CategoryService } from './category.service';

@Controller()
export class EventConsumer {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly categoryService: CategoryService,
  ) {}

  @EventPattern(HOUSEHOLD_DELETED)
  async onHouseholdDeleted(
    @Payload() event: HouseholdDeletedEvent,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const message = context.getMessage();

    // Delete transactions first (FK constraint: transactions reference categories)
    await this.transactionService.deleteAllForHousehold(event.householdId);
    await this.categoryService.deleteAllForHousehold(event.householdId);

    channel.ack(message);
  }
}
