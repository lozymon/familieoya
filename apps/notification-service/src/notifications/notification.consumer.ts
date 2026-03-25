import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import {
  BUDGET_THRESHOLD_EXCEEDED,
  BUDGET_THRESHOLD_WARNING,
  HOUSEHOLD_INVITATION_SENT,
  HOUSEHOLD_MEMBER_JOINED,
  BudgetThresholdExceededEvent,
  BudgetThresholdWarningEvent,
  HouseholdInvitationSentEvent,
  HouseholdMemberJoinedEvent,
} from '@familieoya/contracts';

@Controller()
export class NotificationConsumer {
  private readonly logger = new Logger(NotificationConsumer.name);

  @EventPattern(HOUSEHOLD_INVITATION_SENT)
  onInvitationSent(
    @Payload() event: HouseholdInvitationSentEvent,
    @Ctx() ctx: RmqContext,
  ): void {
    this.logger.log(
      `[invitation.sent] household=${event.householdId} email=${event.email} inviter=${event.inviterName}`,
    );
    // Phase 5: send real invitation email via Resend/Nodemailer
    ctx.getChannelRef().ack(ctx.getMessage());
  }

  @EventPattern(HOUSEHOLD_MEMBER_JOINED)
  onMemberJoined(
    @Payload() event: HouseholdMemberJoinedEvent,
    @Ctx() ctx: RmqContext,
  ): void {
    this.logger.log(
      `[member.joined] household=${event.householdId} user=${event.userId}`,
    );
    // Phase 5: notify household admins
    ctx.getChannelRef().ack(ctx.getMessage());
  }

  @EventPattern(BUDGET_THRESHOLD_WARNING)
  onBudgetWarning(
    @Payload() event: BudgetThresholdWarningEvent,
    @Ctx() ctx: RmqContext,
  ): void {
    this.logger.log(
      `[budget.threshold.warning] household=${event.householdId} cat=${event.categoryId} pct=${event.percentage}%`,
    );
    // Phase 5: send real email — "You've used 80% of your [Category] budget"
    ctx.getChannelRef().ack(ctx.getMessage());
  }

  @EventPattern(BUDGET_THRESHOLD_EXCEEDED)
  onBudgetExceeded(
    @Payload() event: BudgetThresholdExceededEvent,
    @Ctx() ctx: RmqContext,
  ): void {
    this.logger.log(
      `[budget.threshold.exceeded] household=${event.householdId} cat=${event.categoryId} pct=${event.percentage}%`,
    );
    // Phase 5: send real email — "You've exceeded your [Category] budget"
    ctx.getChannelRef().ack(ctx.getMessage());
  }
}
